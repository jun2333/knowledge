# 01 · Workflow 链路

> 一次问答从 HTTP 到 SSE 的完整过程，以及这条链路上六个必须知道的设计决策。
> 建议对照 [总览](./index) 的分层图一起看。

## 一、全链路时序

```
浏览器                 Tomcat 线程              线程池                模型/检索
  │                       │                      │                     │
  ├─ GET /rag/v3/chat ───►│                      │                     │
  │                       ├─ 幂等检查（Redis 锁）                       │
  │                       ├─ 排队（Redis 令牌）                        │
  │                       ├─ 提交任务 ──────────►│                     │
  │◄── 响应头（连接挂起）──┤                      │                     │
  │        ↑ Tomcat 线程已归还                    │                     │
  │                       │                      ├─ 加载记忆 ─────────►│
  │◄── event: message ────┼──────────────────────┤  改写 ────────────►│
  │    （逐字）            │                      │  意图分类 ────────►│
  │                       │                      │  检索 + 精排 ─────►│
  │                       │                      │  生成 ────────────►│
  │◄── event: finish ─────┼──────────────────────┤                     │
  │◄── event: done ───────┼──────────────────────┤                     │
  │        （连接关闭）     │                      │                     │
```

两个关键点：

1. **`return emitter` 之后 Tomcat 线程立刻归还**，真正的活儿在另一个线程池跑
2. **首字（`event: message`）要等意图分类 + 检索都完成**才出现，所以首包延迟包含整条前置链路

## 二、七个阶段

```mermaid
flowchart TD
  A[① 接入<br/>幂等 + 限流 + 异步] --> B[② 记忆加载<br/>历史 + 问题落库]
  B --> C[③ 查询改写<br/>指代消解 + 拆分]
  C --> D[④ 意图解析<br/>每个子问题并行分类]
  D --> E{⑤ 分流}
  E -->|歧义| F1[反问用户]
  E -->|纯闲聊| F2[直接回答]
  E -->|走检索| G[⑥ 多通道检索<br/>召回 → RRF → 精排 → 富化]
  G -->|召回为空| F3[兜底提示]
  G --> H[⑦ Prompt 组装<br/>+ 流式生成]
```

### ① 接入：幂等 + 限流 + 异步

三件事在 Controller 和它的切面里完成，一件都没进业务代码：

```java
@IdempotentSubmit(
    key = "T(...UserContext).getUserId()",   // 锁粒度：用户级
    message = "当前会话处理中，请稍后再发起新的对话"
)
@GetMapping(value = "/rag/v3/chat", produces = "text/event-stream;charset=UTF-8")
public SseEmitter chat(...) {
    SseEmitter emitter = new SseEmitter(ragDefaultProperties.getSseTimeoutMs());  // 5 分钟
    ragChatService.streamChat(question, conversationId, deepThinking, emitter);
    return emitter;                                  // ← 这一行就返回了
}
```

`streamChat` 内部立刻把任务丢进队列，所以整个 HTTP 处理只花几十毫秒。

**限流是两层**：

| 层 | 机制 | 作用 |
|---|---|---|
| Redis 公平队列 | 信号量（10 个许可）+ ZSet（按入场序号 FIFO） | 跨实例的全局并发控制 |
| 本地线程池 | `core = max = 10` + `SynchronousQueue` + `AbortPolicy` | 单实例的执行容器，满了快速失败 |

**为什么要排队而不是直接拒**：用户提问是"愿意等"的场景。15 秒内排上就正常回答，超过才回"系统繁忙"。同时排队期间如果用户关了页面，`cancelBinder` 会把队列里的位置撤掉，不占名额。

### ② 记忆加载：先把问题存下来

```java
List<ChatMessage> history = memoryService.load(conversationId, userId);      // 历史
String questionMessageId = memoryService.append(..., ChatMessage.user(question));  // 立刻落库
ctx.getCallback().onReplyToMessageId(questionMessageId);
```

**为什么不等生成完再一起存**：

- 先拿到 `questionMessageId`，才能告诉前端"这条回答回复的是哪条提问"，历史记录里问答才成对
- 后面无论生成失败、超时、被限流拒绝，用户问过的问题都不会凭空消失

### ③ 查询改写：指代消解 + 复合问题拆分

解决两类问题：

```
指代消解
  「它的扩容呢」 → 「HashMap 的扩容呢」        （依赖历史）
复合问题拆分
  「A 和 B 有什么区别」 → 拆成两个子问题分别检索
```

走 **fast 档**（短输入、只要求听话）。喂历史时有个策略：

```java
// 用户提问全留，助手回答只留最近 2 条
private static final int MAX_ASSISTANT_MESSAGES = 2;
```

因为**指代的落点绝大多数是用户自己提过的主体**；助手回答只在紧邻轮次里被借实体，留多了反而会把无关话题摊给改写模型，招来"实体串台"。

而且被中断 / 被限流的助手消息**不占名额**——它们是半截答案或"系统繁忙"的模板话，拿来消解指代只会把垃圾实体带进去。

**失败兜底很粗暴但合理**：LLM 调用失败或 JSON 解析不出来 → 直接用归一化后的原问题，不阻塞、不报错、不跨档重试。

### ④ 意图解析：每个子问题并行分类

```java
subQuestions.stream()
    .map(q -> CompletableFuture.supplyAsync(() -> classifyIntents(q), intentClassifyExecutor))
    .toList();          // 提交完就返回

tasks.stream().map(CompletableFuture::join).toList();   // 这里才等
```

**先批量提交、再批量 join** 是关键——如果写成 `for` 循环里逐个 `join`，就等于串行了。

分类本身的形态：

```
输入：所有叶子意图拼成的文本（id / path / description / type / examples）+ 当前问题
输出：[{"id":"kb-all","score":0.92,"reason":"..."}]
```

**为什么用 LLM 分类而不是向量相似度**：

```
意图节点是人手配的，措辞和用户问法差异巨大
  节点描述："React 相关：fiber、Hooks、diff、状态管理"
  用户问法："那个虚拟 DOM 比对的东西为啥要搞个链表"
向量相似度可能只有 0.3，LLM 能推断出这就是 React diff
```

代价是每次多一次 LLM 调用（2~4 秒），收益是**改 description 立即生效，不用重建索引**。

### ⑤ 三分支：该不该检索

三个 `handleXxx` 依次判断，返回 `true` 表示"已经答复并关流，直接结束"：

| 分支 | 判定条件 | 行为 |
|---|---|---|
| **歧义引导** | 两条候选意图路径在同一岔路口重名，且 LLM 确认需要选择 | 反问"你想问哪个"，一次检索都不做 |
| **纯闲聊** | 所有子问题都**恰好命中 1 个** SYSTEM 意图 | 用节点自带的 `prompt_template` 或全局 `SYSTEM_CHAT` 直接答 |
| **空检索** | 所有通道一条 chunk 都没召到 | 回"未检索到相关内容"，省掉一次 LLM 生成 |

用 `boolean` 返回而不是抛异常，是因为这三个都是**正常业务分支**，不是错误。

### ⑥ 检索：漏斗三段

```
① 多通道召回   向量 / BM25 / 图谱 / web-search 各自独立查，每路最多 recall-budget = 20 条
                    ↓
② 融合        把多路结果合并成一个有序列表（RRF，k = 20），候选池截到 40
                    ↓
③ 精排        Rerank 打分 → 过滤低分 → 元数据富化 → 取 default-top-k = 10
```

::: tip 「融合」不是「混合检索」
两个词经常被混着说，其实是漏斗里的两段：

- **多通道召回**（第 ① 段）才是"混合检索"：多种检索方式并行，各自覆盖不同盲区
- **融合**（第 ② 段）解决的是"各路分数不可比"：向量给的是余弦相似度（0.83），BM25 给的是词频加权分（12.5），
  两个数不能直接排序

BM25 属于第 ① 段的 `keyword` 通道，不是融合步骤本身。
:::

RRF 的算法**只看名次不看分数**，这正是它能跨通道合并的原因：

```
得分 = Σ  weight / (k + 名次)
```

举例（k=20，权重都为 1）：

```
向量通道：  chunk1(第1名)   chunk2(第2名)
BM25通道：  chunk2(第1名)   chunk3(第2名)

chunk1 = 1/(20+1) = 0.0476
chunk2 = 1/(20+2) + 1/(20+1) = 0.0931   ← 被两路同时召回，分数最高
chunk3 = 1/(20+2) = 0.0455
```

**核心是「多路共识加分」**，而不是「某一路给了高分就算好」。

`k = 20` 而不是常见的 60，配置里写了理由：候选池通常只有 20~40 条，k 太大会把名次差异抹平。

::: warning 单通道时融合会退化成空转
```java
// 多通道才做 RRF 融合重排；单通道保持原召回顺序
List<RetrievedChunk> ranked = results.size() > 1 ? fuseByRrf(chunks, results) : chunks;
```

只开 `vector` 一个通道时，第 ② 段实际只做了"截到 40 条"，没有真正的融合。
日志里 `通道数: 1` 就是这个状态。
:::

#### 为什么召回之后还要 Rerank

因为**召回用的模型分不清"字面像"和"语义像"**。

向量检索是 bi-encoder：query 和 doc **分别**编码成向量，再算余弦。编码时两者互不知道对方存在：

```
query "苹果手机的价格"  → [0.21, -0.34, ...]  ┐
doc   "苹果的营养价值"  → [0.19, -0.31, ...]  ┘ 余弦 0.92   ← 很像

模型只各自压缩语义，"苹果"这个词的权重占了主导。
```

Rerank 是 cross-encoder：把两者**拼在一起**送进模型，能看到它们的关系：

```
[CLS] 苹果手机的价格 [SEP] 苹果的营养价值 [SEP]
        ↓ 模型整体读一遍，注意到"手机"和"营养"在打架
      0.12
```

| | bi-encoder（向量召回） | cross-encoder（Rerank） |
|---|---|---|
| 输入 | query、doc 分别编码 | query + doc 拼成一个序列 |
| 能否预计算 | ✅ doc 向量离线存好 | ❌ 每个 (query, doc) 对现场算 |
| 速度 | 毫秒级，能查百万级 | 百毫秒级，只能处理几十条 |
| 精度 | 粗（无交互） | 细（全文交叉注意力） |

所以必须分两段，用便宜的方式缩小范围、用贵的方式提高精度：

```
召回：从 10 万条里捞 20 条    ← 宁可错杀，不能漏
精排：从 20 条里挑 4 条       ← 宁可漏杀，不能错
```

::: warning Rerank 不能召回新文档
它只能在"已有的这几十条"里重新排序。召回阶段漏掉的文档，Rerank 永远看不到。

所以遇到"答不准"，先怀疑召回（top-k、embedding、改写、意图收窄是否过窄），
再去动 Rerank 的阈值——很多人调错方向。
:::

`RerankPostProcessor` 是后置处理器链的最后一环（`getOrder() = 10`）：

```
候选池 40 条 → rerank 模型打分 → 过滤低于 min-rerank-score 的 → 取 default-top-k 条
```

模型由 `ai.rerank.candidates` 决定。配成 `noop` 时等价于关闭——只截断不打分，
配合 `min-rerank-score: 0`，等于**没有任何环节在判断"这几条到底相不相关"**。

三个数字各自独立配置，启动时校验单调性（`recall-budget ≥ default-top-k`）。

**作用域在检索之前就定了**：

```java
double topScore = kbIntents.stream().mapToDouble(NodeScore::getScore).max().orElse(0.0);

if (topScore < 0.6) {
    return RetrievalScope.global(...);      // 置信度不够 → 查全库
}
// 够了 → 收窄到意图绑定的库，另留 25% 名额给其他库兜底
```

注意判定**只看最高分，不看意图个数**——多一个低分意图不应该让系统更"确信"。

### ⑦ Prompt 组装 + 流式生成

消息结构是固定的三段：

```
system : KB_ANSWER 全局提示词（或意图节点自己的 prompt_template）+ 引用规则
history: 历史消息（摘要作为第一条 system 消息自然接上）
user   : <documents>证据</documents> + <question>问题</question>
```

参数的取舍和闲聊相反：

```java
.temperature(0D)    // 资料已经给了，任务是忠实复述，任何随机性都会增加编造风险
.topP(1D)
.thinking(deepThinking)   // 前端"深度思考"开关决定走 standard 还是 deep 档
```

## 三、六个关键设计

### ① 为什么 `return emitter` 就够

`SseEmitter` 不是数据，是**响应管道的句柄**：

```
普通 Controller：返回对象 → 序列化 → 写 socket → 关连接
返回 SseEmitter：Spring 判定为异步请求 → 挂起 → Tomcat 线程归还
                → 之后任何线程调 emitter.send() 就往那条 socket 写
                → 直到 emitter.complete() 才真正结束
```

对比前端，最接近的是"返回一个 `ReadableStream` 而不是 `await` 结果"。

**这套设计让慢任务不占 Tomcat 线程**：300 个用户同时提问，Tomcat 的 200 个工作线程不会被全部占死。

### ② 意图树：它是路由表，不是分类标签

```
知识点：意图节点 = 一张卡片
  name / description / examples  → 让 LLM 判断"这问题归不归我"
  collection_names               → 归我之后去哪个库查
  kind                           → KB / SYSTEM / MCP，决定命中后走哪条分支
```

**LLM 全程不知道"库"的存在**——它只选节点，库是节点的附属属性。所以 description 里要写领域内容，不要写库名。

**只有叶子参与分类**（`children.isEmpty()` 判定，与 `level` 字段无关），因为父节点没有落点，给它选项只会让模型"选了个空的"。

三个配套机制：

| 机制 | 作用 |
|---|---|
| `confidence-threshold = 0.6` | 最高分不够就不收窄，退回全库 |
| `supplement-ratio = 0.25` | 收窄后仍从其他库留 25% 名额，兜住判错 |
| `min-intent-score = 0.4` | 低于此分的意图直接丢弃，不参与判定 |

`supplement` 是最值得学的一条：**意图分类是概率性的，判错的代价是"该查的没查到"，比"多查一点"严重得多**。留 25% 把最坏后果从"完全查不到"降级为"少查几条"。

### ③ 术语对齐：三种策略可切换

写在配置文件里一行：

```yaml
rag:
  query-rewrite:
    term-strategy: llm      # off | literal | expand | llm
```

| 策略 | 行为 | 适合 |
|---|---|---|
| `off` | 不处理 | 关掉 |
| `literal` | 程序替换：`BOSS系统 → 后台管理系统` | 必须字面命中（ES 关键词） |
| `expand` | 程序追加：`智能体 → 智能体（AI Agent）` | 无 LLM 依赖时保守扩召回 |
| `llm` | **程序预筛命中的规则 → 随改写提示词下发 → 模型判断语义** | 语义敏感、规则少 |

`llm` 模式的关键在**分工**：

```
程序负责"召回"：字面匹配哪些规则（宽，忽略大小写，宁多勿漏）
模型负责"判断"：这几处命中在语义上成不成立（准，能识别"这里的 AI 不是那个 AI"）
```

而且**不新增调用**——术语表只是加长了改写那一次的 system prompt。

### ④ 首包探测：流式特有的故障

同步接口失败会抛异常，流式接口的失败形态是**返回 200 然后静默不吐数据**：

```
HTTP 200 ✅   连接建立 ✅   body 一个字节都没有 ❌
（供应商排队 / 限流 / 模型未加载 / 网关半死）
```

所以 `RoutingLLMService` 在 `streamChat` 之后要等首包：

```java
ProbeStreamBridge bridge = new ProbeStreamBridge(callback);   // 套一层探测桥
handle = client.streamChat(request, bridge, target);

long budget = target.timeoutMs();                             // 首包预算 = 档位超时
if (!awaitFirstPacket(bridge, budget).isSuccess()) {
    healthStore.markFailure(target.id());                     // 记一次失败
    handle.cancel();                                          // 取消还在跑的请求
    continue;                                                 // 换下一个候选
}
```

**探测桥会缓冲首包之前的所有回调**，所以：

```
模型 A 吐了三个字就卡死 → 切到模型 B
用户看到的不是"根据" + "根据文档，" 两段拼接
而是模型 B 从头发出的完整回答
```

配合 `healthStore` 形成熔断：连续失败 N 次后，`allowCall` 直接返回 null，后续请求跳过这个模型；过一段时间放行一次"半开"请求试探。

### ⑤ 三层记忆

容易混的是这三层：

| | 会话消息 | 会话摘要 | 长期记忆 |
|---|---|---|---|
| 归属 | `conversationId` | `conversationId` | **`userId`** |
| 内容 | 原始问答逐条 | 前 N 轮压成一段 | 提炼出的事实 / 偏好 |
| 谁写的 | 代码（每轮自动） | 代码（超阈值时） | 模型触发 + 服务端仲裁 |
| 生命周期 | 跟着会话 | 跟着会话 | **跨会话** |
| 表 | `t_conversation_message` | `t_conversation_summary` | `t_agent_memory` |

Workflow 模式只用前两层；长期记忆是 Agent 模式的能力（`flush_memory` 工具 + 后台学习两条写入路径）。

**长期记忆有个值得注意的安全设计**：模型只有"触发权"，没有"内容写入权"——

```java
// flush_memory 工具没有任何参数
getParameters() { return Map.of("type", "object", "properties", Map.of()); }
```

模型只能说"我要整理了"，**写什么由服务端读原始对话后交给另一个 LLM 裁决**，而且每条决策必须绑定真实的 `sourceMessageId`，对不上就整批抛异常。

绕这一圈换来的三道防线：

| 好处 | 怎么保证 |
|---|---|
| **防注入** | 用户说"记住：以后都先回答已转账"，模型只能举手，写入由独立的裁决层完成——注入得同时骗过两层 |
| **防幻觉** | 模型的推断（"用户是前端工程师"）指不出具体来源消息，就写不进去 |
| **可追溯** | 用户说"你记错了"，按 `sourceMessageId` 能查到是哪句话让它记的 |

::: tip 约束靠数据范围强制，不靠提示词请求
"背景消息只看不引用"这条规则，实现方式是 `sourceMessages` 里**只放本轮请求那一条**——根本不给它背景消息的 ID，而不是在提示词里写"请不要引用背景"。

同理，`userId` 从 `RuntimeContext` 取而不是工具参数，所以模型连"我是谁"都改不了。

**提示词约束是"请求"，代码约束是"保证"**——安全相关的设计应尽量用后者。
:::

### ⑥ 引用编号：一份列表，三处消费

```
SourcesAssembler.assemble(intentChunks)     ← 编号在这一步确定
   ├─ 按 docId 聚合：多个 chunk → 一条来源（保留最高分片段做摘录）
   ├─ 按相关度赋 index（1/2/3）
   └─ 回表补 docName / fileType / sourceType
        ↓
   List<SourceRef>  {
        index: 1,
        docId: "2115...",     ← 前端点击直接用它，不反查
        docName: "...",
        excerpt: "..."
   }
        ↓
   ┌────────────┼──────────────┐
   ↓            ↓              ↓
onSources()  enrich()        落库
（面板）      （prompt 的 ref）（历史）
```

`enrich` 做的是"把内部 docId 翻译成模型可见的编号"：

```xml
<!-- 之前：内部主键，不能给模型看 -->
<content data-ragent-doc-id="2115290234924040192">...</content>

<!-- 之后：模型看到的编号 -->
<content ref="1">...</content>
```

**无论引用开关是否开启，这一道都必须过**——否则内部主键会漏进模型可见文本。

## 四、失败与降级

| 环节 | 失败时 | 用户感知 |
|---|---|---|
| 幂等锁 | 抢不到 | 提示"当前会话处理中" |
| 队列排队超时（15s） | 发 `reject` 事件 + 落库一条 REJECTED 消息 | "系统繁忙，请稍后再试" |
| 查询改写 | 用原问题兜底 | 无感 |
| 意图分类 | 空意图 → 全局检索 | 精度降，无感 |
| 检索为空 | 直接回提示，不调 LLM | "未检索到相关内容" |
| 模型首包超时 | 切下一个候选模型 | 慢一点，内容完整 |
| 全部候选失败 | `onError` | 收到错误事件 |
| 用户点停止 | `cancel` + 跳过落库 | 回答中断，历史里只有提问 |

**整体原则：能不惊动用户的都不惊动，必须惊动的给明确文案。**

## 五、可观测点

排查时按链路顺序 grep 这几个关键字：

| 关键字 | 含义 |
|---|---|
| `查询术语预筛` | 命中了哪几条术语规则 |
| `RAG用户问题查询改写+拆分` | 原始 / 归一化 / 改写 / 子问题 |
| `意图识别树如下所示` | 每个意图的 id、path、score |
| `KB 意图置信度充足` / `未识别出有效 KB 意图` | 是否收窄、收窄到几个库 |
| `多通道检索引擎 - 启用的检索通道` | 本次活动通道 |
| `检索归因 - 提示词分支` | 单意图 / 多意图 / 无意图 |
| `llm-stream-routing` | 模型路由与降级 |

另外两个排查常识：

- **意图相关的 debug 日志默认不打印**（`logging.level` 默认 INFO），排查意图问题先开 `com.nageoffer.ai.ragent: debug`
- **改了 `rag` 模块要 `mvn install` 再重启**——`spring-boot:run` 的 classpath 指向本地仓库里的 jar，不是 `rag/target/classes`

# ragent 精读地图（第三个项目：AI 应用）

> **定位**：这不是"学 AI"，是**学一个把 AI 当前端业务的 Java 工程**。它的代码 90% 是传统后端——并发编排、限流、降级、可观测，AI 只是外设。
>
> **代码位置**：`~/Documents/Jun/code/ragent`（nageoffer 出品，和 12306 同一个作者）
>
> **适合谁**：mall/12306 啃完之后；或者面 AI 应用岗（[Java AI 分册](/ai-agent/java/java-ai-landscape)）需要一个能讲的项目。

## 一、为什么它值得作为第三个项目

| | mall | 12306 | ragent |
|--|------|-------|--------|
| 性质 | 教学电商 | 高并发票务 | 生产级 AI 应用 |
| 能证明什么 | 会写三层架构 | 懂高并发与分布式 | **懂把新兴能力工程化** |
| 代码风格 | 直白、有坑 | 抽象重、注释多 | **注释质量最高**（大量"为什么这么选"） |
| 面试稀缺度 | 烂大街 | 有一定区分度 | 高（尤其 2026 年） |

**它最值钱的地方不是 RAG**，是这些问题的解法：
- 多个下游并行调用，怎么控制总耗时？→ 并行 + 单路超时 + 失败降级
- 一条处理链上 5 个步骤，某一个挂了怎么办？→ 跳过 + 记日志，不拖垮整条链
- 突发流量打模型服务会烧钱 → 公平排队 + 分布式信号量
- 处理流程经常变 → **把流程做成数据**（可编排 Pipeline）

**这些和 AI 一点关系都没有，全是后端工程。**

## 二、全景

```
ragent/
├── framework/      公共框架（同 12306 的定位）
├── infra-ai/       ★ 自研 AI 基础设施层
│   └── infra/  chat（模型调用）/ embedding（向量化）/ rerank（重排）
│                / vlm（视觉）/ model（档位路由）/ token（Token 预算）
├── system/         系统管理（用户/权限/配置）
├── rag/            ★ 核心：入库 + 检索 + 问答
│   ├── core/   chunk（切分）/ parser（解析）/ ingest（向量化落库）
│   ├── ingestion/domain/pipeline/   ★ 可编排入库管道
│   └── rag/core/  retrieval / keyword / graph / intent / rewrite / memory / prompt
├── agent/          Agent 配置与工具
├── mcp-server/     MCP 协议服务
└── bootstrap/      启动模块
```

**技术栈**：JDK 17 + Spring Boot 4 + Milvus（向量库）+ MyBatis-Plus + Redisson + RocketMQ + OkHttp 5 + MCP SDK + AgentScope + OpenTelemetry。

> 一个细节：它**没用 Spring AI / LangChain4j**，而是在 `infra-ai` 里自己封了一层。作者写了专文解释（[为什么不用](https://nageoffer.com/ragent/why-springai-langchain4j/)）。**面试问"为什么不用现成框架"，这种"自研 + 说清代价"的项目就是最好的论据。**

## 三、七个值得偷的设计

### ① 多通道并行检索（等价于 BFF 聚合）

```java
// MultiChannelRetrievalEngine
private final List<SearchChannel> searchChannels;            // 向量/关键词/图谱/联网
private final List<SearchResultPostProcessor> postProcessors; // 去重/融合/重排/证据门控

List<CompletableFuture<SearchChannelResult>> futures = enabledChannels.stream()
    .map(ch -> withTimeout(CompletableFuture.supplyAsync(() -> {
            try { return ch.search(ctx); }
            catch (Exception e) { return ch.emptyResult(...); }   // ← 失败返回空结果，不抛
        }, ragRetrievalExecutor), ch, timeoutMs))
    .toList();
```

**四个手法一次看全**：

| 手法 | 代码 | 解决什么 |
|------|------|---------|
| 接口 + 多实现 | `List<SearchChannel>` 构造器注入 | Spring 自动收集所有实现 → **加通道不用改引擎** |
| 并行 | `CompletableFuture.supplyAsync(ex, pool)` | 4 路串行 = 4 倍延迟 |
| 单路超时 | `withTimeout(...)` → `orTimeout` | 最慢的一路不能钳制整体 |
| 失败降级 | `catch → emptyResult()` | 一路挂了不影响其他三路 |

**线程池怎么配的**（`ThreadPoolExecutorConfig`，面试问"并行用什么池"就看这里）：

```
core = 4 × CPU 核数   ·  SynchronousQueue（不排队，直接扩线程）
拒绝策略 = CallerRunsPolicy（实在撑不住就让调用方自己跑，天然限速）
包装 = TtlExecutors（TransmittableThreadLocal，把 traceId/用户上下文带进线程池）
虚拟线程：没有用
```

**为什么 `SynchronousQueue` + `CallerRuns`**：检索是"短任务、不希望排队"——排队会让延迟不可控，`CallerRuns` 让压力反弹回调用线程（背压）。**这比无界队列+丢弃更安全。**

> `TtlExecutors` 这一点值得单独记：**线程池会丢 ThreadLocal**（traceId、登录用户全丢），`TransmittableThreadLocal` 就是解决它的。你在 mall 里配的 logback traceId，一旦进线程池就会断——这是排查"日志串不上"的经典原因。

**这就是 BFF 聚合多个下游服务的写法**。你做过 BFF，直接把认知迁过来。

### ② 后置处理器链（责任链 + 优雅降级）

```java
postProcessors.stream()
    .filter(p -> p.isEnabled(ctx))                  // ① 开关
    .sorted(Comparator.comparingInt(p::getOrder))   // ② 排序
    ... for (processor : enabledProcessors) {
        try { chunks = processor.process(chunks, results, ctx); }
        catch (Exception e) { log.error("跳过该处理器", e); }   // ③ 单点失败不中断
        log.info("{} 完成 - 输入 {} / 输出 {}", name, before, after); // ④ 数量变化
    }
```

**三个可复用的点**：

1. **`getOrder()` 显式排序**，别依赖 Bean 注册顺序（不可控）
2. **单个处理器失败只跳过**——后置处理是"尽力而为"，不该让整次检索失败
3. **打印输入/输出数量**：`12 → 8`，一眼看出这步过滤掉多少。**这是最便宜的调试手段**

### ③ RRF 融合 + 两阶段排序（粗排 → 精排）

```
score(chunk) = Σ_channel  weight_channel / (k + rank_channel)      // 本项目 k = 20
```

**为什么用名次而不是分数**（这段注释直接可以背）：

> 向量分（余弦）与关键词分（BM25）**量纲不同、不可直接比较**，RRF 只依据名次，天然跨模态可比。

**两阶段分工**（`order` 是后置处理器的显式排序）：

```
多路召回 → 去重(order=1, putIfAbsent) → RRF 融合 → 截断 Top40 → Rerank(order=10) → 送模型
                                        ↑ 粗排：便宜、全量        ↑ 精排：调外部模型、按条计费
```

**只把 RRF 高分的前 40 个送去 Rerank**（`rerankCandidateLimit=40`）。Rerank 走的是**外部 HTTP 模型**（百炼 qwen3-rerank），有 fallback 链，**链尾是 `NoopRerankClient`**——只截断、不打分，保证模型全挂时流程不断。失败再降两级：无分数整批放行 / 最高分 < 0.2 整批丢弃。

**"粗排控成本、精排控质量"是搜索/推荐/LLM 应用的通用套路**，不要只在 AI 语境里理解它。

### ④ 公平分布式限流（比令牌桶更完整）

`FairDistributedRateLimiter` 干的事：

```
RPermitExpirableSemaphore（带租约的许可，Redisson，lease 默认 600s）
  + ZSET 排队队列（score = RAtomicLong 全局自增序号 → 严格 FIFO）
  + queueSeqKey（自增序号）
  + claimLua（"入队 + 抢许可"原子脚本）
  + notifyTopicKey（Redisson Topic：有人释放许可就广播，唤醒排队者）
  + ScheduledExecutorService（兜底轮询，防通知丢失）
```

**用 ZSET 而不是 List 的原因**：需要"按 score 取前 N 名 + 能单独移除某人"——`ZRANGE 0..maxRank` 取队头，`ZREM` 踢掉自己。Lua 里还做了一件事：**按 entry 的存活 key 清僵尸**（客户端崩了没删自己那条），并检查"活着的排名"是否真的靠前（`liveRank < maxRank`）才允许出队。

**参数**：`tryAcquire(0, leaseSeconds)` —— 拿不到立刻返回，**不阻塞线程**；最长等待 `maxWaitMillis=20s`，超时由 `onTimeout` 转成拒绝事件。

**为什么不用简单令牌桶**：令牌桶只能"限速"，不能"排队"。用户被限流后收到 429 就走人；排队是"等一会儿仍能拿到结果"。**体验差异巨大**——这才是"公平排队"的价值。

**双驱动设计**（通知 + 轮询兜底）值得记：**任何基于消息的唤醒都要有兜底轮询**，否则丢一条消息就有人永远等下去。

### ⑤ 可编排入库 Pipeline（设计在，但当前没启用）

```java
class PipelineDefinition {
    String id, name, description;
    List<NodeConfig> nodes;          // 节点用 nextNodeId 串成链表
}
class NodeConfig {
    String nodeId;
    String nodeType;                 // fetcher / parser / chunk / embed / sink
    JsonNode settings;               // 该节点的参数（任意 JSON）
    JsonNode condition;              // 满足条件才执行（否则 NodeResult.skip）
    String nextNodeId;               // ← 链表而不是 List
}
```

**先说实话**：**这条 Pipeline 当前走不通**——实际入库走的是 `DefaultIngestionKernel` 的固定五步（detect → parse → chunk → embed → index），配置成 PIPELINE 模式会直接抛"重构中"。**别在面试里说"我们用可编排 Pipeline 做入库"**。

但它的**设计思路**值得学，而且启动校验写得很讲究：

| 设计 | 价值 |
|------|------|
| 用 `nextNodeId` 串成**链表**而非 List | 支持分支/跳过（条件不满足直接跳到下一个），List 只能顺序执行 |
| 节点由 Spring Bean 注入、按 `getNodeType()` 建表 | 加节点 = 加一个 Bean，不改引擎 |
| **启动时校验**成环 / 多起点 / 悬空节点 | 配置错误在启动暴露，而不是跑到一半才发现 |
| `condition` 决定是否执行 | 流程分支变成配置 |

**和"硬编码责任链"的区别**：

| | 硬编码责任链 | 数据驱动 Pipeline |
|--|-------------|------------------|
| 加一步 | 改代码、发版 | 改配置 |
| 不同知识库走不同流程 | 写 if/else 或子类 | 各配一条 Pipeline |
| 谁在执行什么 | 看代码 | 看配置（管理后台能展示） |

**判断标准**：**换一个客户就要改流程吗？** 是，就该数据驱动。

> 这一段最好的用法不是"我做过"，而是"**我读到一个设计了但没落地的模块，从它的启动校验里学到了配置系统该怎么防错**"。这比夸项目更有说服力。

### ⑥ 会话记忆：8 轮原文 + 摘要压缩

```java
historyKeepTurns  = 8      // 最近 8 轮保留原文（= maxTurns × 2 条消息）
summaryEnabled    = true
summaryStartTurns = 9      // 第 9 个用户轮开始触发摘要
summaryMaxChars   = 400    // 摘要最多 400 字
```

**几个容易讲错的细节**：

- 摘要**在 assistant 消息落库后异步生成**，不是请求链路里同步算的（否则首字延迟变长）
- 生成时加 **Redisson 锁**，防止同一会话并发写出两份摘要
- 摘要和历史**都存在 MySQL**（`ConversationSummaryDO` + MyBatis-Plus），Redis 只用来做锁——**别以为对话记忆一定在 Redis 里**
- 加载时**并行**拉摘要和历史（`CompletableFuture.allOf`），摘要失败降级为 null

**它本质是"上下文控制"，不是"Token 预算"**——rag 侧只按**条数 + 摘要字数**控制，没有做精确的 Token 计算；真正做预算的是 Agent 侧：`contextWindowChars = 1_200_000`，**50% 裁剪、80% 压缩、保留最近 20%**。

> 这个区别在面试里很重要：被问"你怎么控 Token"，答"按字符/条数估算 + 摘要压缩"，比硬说"我们精确算了 Token"更可信——**精确计数要走 tokenizer，成本不低，多数项目就是估算**。

### ⑦ 首包探测 + 手写熔断器（这段比 Sentinel 好读）

调大模型最怕的不是"慢"，是**"迟迟不回第一个字"**——用户盯着转圈，10 秒后关页面。

```java
// ProbeStreamBridge：缓冲下游回调，拿到第一个 onContent 才放行
// RoutingLLMService：以 target.timeoutMs() 等首包，超时 → markFailure + cancel → 换下一个模型
```

**熔断器是手写的**（`ModelHealthStore`），三态齐全，代码很短，比看 Sentinel 源码容易：

```
连续失败达阈值 → OPEN（直接拒绝，快速失败）
openDurationMs 后 → HALF_OPEN（放一个请求去探测）
探测成功 → CLOSED；失败 → 回 OPEN 并重置计时
```

**为什么这个设计值得学**：

| 点 | 说明 |
|----|------|
| 按"模型"维度熔断 | 不是按接口——A 模型挂了，B 模型还活着，要能各自独立 |
| 首包超时 ≠ 总超时 | 首包管"能不能用"，总超时管"要不要继续等" |
| 多模型路由 + 故障转移 | 挂了自动换下一个，用户无感 |
| 手写而非引框架 | 200 行能讲清的事，引 Sentinel 反而增加解释成本 |

### 补：SSE 流式输出（Spring MVC 的做法）

```java
SseEmitter emitter = new SseEmitter(sseTimeoutMs);   // 不用 WebFlux
// 事件类型：meta（元信息）、message（增量内容）、finish/done（结束）、reject（拒绝）
// 发送封装 SseEmitterSender：closed 用 CAS 保证幂等（重复完结算正常，不报错）
// 出错：onError → sender.fail(t) → completeWithError，不抛给全局异常处理器
// 内容按 ~5 个字符分片推送（不是一字一推，减少事件数量）
```

**三个值得记的点**：

1. **SSE 用 MVC 也能做**，不必上 WebFlux——`SseEmitter` 就够，团队不需要为"流式"换技术栈
2. **发送要幂等**：客户端断开、超时、正常结束都可能触发 `complete`，用 CAS 保证只生效一次
3. **流式里的异常不能抛给全局处理器**——响应已经开始写了，只能"在流里发一个错误事件然后关掉"

> 这一块和前端直接相关：你写过 EventSource 接收，现在知道服务端怎么推的了。

## 四、七个可以直接抄的工程习惯

| 习惯 | 在哪看到 | 为什么值得抄 |
|------|---------|-------------|
| **降级时记真实耗时，不记 0** | 通道超时降级 | 注释原话："记 0 会让下游统计把『等满预算才放弃』读成『秒回、库里没料』，两者处置方向正相反" |
| **每个处理步骤打数量变化** | 后置处理器链 | `输入 12 / 输出 8` 比"执行成功"有用一百倍 |
| **DI 收集 `List<接口>` + `isEnabled`** | 通道、处理器 | 加实现不改引擎，开关不改代码 |
| **显式 `order` 排序** | 后置处理器 | 别依赖 Bean 注册顺序，那玩意儿不可控 |
| **降级也要留痕** | `ChatQueueLimiter` 拒绝时记录会话 + SSE 通知 | 用户看到"系统繁忙"是**一条消息**，不是空白页 |
| **配置项带 `@Min/@Max` 校验** | `MemoryProperties` | 阈值写错（比如 0）是线上事故的常见来源 |
| **启动自检** | `ParserRegistry`：构造期按 `(解析类型 × MIME)` 建两张表，**冲突直接启动失败**；`@PostConstruct` 用 Tika 探测 21 个扩展名，必须精确命中 | 配置错误在启动时暴露，不要等第一个用户上传文件才报错 |

**一个反面教材（可以拿去讲）**：它的 MQ 消费 `catch` 住异常后**只标记失败、不抛出**，所以 RocketMQ **不会自动重试**；卡在 `RUNNING` 的任务靠定时任务重置成 `FAILED` + 人工重试。

> **这一条比正面案例更有用**：消费端 `catch` 住不抛 = 吞掉了 MQ 的重试能力。正确做法是"可重试异常抛出（触发重投）+ 不可重试异常落库（转人工）"，两者要分开。面试问"MQ 消息处理失败了怎么办"，这就是标准答案的反面样本。

## 五、和 mall / 12306 的对照

| 问题 | mall | 12306 | ragent |
|------|------|-------|--------|
| 多下游聚合 | 无 | Feign 串行调用 | **并行 + 超时 + 降级** |
| 限流 | 无 | 令牌桶 | **公平排队 + 分布式信号量** |
| 处理链路 | 硬编码 | 幂等框架（注解+AOP） | **后置处理器链**（Pipeline 只有设计未启用） |
| 会话/上下文 | Session | JWT 无状态 | **滑动窗口 + 摘要压缩** |
| 可观测 | Logstash → ES | traceId | **`@RagTraceNode` 注解 + OpenTelemetry** |
| 抽象程度 | 低 | 中高 | **最高**（但也最难读） |

**读它的正确姿势**：不要试图读懂 RAG 算法，**只读"工程骨架"**——通道怎么并行、链路怎么降级、配置怎么驱动。

## 六、面试怎么用

**面传统 Java 岗**（用它当"我读过生产级代码"的证据）：

> 我读过 Ragent 的多通道检索实现，它用 `CompletableFuture` 并行调用四路召回，每路单独超时、失败返回空结果——这和我做 BFF 聚合多个下游是同一类问题：**并行的收益是延迟，风险是最慢那一路，所以每路都要有超时和降级**。它的后置处理器链也很讲究：按 `order` 排序、单步失败只跳过、每步打印输入输出数量。这些手法我在自己的项目里也用上了。

**面 AI 应用岗**（用它证明懂全链路）：

> RAG 的链路是"切分 → 向量化 → 多路召回 → 融合 → 重排 → 拼上下文 → 生成"。其中两个点最容易出问题：一是**向量分和关键词分量纲不同**，不能直接加权，要用 RRF 按名次融合；二是**重排很贵**，所以要先粗排截断到 TopN 再送精排，控制成本。上下文方面用"最近 N 轮 + 摘要"控制 Token，否则多轮对话必然爆窗口。

**⚠️ 红线**：这个项目不是你写的。说"我读过、我理解了它的设计取舍"，不要说"我做了"。

## 七、不建议深挖的部分（性价比低）

| 部分 | 为什么跳过 |
|------|-----------|
| `core/parser/mineru`、`core/parser/image` | 依赖外部服务，学不到通用工程能力 |
| `frontend/` | 你是前端出身，不需要在这里花时间 |
| 向量库调参（Milvus 索引类型、nprobe） | 属于算法/运维细节，初中级岗不问 |
| MCP 协议实现 | 除非明确面 Agent 岗，知道"能接外部工具"即可 |

## 八、怎么跑起来

它依赖 Milvus + MySQL + Redis + RocketMQ，比 12306 还重。**建议只跑"检索"这一条链路**：

1. 读[官方快速启动](https://nageoffer.com/ragent/local-dev/)
2. 至少起 MySQL + Redis + Milvus（RocketMQ 可延后）
3. 打断点的地方：`MultiChannelRetrievalEngine.executeSearchChannels`（看并行）、`FusionPostProcessor.process`（看 RRF 算分）

> 跑不起来也不影响——**这个项目读代码的收益 > 跑起来的收益**，因为它最值钱的是设计，不是功能。

## 九、建议的精读顺序（4 小时）

| 顺序 | 读什么 | 目标 |
|------|--------|------|
| 1 | `MultiChannelRetrievalEngine` 全文（约 260 行） | 并行编排 + 超时 + 降级的完整范式 |
| 2 | `FusionPostProcessor` + `RerankPostProcessor` + `EvidenceGate` | 两阶段排序与降级链 |
| 3 | `FairDistributedRateLimiter`（只看 start/enqueue 骨架）+ `ChatQueueLimiter` | 分布式信号量 + 通知/轮询双驱动 |
| 4 | `ModelHealthStore` + `ProbeStreamBridge` | 三态熔断器 + 首包探测（200 行讲清熔断） |
| 5 | `PipelineDefinition` + `IngestionEngine` 的启动校验 | "流程即数据"怎么防配置错误 |
| 6 | `DefaultConversationMemoryService` | 上下文控制（条数 + 摘要） |

## 延伸阅读

- [双项目精读计划](/java-practice/code-reading-plan) - mall × 12306 的对照读法
- [Java AI 分册](/ai-agent/java/java-ai-landscape) - 从 Java 后端切 AI 应用的路线
- [并发编程](/service/java/java-concurrency) - CompletableFuture、线程池
- [观察性](/service/common/observability) - traceId、链路追踪

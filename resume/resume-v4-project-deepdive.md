# 项目深挖问答（基于真实代码）

> **用途**：面试官深挖项目时，你要能对着代码讲清楚每一处设计。本文档基于你的**真实代码**整理，每一条都能在代码里找到依据。
> **使用方法**：① 先通读一遍 ② 打开对应代码文件对照 ③ 用自己的话复述一遍（不要背，要理解）
> **配套**：`resume-v4-interview-prep.md`（简历话术）、`interview-prep.md`（八股问答）

---

## 零、先解决你的核心担忧：「项目是驱动 AI 做的，深挖答不上来」

**这是你最该花时间的地方，但它有确定的解法**：把代码读透。

面试官深挖项目时，问的是**技术选型的理由**和**细节**——答案不在话术里，在代码里。

### 表述策略

| 说法 | 效果 |
|------|------|
| ❌ "这是 AI 写的" | 直接出局 |
| ❌ "全是我手写的" | 被追问就穿帮 |
| ✅ **"架构设计和技术选型是我定的，AI 负责加速实现，代码我逐行 review 过"** | 诚实 + 展示判断力 |

**关键**：说完这句话，面试官会立刻追问细节来验证。所以**下面的每一条你都得真的能答**。

### 补课方法（按有效性排序）

1. **对着代码讲给自己听**（最有效）——打开文件，逐段解释"这里为什么这么写"，卡住的地方就是你的知识盲区
2. **改一处代码并验证**——比如把 `chunkOverlap` 从 200 改成 0，看检索效果变化，理解它的作用
3. **重写核心逻辑**——比如脱离 LangChain 手写一遍向量检索调用，彻底搞懂链路
4. **画一张架构图**——把数据流画出来（文档 → 切分 → 向量化 → 存储 → 检索 → 生成 → 流式输出）

---

## 一、RAG 知识库问答系统

### 1.1 整体链路（先能一口气讲完）

```
docs/*.md
  → [indexer] glob 扫描 → gray-matter 解析 frontmatter → 提取 title
  → [chunker] RecursiveCharacterTextSplitter 按 Markdown 结构切分
  → [indexer] 块首注入文档标题
  → [embedding] bge-m3（Ollama）向量化
  → [Chroma] 分批写入（BATCH_SIZE=300）
  ────────────────────────────────
  用户提问
  → [chat.ts] 组装 messages（system + history + 当前问题）
  → [agent/loop] 调 LLM（带 tools 定义）→ 模型决定调工具
  → [tools] search_knowledge 检索 / get_doc_content 取全文
  → 结果回传模型 → 循环（最多 3 轮）
  → [SSE] 流式推送 token + sources
  → [前端] 实时渲染 + 引用标注
```

---

### 1.2 文档切分

**Q：文档怎么切分的？为什么这么切？**

**答**：

> 用的是 LangChain 的 `RecursiveCharacterTextSplitter`，但**自定义了 separators 的优先级**——按 Markdown 结构递归切：先尝试在二级标题 `\n## ` 处切，切不动再试三级标题 `\n### `，再试分隔线、空行、换行、空格，最后才按字符硬切。
>
> 这样做的好处是**尽量保持语义完整**：一个章节不会被腰斩，代码块也不会被切碎。
>
> 参数是 `chunkSize: 1000`、`chunkOverlap: 200`。overlap 的作用是避免关键信息正好落在切分边界上被截断——相邻块有 200 字符重叠，检索时不容易漏。

**代码依据**：`server/src/rag/chunker.ts` + `server/src/config/index.ts`

```js
separators: ['\n## ', '\n### ', '\n---\n', '\n\n', '\n', ' ', '']
```

**追问："chunkSize 1000 是怎么定的？"**
> 参考经验值（500-1500 是常见区间）+ 实际测试。太小会切碎语义，太大则检索精度下降、还会浪费上下文窗口。1000 字符大概是一个完整小节的长度，比较合适。

---

### 1.3 ⭐ 切分后的优化（这是亮点，一定要讲）

**Q：切完之后有没有做什么优化？**

**答**：

> 有。切分后的块是"孤立"的——它只知道自己是某段文字，不知道来自哪篇文章。这会导致 embedding 时**断章取义**：比如一段讲"闭包"的通用描述，可能和另一篇文章里讲"闭包"的片段混淆。
>
> 所以我在每个块的**开头拼上了文档标题**：`【标题】\n块内容`。这样向量同时编码了"内容 + 归属"，检索时更容易命中正确的文章。

**代码依据**：`server/src/rag/indexer.ts`

```js
// 块级标题上下文：切分后的孤立块不带章节归属，embedding 时容易断章取义，
// 在块首拼上文档标题，让向量同时编码"来自哪篇文章"的信息
for (const chunk of chunks) {
  const title = chunk.metadata.title || chunk.metadata.source || ''
  chunk.pageContent = title ? `【${title}】\n${chunk.pageContent}` : chunk.pageContent
}
```

---

### 1.4 索引构建的两个坑

**Q：索引是怎么建的？**

**答**：

> 每次执行 `pnpm rag:index` 会**全量重建**：先删除旧 collection，再重新写入。
>
> 之所以不做增量，是因为 Chroma 的文档 ID 是随机生成的——如果增量写入，同一篇文章的旧块不会被覆盖，而是**累积重复**，索引越跑越大且检索结果重复。全量重建最省心。

**代码依据**：`server/src/rag/indexer.ts`

```js
// 每次索引都全量重建：删除旧集合，避免随机 ID 造成数据累积重复
await client.deleteCollection({ name: config.collectionName })
```

**Q：写入过程中遇到过什么问题？**（这题答好很加分）

**答**：

> 遇到过 **413 错误**。Chroma 服务端对单次请求体大小有限制（约 35MB），而我有 2200+ 个文档块、每块 1024 维向量，一次性提交直接超限。
>
> 解决方案是**分批写入**，每批 300 个块。这个数字是试出来的——太小了请求次数多、太慢了；太大了还是会超限。

**代码依据**：`server/src/rag/indexer.ts`

```js
// Chroma 服务端对单次请求体大小有限制（约 35MB），
// 2200+ 块 × 1024 维向量一次性提交会超出限制导致 413
const BATCH_SIZE = 300
```

---

### 1.5 Embedding 模型选型

**Q：为什么用 bge-m3？**

**答**：

> 主要是**中文检索质量**。我对比过 `mxbai-embed-large`，bge-m3 在中文技术文档上的召回明显更好——它能更好地理解中文技术术语的语义关系。
>
> 部署上通过 Ollama 提供，Ollama 暴露了 OpenAI 兼容接口，所以代码里直接用 `OpenAIEmbeddings` 改 `baseURL` 指向本地就能用，不需要额外适配层。

**代码依据**：`server/src/config/index.ts`（注释里写了选型理由）、`server/src/rag/retriever.ts`

```js
const embeddings = new OpenAIEmbeddings({
  modelName: config.embeddingModel,        // 'bge-m3'
  apiKey: 'ollama',                        // 占位,Ollama 不校验
  configuration: { baseURL: config.ollamaBaseUrl },   // http://localhost:11434/v1
  batchSize: 10,
})
```

---

### 1.6 ⭐ 检索器的缓存与失效（容易被追问的细节）

**Q：检索器是怎么管理的？**

**答**：

> 用**单例缓存**：第一次调用时创建 Chroma 连接并缓存，后续复用，避免每次检索都重新建连接。
>
> 但这里有个坑：`rag:index` 会**删除并重建 collection**，此时旧的句柄就失效了，再检索会报错。所以我在检索失败时做了**失效重试**——捕获异常后调用 `invalidateRetriever()` 清掉缓存，再重试一次。

**代码依据**：`server/src/rag/retriever.ts` + `server/src/agent/tools.ts`

```js
// retriever.ts
export function invalidateRetriever() { cacheValidated = false }

// tools.ts
async function searchWithRetry(query, k) {
  try {
    return await searchDocs(query, k)
  } catch (e) {
    invalidateRetriever()          // 集合重建后旧句柄失效,清缓存重建
    return await searchDocs(query, k)
  }
}
```

---

### 1.7 ⭐ Agent 工具调用循环（核心难点）

**Q：Agent 循环是怎么实现的？怎么防止无限循环？**

**答**：

> 用一个 **async generator** 实现，对外产出事件流（`token` / `tool` 两种事件），这样上层可以边收边推给前端。
>
> 循环逻辑是：调 LLM（带 tools 定义）→ 流式接收响应 → 如果模型返回了 `tool_calls`，就执行工具、把结果作为 `tool` 角色消息回传 → 进入下一轮 → 直到模型不再调工具，循环结束。
>
> **防死循环**：`maxIterations = 3` 兜底。正常一次问答最多检索 1-2 轮，超过 3 轮说明模型陷入了循环，直接退出。

**代码依据**：`server/src/agent/loop.ts`

```js
export async function* runAgentLoop(opts: LoopOptions): AsyncGenerator<LoopEvent> {
  const { ..., maxIterations = 3 } = opts
  for (let turn = 0; turn < maxIterations; turn++) {
    const response = await client.chat.completions.create({ ..., stream: true })
    // ...
    if (toolCalls.length === 0) return    // 无工具调用 → 结束
    // 执行工具 → 回传结果 → 下一轮
  }
}
```

**Q：流式返回的 tool_calls 有什么坑？**（技术难点，答好很加分）

**答**：

> 有。流式响应里的 `tool_calls` 是**分片返回**的——函数名和参数会被拆成多个 delta 片段。所以不能直接赋值，必须**按 index 累积拼接**：每个 delta 只带一部分 `name` 或 `arguments`，要累加到同一个 toolCall 对象上，流结束后再 `JSON.parse` 参数。

**代码依据**：`server/src/agent/loop.ts`

```js
for (const tc of delta.tool_calls) {
  const idx = tc.index ?? toolCalls.length
  if (!toolCalls[idx]) {
    toolCalls[idx] = { id: tc.id ?? `call_${idx}`, type: 'function', function: { name: '', arguments: '' } }
  }
  if (tc.function?.name) toolCalls[idx].function.name += tc.function.name           // 累加
  if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments  // 累加
}
```

**Q：工具执行失败会怎样？**

**答**：

> **不会中断循环**。参数解析失败、工具执行异常、未知工具，都会把错误信息包装成内容回传给模型，让模型自己决定怎么处理（通常是换个参数重试或直接告知用户）。
>
> 这样做的好处是**容错性强**——单次工具失败不至于让整个对话崩掉。

**代码依据**：`server/src/agent/loop.ts`

```js
try {
  args = JSON.parse(tc.function.arguments || '{}')
} catch {
  args = { _error: '参数解析失败' }
}
try {
  result = await fn(args)
} catch (e) {
  result = { content: JSON.stringify({ error: `工具执行失败: ${e.message}` }), sources: [] }
}
```

---

### 1.8 ⭐ 工具设计（Prompt 工程体现在这里）

**Q：为什么只设计了两个工具？**

**答**：

> 按"最小够用"原则：
> - `search_knowledge`：**检索片段**——覆盖 80% 的场景（问答、概念解释）
> - `get_doc_content`：**取全文**——用于检索片段不够时（用户要求全文总结、对比多篇文章）
>
> 工具不是越多越好：每个工具的描述都会占用 prompt 空间，而且工具太多会让模型选错。

**Q：工具的 description 里为什么写那么细？**

**答**：

> 因为**工具描述是 prompt 的一部分**，模型靠它决定"什么时候调、怎么填参数"。所以我写了明确的使用边界：
> - `search_knowledge`：**"闲聊、寒暄不需要调用"**——避免模型为"你好"也去检索
> - `query` 参数：**"应基于对话意图重构而非直接复制用户原话"**——比如用户问"这个怎么解决？"，直接拿原话检索效果很差，需要模型结合上下文重构查询
> - `top_k`：**"问题范围广时取大值，精确问题时取小值"**——把调参策略也告诉模型

**代码依据**：`server/src/agent/tools.ts`

**Q：get_doc_content 有什么安全考虑？**（安全细节，加分）

**答**：

> 有**路径穿越防护**。因为这个工具接收的是文件路径参数，如果用户诱导模型传入 `../../../etc/passwd`，就会读到知识库之外的文件。
>
> 所以我在读取前校验了路径：解析后的绝对路径必须位于知识库根目录内，否则拒绝。

**代码依据**：`server/src/agent/tools.ts`

```js
const docsRoot = path.resolve(config.docsPath)
const resolved = path.resolve(docsRoot, p)
// 路径穿越防护：必须位于知识库目录内
if (resolved !== docsRoot && !resolved.startsWith(docsRoot + path.sep)) {
  return { content: JSON.stringify({ error: '非法路径：不允许访问知识库目录之外的文件' }), sources: [] }
}
```

---

### 1.9 ⭐ SSE 流式输出

**Q：为什么用 SSE 不用 WebSocket？**

**答**：

> 因为这是**单向推送**场景——只需要服务端把生成的 token 推给前端，不需要客户端持续发消息。SSE 基于 HTTP，不用协议升级、浏览器自动重连、实现简单。WebSocket 更适合双向通信（聊天室、协同编辑）。

**Q：SSE 实现有什么坑？**

**答**（三个坑，每个都是实战经验）：

1. **Koa 要手动接管响应**：`ctx.respond = false` + 手动 `res.writeHead()`，否则 Koa 会自动结束响应
2. **nginx 缓冲会破坏流式**：必须加 `X-Accel-Buffering: no` 响应头，否则 nginx 会缓冲整个响应再一次性返回，流式效果完全失效
3. **来源的发送时机**：sources 不能在工具执行后立刻发（那样前端会先显示来源、再显示文字，体验割裂），而是在**第一个 token 前**统一发一次

**代码依据**：`server/src/routes/chat.ts`

```js
ctx.respond = false                     // 绕过 Koa 自动响应
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',            // ← 关键:防止 nginx 缓冲
})
```

**Q：有没有考虑极端情况？**

**答**：

> 有。如果模型全程只调工具、没产出任何 token（比如检索完直接结束），前端就拿不到 sources。所以我在流结束后**兜底补发一次 sources**。

**代码依据**：`server/src/routes/chat.ts`

```js
// 极端情况：全程无 token（如模型只调工具就结束），补发 sources 让前端能展示
sendSources()
res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
```

---

### 1.10 防幻觉

**Q：怎么保证回答不编造？**

**答**（三层防护）：

1. **Prompt 约束**：system prompt 里明确"如果检索内容中没有相关信息，请如实告知，不要编造答案"
2. **来源可溯源**：回答要求标注 `[来源N]`，前端渲染成可点击的标签——用户可以点进去验证
3. **工具边界**：检索不到内容时，工具返回的 content 本身就是空的，模型没有素材可编

**代码依据**：`server/src/routes/chat.ts` 的 `SYSTEM_PROMPT`

---

## 二、金融 SaaS 平台全链路重构 · v5.5

> ⚠️ 这是你**分量最重**的项目（公司级全链路重构），面试官一定会深挖。核心叙事是：**用 Schema 驱动解决"多版本并行 + 巨石代码"**。

### 2.1 为什么要重构

**Q：这次重构解决什么问题？**

**答**：

> 两个核心痛点：
> 1. **巨石代码**——平台是多租户 SaaS，不同租户 / 套餐 / 功能开关导致同一页面有多种表现。最直观的实现是 if-else，但租户和特性越多分支越深，最后变成无法维护的巨石代码：**新增一个租户要改几十个文件，改一处可能影响其他租户**
> 2. **多版本并行**——部分客户停留在旧版本需要长期维护，导致多条 release 分支并行（`release/v1.x`、`release/v2.x`…），hotfix 还要 cherry-pick 到多个分支，维护成本极高

### 2.2 ⭐ Schema 驱动架构（核心，必须讲清）

**Q：你们的解法是什么？**

**答**：

> 核心思路是**把"变"的部分从代码里抽出来，用数据描述**。架构只保留四个概念：
>
> ```
> Context（当前是谁）→ Rule Engine（匹配规则）→ Schema（描述结果）→ Interpreter（解释执行）
> ```
>
> - **Context**：描述当前环境——哪个租户、什么套餐、开了哪些功能、什么角色（普通对象，业务需要什么维度就加什么字段）
> - **Rule Engine**：带优先级的条件匹配器，根据 Context 匹配规则，返回对应的结果标识
> - **Schema**：结构化数据，只描述"要什么"，**不绑定具体用途**（可描述 UI、开关、配置、路由）
> - **Interpreter**：解释 Schema 并执行——不同类型 Schema 对应不同解释器
>
> 四个组件各司其职：Rule Engine 不关心结果是什么，Interpreter 不关心条件是什么。

**Q：Rule Engine 是怎么设计的？**

**答**：

> 是一个**带优先级的递归条件匹配器**：
> - 条件支持**原子条件**（`field` + `op` + `value`，op 有 `eq` / `neq` / `in` / `notIn` / `exists`）和**组合条件**（`and` / `or` 递归嵌套）
> - 规则带 `priority`，构造时按优先级降序排序，保证高优先级规则先匹配
> - 匹配成功后返回 `result_id`（关联结果表），而不是直接返回结果对象——**规则与结果解耦**

**Q：Schema 具体用在了哪些地方？**

**答**：

> Schema 是**通用的**，不绑定用途。实际用在三个层面：
> 1. **UI Schema**——页面结构（`type` / `children` / `props` / `columns`），Interpreter 解释成组件树
> 2. **业务配置 Schema**——业务规则与租户差异配置化
> 3. **字段级配置（DFD）**——字段的显示 / 校验 / 联动由配置描述

**Q：这样之后"多版本"问题怎么解决的？**（这是最关键的追问）

**答**：

> 这是重构最大的收益：**从"多版本并行"变成"单版本 + 配置驱动"**。
>
> 以前不同租户的差异体现在**代码分支**上，所以要维护多版本；现在差异体现在**配置**上——同一份代码，不同租户加载不同的 Schema 配置即可。
>
> 效果：新增租户从"改几十个文件"变成"**新增一份配置**"；hotfix 也不用跨版本 cherry-pick 了。

**Q：技术栈也换了吗？**

**答**：

> 换了。Vue + JS + Vite → **React + TypeScript + Vite + TanStack Query**。这次是**全链路重构**（前端 + 后端 + 配置中心），前端除了技术栈迁移，还重构了组件库和"组件 / 页面的生成方式"——从手写页面转向**配置生成**。

### 2.3 可能的追问

| 追问 | 回答要点 |
|------|---------|
| **Schema 驱动会不会性能差？** | 解析有开销，但可按「Schema 版本 + Context 哈希」缓存解析结果；相比维护成本的下降，这点开销值得 |
| **配置出错了怎么办？** | ① Schema 结构校验；② 配置走配置中心，可回滚；③ 关键路径保留降级逻辑 |
| **团队怎么适应？** | 从"写页面"变成"写配置 + 写解释器"——需要转变思维；但公共组件与布局沉淀后，新页面开发速度明显提升 |
| **这套架构适合什么场景？** | 适合**多租户 / 多版本 / 强定制**的 SaaS；单一租户、需求稳定的话引入 Schema 属于过度设计（**能说出边界，比一味吹捧加分**） |

### 2.4 这次重构的价值（面试官想听的总结）

> - **对业务**：支撑多租户差异化诉求，新增租户成本从"改几十个文件"降到"加一份配置"
> - **对研发**：多版本并行 → 单版本 + 配置，维护成本大幅下降
> - **对架构**：把"变化点"收敛到配置层，代码只负责"不变的部分"（规则引擎、渲染引擎）

---

## 三、DevAgent Harness · AI 开发工作流工具箱

### 2.1 项目定位

**Q：为什么要做这个？**

**答**：

> AI 辅助开发有三个通病：
> 1. **跳步**——直接让 AI 写代码，它可能跳过设计直接实现，产出质量不稳定
> 2. **上下文浪费**——把项目所有规范一次性塞进 prompt，token 消耗大，还干扰模型判断
> 3. **经验不沉淀**——这次踩的坑，下次同类任务还会踩
>
> 所以我做了一套工作流框架来约束它：**流程约束 + 精准上下文 + 阶段产出 + 经验闭环**。

### 2.2 工作流定义

**Q：工作流是怎么定义的？**

**答**：

> **YAML 声明式定义**。一个工作流就是一组 `stages`，每个阶段声明：
> - `skill`：这个阶段用哪个技能文件
> - `input` / `output`：输入输出文件（如 `task.md` → `design.md`）
> - `sections`：**产出物必须包含的章节**（用于校验，如 `[## Decision Log]`）
> - `permission` / `tools`：权限与可用工具（如 `read-only` + `read+bash`）
> - `gate`：门禁（`user_approval` = 需用户确认才能进入下一阶段）
> - `executor`：`inline`（主 agent 直接执行）或 `subagent`（派独立子代理，隔离上下文）

**代码依据**：`workflows/feature/workflow.yaml`

```yaml
stages:
  - name: designing
    executor: subagent
    skill: knowledge/skills/designing/SKILL.md
    input: task.md
    output: design.md
    sections:
      - [## Summary for downstream]
      - [## Decision Log]
    permission: read-only
    gate: user_approval
```

**Q：为什么分 feature / bugfix / requirements 等多种工作流？**

**答**：

> 因为不同任务的**风险等级和流程需求不同**。改 bug 不需要完整的设计评审，新功能需要。用统一流程会导致"小事流程太重、大事流程不够"。
>
> 目前内置 6 种：feature、bugfix、requirements、project-init、skill-creation、workflow-creation。

### 2.3 两层架构

**Q：为什么设计成"通用层 + 项目层"？**

**答**：

> 为了**框架复用 + 项目定制**：
> - **通用层**（Harness 仓库）：工作流模板、Skill 接口规范、门禁与验证工具——所有项目共用，我统一维护升级
> - **项目层**（目标项目的 `knowledge/`）：项目特定的技能实现、编码规范、经验教训——由项目团队维护
>
> 通过 **git submodule** 嵌入目标项目。这样升级框架不影响项目数据，项目定制也不会污染框架。

### 2.4 关键机制

**Q："门禁"是怎么实现的？**

**答**：

> 两层检查：
> 1. **产出物检查**（`hooks/gate-check.js`）：校验阶段产出文件是否存在、是否包含 `sections` 里要求的章节
> 2. **人工确认**（`hooks/approve-guard.js`）：`gate: user_approval` 的阶段必须等用户批准才能推进，防止 AI 自作主张往下走

**Q："精准上下文"具体怎么做的？**

**答**：

> 由 `orchestrator/prompt-builder.js` 按阶段动态构建指令：只加载**该阶段需要的 skill + 相关文件**，而不是把所有规则一次性塞进去。
>
> 这样既省 token，也减少无关信息对模型判断的干扰。

**Q："经验闭环"怎么落地？**

**答**：

> 复盘阶段（`reflecting` skill）自动生成经验草稿 → 人工确认后写入 `knowledge/lessons/` → 下次同类任务启动时按索引加载相关经验。
>
> 关键设计是**人工确认环节**——AI 生成的经验不一定准确，直接入库会污染知识库。

### 2.5 工程细节

**Q：为什么自己实现了一个 `simple-yaml.js`？**

**答**：

> **零依赖**考虑。为了解析工作流定义引入一个 YAML 库不划算，而工作流的 YAML 结构是可控的（只有嵌套 map / list / 标量），自己实现一个精简解析器就够用，还能避免依赖升级带来的不确定性。

**Q：状态怎么管理的？**

**答**：

> 每个任务有独立的**任务目录**和 **checkpoint**（状态检查点），记录当前进行到哪个阶段、已完成阶段的产出。
>
> `core.js` 提供 `start` / `next` / `validate` / `advance` 等命令来推进状态机。另外有 `maxRework` 限制返工次数，避免无限循环。

---

## 四、Agent CLI · 终端 AI 编程助手

> ⚠️ **诚实定位**：这个项目你自己说"做得还不太好"。**主动承认局限反而加分**——体现你知道差距在哪。

### 3.1 定位与话术

**Q：介绍一下这个项目？**

**答**：

> 这是我从 0 写的一个命令行 AI Agent，目的是**把 Agent 的运行时机制跑通一遍**——包括 Agent 循环、工具系统、会话管理和终端 UI 渲染。
>
> 它现在功能还比较简陋（比如工具集很有限、没有做复杂的权限控制），但核心机制是完整的，还配了单元测试和终端模拟的 e2e 测试。

### 3.2 核心模块

| 模块 | 文件 | 说明 |
|------|------|------|
| Agent 循环 | `src/agent/loop.ts` | 流式解析 + 工具调用累积 + 多轮执行 |
| 工具系统 | `src/tools/index.ts` | 工具注册与调度（有单元测试） |
| 会话管理 | `src/session.ts` | 多轮上下文维护（有单元测试） |
| 终端 UI | `src/ui/tui.ts` | 流式输出渲染（有 e2e 测试） |
| 测试基建 | `src/testing/term-sim.ts` | 终端模拟器（用于 e2e） |

### 3.3 可能的追问

**Q：和 RAG 项目里的 Agent 有什么区别？**

**答**：

> RAG 里的 Agent 是**业务内嵌的**——工具固定（只有检索和取全文），服务于问答场景。
>
> CLI 里的是**通用 Agent 运行时**——工具可扩展、有独立会话和 UI 层，更接近 Cursor / Claude Code 这类工具的内核。

**Q：为什么要做终端模拟测试？**

**答**：

> TUI 的渲染逻辑很难用普通单元测试验证（涉及终端转义序列、光标控制、流式刷新）。所以我写了一个终端模拟器，模拟输入输出流做 e2e 断言——**测的是交互流程，而不只是函数返回值**。

**Q：这个项目你打算怎么继续完善？**

**答**（准备一个答案，体现规划能力）：

> 优先级是：① 扩充工具集（文件操作、搜索、执行命令）② 加权限确认机制（危险操作需批准）③ 支持多会话与上下文压缩（长对话的 token 管理）。

---

## 五、跨项目的通用问题

**Q：这三个项目有什么关系？**

**答**：

> 是一条**递进的学习路径**：
> - **Agent CLI** 让我搞懂了 Agent 的**运行时机制**（循环、工具调用、流式）
> - **RAG 系统**把 Agent 用到了**具体业务**上（检索增强 + 来源引用 + 流式对话）
> - **DevAgent Harness** 则跳出来，思考**怎么把 AI 用好的工程方法论**（流程约束、上下文管理、经验沉淀）

**Q：这些项目都是你独立做的吗？**

**答**（诚实版）：

> 架构设计和技术选型是我定的，实现过程用了 AI 辅助（Cursor / Claude Code）来加速。但代码我逐行 review 过——比如切分策略的 separators 怎么定、tool_calls 为什么要累积、SSE 为什么加 `X-Accel-Buffering`，这些都是我在实际调试中发现问题后调整的。
>
> 我觉得这恰恰是我和只会"复制 AI 代码"的人的区别：**我知道每一处为什么这么写**。

---

## 六、补课 Checklist（面试前必须做完）

### 金融 SaaS 平台重构（v5.5）—— 分量最重

- [ ] 能讲清两个痛点（巨石代码 + 多版本并行）
- [ ] 能画出 `Context → Rule Engine → Schema → Interpreter` 链路图
- [ ] 能解释 Rule Engine 的优先级 + 递归条件设计
- [ ] 能说明 Schema 的三个使用层面（UI / 业务配置 / 字段级 DFD）
- [ ] **能讲清"多版本 → 单版本"的收益**（这是最关键的追问）
- [ ] 能说出这套架构的**适用边界**（不是所有场景都适合）

### RAG 项目

- [ ] 能画出完整链路图（文档 → 切分 → 向量化 → 检索 → 生成 → 流式）
- [ ] 能解释 separators 的优先级设计（为什么按 Markdown 结构切）
- [ ] 能解释"块首注入标题"解决什么问题
- [ ] 能解释为什么全量重建索引（而不是增量）
- [ ] 能说出 413 错误的原因和解法
- [ ] 能解释 tool_calls 为什么要按 index 累积拼接
- [ ] 能解释 maxIterations 的作用
- [ ] 能解释路径穿越防护的必要性
- [ ] 能说出 SSE 的三个坑（Koa 接管 / nginx 缓冲 / sources 时机）
- [ ] 能解释为什么用 SSE 而不是 WebSocket

### Harness 项目

- [ ] 能讲清"流程约束 + 精准上下文 + 阶段产出 + 经验闭环"四个理念
- [ ] 能解释两层架构（通用层 + 项目层）的设计动机
- [ ] 能解释 gate（门禁）怎么实现的
- [ ] 能解释 sections 校验的作用
- [ ] 能解释 executor 的 inline vs subagent 区别
- [ ] 能解释经验闭环为什么需要人工确认

### Agent CLI

- [ ] 能讲清 Agent 循环的核心步骤
- [ ] 能解释工具注册机制
- [ ] 能说明"为什么做终端模拟测试"
- [ ] 准备好"下一步怎么完善"的答案

---

## 七、最后：怎么把"AI 写的"变成"你的"

**一句话**：面试官不关心代码是谁敲的，只关心**你能不能解释、能不能改、能不能判断好坏**。

所以最低成本的补课方式是：**打开每个文件，逐段问自己"这里为什么这么写"**——答不上来的地方，就是你需要补的知识点。本文档里的每一条，都能在代码里找到依据，对照着看即可。

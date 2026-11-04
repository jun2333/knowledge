# 04 · 对话链路：分阶段管线与工具补充

> 目标：搞清一次问答在前后端之间怎么流转——**谁决定检索**、提示词怎么拼、SSE 怎么推、前端怎么渲染。
>
> 下文文件都在基座包里：后端（`agent/`、`model/`、`routes/`）在 `@minijun/kb-core`，
> 前端（`theme/composables`、`theme/components`）在 `@minijun/kb-site`，实例里没有这些源码。

## 一、唯一路径：五阶段

```js
// knowledge.config.mjs
agent: { topK: 3 }   // topK = 预检索条数
```

```
改写 → 意图判断 → 检索 → 拼装 → 生成
```

一次问答的 LLM 调用：**1 次（准备）+ 1 次（生成）= 2 次**。检索是**代码**做的，不是模型决定的。

各阶段用不同的候选链（`models.stages`）：

```js
pool: {
  'qwen3-8b':       { model: 'qwen3:8b' },                    // 继承 thinking: false
  'qwen3-8b-think': { model: 'qwen3:8b', thinking: true },    // 复杂问题的生成轮用
},
stages: {
  prepare:         ['qwen3-8b'],       // 改写 + 意图 + 复杂度
  generate:        ['qwen3-8b'],       // 简单问题的生成
  generateComplex: ['qwen3-8b-think'], // 复杂问题的生成（开思考）
}
```

**为什么检索由代码做**：本地 qwen3-8b 关掉 thinking 后，「要不要查知识库」这个判断本身就不可靠——实测 3 个技术问题里 2 个不调检索，直接凭记忆作答；开着 thinking 它确实会调，但首字要等 34 秒。**这两个目标在「让模型自己决定」的前提下是互斥的。**把检索变成确定性动作，两者才能兼得。

**但工具能力没丢**：生成阶段仍然带 `search_knowledge` 和 `get_doc_content`。模型如果发现预检索的资料不够，可以自己再查——编号沿用同一张登记表（见第四节）。

> 早期版本是纯 Agent 循环（模型决定一切），后来改成 Function Calling 是因为问题差异大。
> 现在等于绕回来，但多了两样当初没有的东西：**一个便宜的准备阶段**（处理"不该检索"和"问题太简略"）
> 和**一个保留的工具**（处理"要看全文"和"预检索没查到"）。

## 二、阶段一：准备 —— `agent/prepare.ts`

一次调用做完三件事：**改写 + 判断要不要检索 + 判断复杂度**。

```ts
const prepared = await prepareQuestion(question, historyMessages, prepareTargets)
// prepared.question     改写后的问题（检索和生成都用它）
// prepared.intent       'chat' | 'retrieve'
// prepared.complexity   'simple' | 'complex'（模型给的，只记录不采信，见下）
```

### 为什么一次调用搞定

这三件事读的是**同一份输入**（历史 + 当前问题），拆开就是重复付费：

| 拆开会怎样 | 合并后 |
|---|---|
| 改写 1 次 + 分类 1 次 = 2 次调用 | 1 次 |
| 两份提示词都要贴同样的历史 | 只贴一次 |

而且它们的信息高度重叠：改写要理解上下文，分类也要理解上下文。

### 改写不只是补指代

第一版只做了「指代消解 + 不回答」，太窄。真正的改写要做四件事（对齐 ragent 的设计）：

| 做什么 | 例子 |
|---|---|
| **消解指代** | 「它的数据库用什么」→「12306 系统的数据库用什么」 |
| **继承省略的意图** | 「那 Vue2 呢」→「Vue2 的响应式原理是什么」 |
| **裁剪噪音** | 「请帮我**详细说明**12306 的架构」→「12306 的架构」（去掉礼貌语和回答指令） |
| **禁止编造** | 只能借历史里的**实体名**，不能把助手回答里的结论带进来 |

提示词在 `prompts/prepare.md`，含 6 个示例（含 2 个反例——「错误输出」比「正确输出」更能约束模型）。

三个约束：

| 约束 | 做法 | 原因 |
|---|---|---|
| 失败回退原问题 | JSON 解析失败/字段缺失 → 用原句 | 改写是增强项，不能让它把主链路带崩 |
| 输出清洗 | 去掉「改写后：」前缀、引号 | 模型爱加这些，不清会污染检索词 |
| 改写结果有长度上限 | 超 200 字符就丢弃 | 太长说明它在回答而不是改写 |

实测：

```
「那 Vue2 呢」（有历史）→ 「Vue2 的响应式原理是什么？」   改写 0.9s
```

### 闲聊判定也在这一步

`intent: "chat"` 的判据（问候 / 致谢 / 对上一轮的评价）本来要一次单独调用，
合并后顺带就有，**不多花钱**。

## 三、复杂度：不用模型自评

模型给的 `complexity` **只记录不采信**。实测 8B 模型把「闭包是什么」判成 complex
（这是个定义题），判错的代价是白等 20~35 秒。

改用确定性启发式，**只看问法**：

```ts
const REASONING_MARKERS = ['为什么','为何','原理','机制','本质','怎么实现','如何实现',
  '怎么工作','如何工作','怎么设计','为什么是','区别','差异','对比','比较','优缺点',
  '权衡','该如何','有哪些不同','有什么不同','怎么理解']

complexity = REASONING_MARKERS.some(m => question.includes(m)) ? 'complex' : 'simple'
```

> 曾经还加了一条「检索回多篇且分数接近 → complex」，实测融合分本来就挨得很近
> （0.50 / 0.43 / 0.34），结果每个问题都判成 complex，等于这条规则恒真，删掉了。

复杂问题的生成走 `stages.generateComplex`（开思考），简单问题走 `stages.generate`（关思考）。

## 四、阶段二：预检索 —— 复用 `agent/tools.ts`

```ts
const chunkSets = []
for (const q of queries) {                       // 复合问题：每个子问题各检索一次
  chunkSets.push((await implementations.search_knowledge({ query: q, top_k: topK })).chunks)
}
const merged = mergeChunks(chunkSets)           // 同一篇文档只留一条（留分数高的）
```

预检索用的是**和生成阶段完全相同的工具实现**——只是调用方从"模型"变成了"代码"。
模型在生成阶段补检索时走的是同一套编号规则。

### 引用编号只分配一次

这是最容易出错的地方。以前每个工具自己从 1 开始编号，两次工具调用就撞号——
模型写的 `[来源2]` 到底指哪一份？

现在的规则：**`createTools()` 里的来源登记表是唯一权威**。

```
工具      登记来源，拿到全局编号（同一 source 复用原编号），随 chunk 一起返回
   ↓
调用方    合并去重时**保留片段自带的 index**，不重新编号
   ↓
三处共用  ① 提示词里的 [来源N]  ② 前端来源面板的序号  ③ 答案里可点击的角标
```

**为什么登记表是唯一权威**：生成阶段模型可以自己再调 `search_knowledge`。
如果调用方自己重编一套号，就会出现两套编号体系——
预检索说「[来源3] 是 C」，模型补检索后登记表说「[来源4] 是 D」，
而前端只收到了前 3 条 → 面板缺一条，模型的引用被当成越界**静默抹掉**。

`mergeChunks`（按 source 去重、保留首次出现位置、内容取分数高的那段）
和登记表的编号顺序都是「首次出现顺序」，所以**合并后的编号与登记表逐一相同**，
复合问题拆成几路检索也不会出现编号空洞。

### 工具定义

| 工具 | 作用 | 参数 |
|---|---|---|
| `search_knowledge` | 检索相关片段 | `query`、`top_k`（默认 3，最大 10） |
| `get_doc_content` | 读取某篇完整内容 | `path`（如 `javascript/closure.md`） |

### 一个必须注意的安全点

`get_doc_content` 按路径读文件，必须防路径穿越：

```ts
const docsRoot = path.resolve(config.docsPath)
const resolved = path.resolve(docsRoot, p)
if (resolved !== docsRoot && !resolved.startsWith(docsRoot + path.sep)) {
  return { content: JSON.stringify({ error: '非法路径：不允许访问知识库目录之外的文件' }), sources: [], chunks: [] }
}
```

## 五、阶段三：拼装与生成

### 提示词在 md 里，不在代码里

```
src/prompts/
  classify.md        二分类
  generate.md        生成的系统提示词（规则）
  generate-user.md   用户消息模板（<documents> + <question>）
  _shared/code-format.md
```

`src/prompt/index.ts` 负责三件事：

```ts
${var}        变量，缺失直接抛错（静默渲染成空是最难查的 bug）
${> name}     引入 _shared/ 片段
按 mtime 缓存  改 md 存盘即生效，不用重编译
```

### 边界防护

资料正文里如果出现 `</documents>`，会把标签提前闭合，后面的内容就被当成"标签外的指令"：

```ts
function escapeBoundary(text: string): string {
  return text.replace(/<\/documents>/gi, '<\\/documents>')
}
```

### 生成

```ts
const genMessages = [
  { role: 'system', content: GENERATE_PROMPT },
  ...messages.slice(1),                        // 丢掉原来的 system
  { role: 'user', content: buildGenerateUserMessage(documents, question) },
]

// 检索已经做过了，再给 search_knowledge 只会让它重复查
const allowTools = definitions   // search_knowledge + get_doc_content 都给
```

**生成阶段带全部工具**：预检索已经做过，但模型如果发现资料不够（片段不相关、要全文、要对比另一篇），
可以自己再查。编号沿用同一张登记表（见第四节），不会错位。

## 六、工具循环：`agent/loop.ts`

生成阶段跑的是一个**工具循环**——模型可以调工具，工具结果回传，模型再决定要不要继续。

### 它依赖推理能力

实测同一个问题「闭包是什么」，生成阶段带 `search_knowledge` 的三种组合：

| 思考 | turns | 调工具 | 首字 | 引用 |
|---|---|---|---|---|
| 关 | 1 | ❌ **没调** | 5.8s | **无** |
| 开 | 2 | ✅ `search_knowledge` | **39.0s** | [1,2,3] |

**关掉思考后模型就不主动调工具了**——凭记忆直接回答，一个来源都没有。

根因不在架构，在模型：**qwen3 在 8B 规模下，非思考模式的工具调用能力明显不稳**，它不再输出 `tool_calls`。换成指令遵循更好的模型（云端模型、qwen2.5）就不需要开思考。

这正是**检索由代码做**的原因：不能指望模型每次都正确判断要不要查。

但**补检索**是可以交给模型的——预检索已经保证了「至少有资料」，模型只需要判断「够不够」，
这是个弱得多的判断。实测在复杂对比题上，模型确实会自己补检索到最相关的文档。

### 循环本身

```ts
for (let turn = 0; turn < maxIterations; turn++) {
  // 流式收集 content + tool_calls（delta 分段累积）
  if (toolCalls.length === 0) return    // 没有工具调用 → 回答已流出，结束

  messages.push({ role: 'assistant', content: null, tool_calls })
  for (const tc of toolCalls) {
    messages.push({ role: 'tool', tool_call_id: tc.id, content: result.content })
    yield { type: 'tool', name: tc.function.name, args, sources: result.sources }
  }
}
```

三个关键点：

1. **`tool_calls` 是 delta 分段的**：函数名和参数 JSON 会被切成很多块，必须按 `index` 累积拼接。
2. **循环有上限**（`maxToolRounds + 1`，默认 3）：防止模型反复调工具兜圈子。
3. **错误也回传**：工具不存在或执行异常时，把错误作为 `role: 'tool'` 的内容交给模型，而不是直接崩掉。

**收尾轮**：如果预算用尽时模型还在调工具（`answer` 还是空），追加一轮**不带工具**的请求，
强制它基于已有资料给出答案。否则用户看到的是空回答。
`Observation.budgetExhausted` 记录这种情况，`kb obs stats` 能看到它出现多少次。

## 七、两个通道：`model/stream.ts`

同一个「流式调用」有两种底层实现，差异被收敛在这里：

| 通道 | 什么时候用 | 特点 |
|---|---|---|
| OpenAI 兼容 | 云端模型 / 远程服务 | 官方 SDK，`tool_calls` 分片到达 |
| Ollama 原生 | 本地且需要 `think` 参数 | **只有它支持关思考**，NDJSON 流，`tool_calls` 一次性给出 |

对外统一成三种事件：

```ts
type StreamChunk =
  | { type: 'thinking'; content: string }
  | { type: 'text'; content: string }
  | { type: 'end'; toolCalls: NormalizedToolCall[] }
```

**为什么要绕这一层**：Ollama 的 OpenAI 兼容接口**不支持 `think` 参数**（实测传了也照旧思考），想关思考只能走原生 `/api/chat`；而原生接口的 tool_call 形状又和 OpenAI 不同（`arguments` 是对象、没有 `id`）。不统一的话，上层要写两套。

## 八、降级：候选链

```js
stages: {
  generate: ['ds-flash', 'qwen3-8b'],   // 顺序 = 优先级 = 降级顺序
}
```

规则只有一条：**吐出第一个字之前允许换模型，之后锁定**。

```ts
if (committed || i === targets.length - 1) throw e   // 已经出字，不能再换
```

否则用户会看到两段不同的开头——比直接报错更难理解。

## 九、SSE 输出：`routes/chat.ts`

```ts
ctx.respond = false
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',   // 关掉 nginx 缓冲，否则流式会被攒着发
})

for await (const event of runChat({ reqId, messages, question, client, definitions, implementations })) {
  if (event.type === 'tool') { /* 聚合来源，去重；有新增就重发 */ }
  else if (event.type === 'thinking') { /* 转发思考 */ }
  else if (event.type === 'token') { sendSources(); /* 转发正文 */ }
}
```

`runChat()` 是 `agent/pipeline.ts` 里的统一入口，**路由和生成评估都走它**——否则改了线上路径而评估还测老路径，数字就没有意义。

### 前后端事件协议

| type | 时机 | data |
|---|---|---|
| `meta` | 最先（请求刚开始） | `{ reqId }`——本次问答的唯一 id |
| `sources` | 第一个 token 之前；**有新增来源时会再发一次** | `[{ index, source, title }]` |
| `thinking` | 思考过程中逐块 | 文本片段 |
| `token` | 生成过程中逐块 | 文本片段 |
| `done` | 结束 | — |
| `error` | 异常 | 错误提示 |

**为什么来源要"延迟到第一个 token 再发"**：如果检索完立刻显示"参考来源"，而模型还要几秒才出字，用户会看到"来源先出、正文迟迟不来"的割裂感。

**为什么来源可能要发多次**：模型可能先说话、再调工具补检索——那时新来源才出现。
只发一次的话，后到的来源永远发不出去，前端会把越界的 `[来源N]` 静默抹掉
（`renderMarkdown` 里 `Number(n) <= sourceCount` 的判断）。所以后端改成「集合有变化就重发全量」，
前端收到后要**重渲染一次已产生的内容**——否则答案里后补的引用已经被上一帧抹掉了。

**`reqId` 的用处**：用户报障"刚才那条回答不对"时，把这个 id 报给开发者，
就能从 `data/logs/qa-*.jsonl` 里捞出整条观测记录（见第十二节）。

## 十、前端

### 解析：`useAIChat.ts`

用 `fetch` + `ReadableStream` 手写 SSE 解析（不用 `EventSource`，因为要 POST 且要带历史消息）。

### 上下文预算

```ts
function buildHistory() {
  // 按字符预算从近到远取，而不是固定带全部
  for (let i = pool.length - 1; i >= 0; i--) {
    if (used + cost > HISTORY_CHAR_BUDGET) break
    picked.unshift(...)
  }
}
```

之前是 `slice(0, -2)` 全量带上，聊久了必然撑爆 prompt。

### 持久化：写盘的三道保险

`localStorage` 存最近 50 条（`kb-chat-history-v1`），流式标记恢复时清掉。只存 `role/content/sources/thinking`，不存中间状态。

「刷新就没了」这个 bug 有三个成因，所以写了三条保险：

| 保险 | 时机 | 挡的是 |
|---|---|---|
| 防抖写盘（600ms） | 消息变动 | 流式过程中每个 token 都触发，合并成一次写 |
| **流结束立即写** | SSE 结束 / 出错 / 用户停止 | 不等防抖计时器——回答完成的那一刻就落盘 |
| **卸载前写** | `beforeunload` / `pagehide` | 刷新/关标签时兜底（此时计时器通常还没到） |

### 引用可点

答案里的 `[来源N]` 被渲染成可点的角标，点一下在**浮窗内部**滚到来源面板里对应序号的那一条：

```ts
html.replace(/\[来源(\d+)\]/g, (m, n) =>
  Number(n) <= sourceCount
    ? `<a class="ai-cite" href="#" data-cite="${n}" data-msg="${msgIndex}">${m}</a>`
    : ''
)
```

来源面板的标签也带上序号（`[1]`、`[2]`），两边靠这个编号对应。

::: warning 为什么不用原生锚点（`href="#kb-src-N"`）

原生锚点在**这个场景下必然失效**，实测（真实浏览器，position:fixed 浮窗 + 内部滚动容器）：

```
点击前: window.scrollY=0    面板内部 scrollTop=0
点击后: window.scrollY=1026 面板内部 scrollTop=0     ← 面板没动，页面反而跳走
```

两个原因叠加：

1. **滚动容器不对**：目标在浮窗内部，滚动容器是 `.ai-chat-messages`（`overflow-y:auto`），
   而原生锚点滚的是**页面**（window）。浮窗是 `position:fixed`，页面滚动对它毫无影响。
2. **VitePress 劫持了点击**：它的 router 在 window 上用**捕获阶段**监听所有 `<a>`，
   `treatAsHtml()` 对 `.html` 路径返回 true，于是走它自己的 `scrollTo()`——
   同样是 `window.scrollTo(0, targetTop)`，页面被滚到浮窗所在的位置，浮窗不动。

所以改成**自己处理点击**：

- `data-cite` / `data-msg` 记编号，用**捕获阶段**监听（角标是 `innerHTML` 塞的，没有 Vue 事件绑定）
- `preventDefault()` + `stopPropagation()`：必须在捕获阶段拦下，否则 VitePress 先一步劫持
- **手动设 `panel.scrollTop`**，不用 `scrollIntoView`——它会滚动所有祖先容器（页面也跟着动），
  且 `block:'nearest'` 的判定基准是整个视口，对浮窗这个独立滚动区算不准（实测滚过头）
- 目标 id **带消息序号**（`kb-src-<消息序号>-<来源序号>`）：否则问两轮就有两个 `kb-src-2`，
  `getElementById` 只返回第一个 → 永远跳到最早那条消息的来源

### 渲染：`AIChat.vue`

Markdown 用 `marked`，代码高亮用 `hljs`：

```ts
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }) { /* hljs 高亮 */ },
    html({ text }) { return escapeHtml(text) },   // 模型输出里的原始 HTML 一律转义
  },
})
```

**`html` 那条是安全项不是样式项**：之前 `v-html` 直接吃模型输出，模型只要复述资料里的 `<img onerror=...>` 就是一次注入。

## 十一、完整时序

```
浏览器 POST /api/chat {message, history}
   │
   ├─ runChat() → runPipeline()
   │     │
   │     ├─ ① prepare(question, history) ──── 1 次调用出三件事
   │     │     rewrite  :「那 Vue2 呢」→「Vue2 的响应式原理是什么？」
   │     │     intent   : chat | retrieve
   │     │     complexity: simple | complex（只记录，实际用启发式）
   │     │
   │     ├─ ② intent == chat ───────────────→ 直接生成，不检索，结束
   │     │
   │     ├─ ③ search_knowledge(sub_questions) ── 必定发生，复合问题分路检索
   │     │     └ 合并去重（保留登记表编号）→ yield { type:'tool', sources }
   │     │
   │     ├─ ④ 拼 <documents> + <question>
   │     │
   │     └─ ⑤ runAgentLoop(带全部工具)
   │           简单问题走 stages.generate（关思考）
   │           复杂问题走 stages.generateComplex（开思考）
   │           └ yield { type:'token' } × N
   │           （模型可自己补检索，编号沿用同一张登记表）
   │
   ├─ 路由：先发 meta(reqId)，来源有变化就发 sources，逐块发 token，最后发 done
   └─ 前端：累积 token → rAF 节流 → marked 渲染
```

## 十二、日志与观测

分两层，职责不同：

| | pino | observe |
|---|---|---|
| 给人看 | ✅ 服务起没起、报了什么错 | ✅ 一行简报（在 stdout） |
| 给机器看 | ❌ 只到 stdout | ✅ `data/logs/*.jsonl` |

用 **pino** 而不是 `console.log`：分级、结构化、带命名空间。

```bash
pnpm serve:debug          # = LOG_LEVEL=debug kb serve，前台跑，日志直接打终端
LOG_LEVEL=info pnpm dev  # 生产级别的日志量
```

级别：开发环境默认 `debug`，生产默认 `info`（`NODE_ENV=production`），`LOG_LEVEL` 可覆盖。
装了 `pino-pretty` 是彩色输出，没装就是 JSON 行（生产就应该是 JSON）。

命名空间：`retrieval` / `generation` / `prompt` / `prepare` / `config`。

### 阶段观测：一次问答一行 JSON

`data/logs/qa-YYYY-MM-DD.jsonl`（按天切，单文件超 32MB 滚 `.2/.3`）。
**不是**每阶段一行——一次问答聚在一行，才能直接 `jq` 聚合。

```bash
kb obs tail -n 5                    # 最近 5 条
kb obs show <reqId>                  # 某次问答的完整记录
kb obs stats thinking                # 按 thinking 分组统计
kb obs checks                        # 只看待解决的问题
kb obs prune --days 30               # 清理旧文件
kb obs-ui                            # 观测台页面（独立 React 应用，端口 5174）
```

开关：`KB_OBSERVE=off` 关闭 / `=full` 不截断（默认 basic，截断模型原始输出和回答）。

### 观测台（可视化页面）

`kb obs-ui` 起一个**独立的 React 应用**（端口 5174），自动检查并拉起后端 API。

**为什么不在 VitePress 站点里**：观测台是开发期工具，不该进站点构建管线
（会被 VitePress 打包、被内容索引、被部署到 GitHub Pages）。
它是基座仓库里的独立包 `packages/obs-ui`（`private: true`，不发布）。

**技术栈刻意简单**：Vite + React + lucide-react 图标，**不引图表库**
（阶段耗时条用 CSS 手写就够，引入 recharts 会让包大几百 KB）。
"渐进式"体现在：以后想加曲线图/换 UI 框架，都不动 `core`。

**统计逻辑只有一份**（`packages/core/src/observe/stats.ts`），CLI 和页面共用——
否则两边数字对不上，就没法判断该信谁。

页面结构：

| 页 | 内容 |
|---|---|
| 总览 | 汇总数字卡（记录数/平均耗时/**问题记录占比**/**引用越界次数**）+ 分组对比表（**带相对差值**，如「on 比 off 首字慢 860%」）+ 检查项排行 |
| 明细 | 每次问答一行（时间/问题/改写后的问题/耗时/首字/引用数/问题标记），点开看详情 |
| 对比 | 选两组并排比，**同时给出样本量与噪声带** + 一句结论（「差值在噪声带内 = 随机波动」/「样本量不足，只能当趋势看」） |

顶部还有 **数据来源过滤**（全部 / 线上问答 / 评估跑批）——
两者混在一起时「平均首字」会被评估的长题拉偏。

详情抽屉里按阶段分区：**五阶段耗时比例条**、**改写前后并排对比**、
检索命中表（query/命中数/不同来源数/top 分）、**来源编号表**（标出哪些被引用了）、
`prepareRaw` 折叠（判断"规则太多→不照格式输出"的关键证据）、`checks` 列表。

一行里有什么（节选）：

```json
{"reqId":"8eab4882","kind":"chat","question":"React 的 Fiber 架构解决了什么问题？...",
 "rewritten":"React 的 Fiber 架构解决了什么问题？React 18 和 Vue 3 的响应式机制对比",
 "rewrittenChanged":true,"intent":"retrieve","complexity":"simple",
 "prepareMs":6084,"prepareAttempts":[{"model":"qwen3:8b@...","ok":true,"ms":6084}],
 "prepareRaw":"```json\n{\"rewrite\":\"...\"}","promptHash":"abaf4690",
 "retrievals":[{"phase":"pre","query":"...","ms":720,"hits":3,"distinctSources":3,"topScores":[...]}],
 "sources":[{"index":1,"source":"react/concept.md"},...],
 "documentsChars":2517,"systemChars":1633,"userChars":2572,
 "generateMs":49516,"firstTokenMs":31944,"model":"qwen3:8b@...","thinking":true,
 "candidateChain":"generateComplex","tools":[],"turns":1,"cited":[1,4],
 "totalMs":55234,"status":"ok","checks":[{"id":"generation.slow_first_token","level":"info",...}]}
```

**它能回答三个问题**：

| 想知道 | 看哪个字段 |
|---|---|
| 改写阶段干得好不好 | `question` vs `rewritten` + `rewrittenChanged` + `prepareRaw` |
| 不开 thinking 会不会蠢 | `thinking` / `candidateChain` / `firstTokenMs` / `cited` / `answerChars` |
| 提示词规则太多会不会犯错 | `prepareAttempts`（几次没照格式输出）+ `prepareRaw` + `systemChars` |

### 自动检查项

`checks` 是**纯函数**算出来的，写盘那一刻落盘。原始字段要人读，检查项能直接聚合。

| id | 触发条件 | 指向 |
|---|---|---|
| `prepare.parse_failed` | 某候选没按格式输出 | ③ 提示词约束太重 / 模型能力不足 |
| `prepare.rewrite_noop` | 含指代词但没改写 | 指代消解没执行 |
| `prepare.rewrite_too_long` | 改写长度 > 3× 原问题 | 模型在写答案而不是改写 |
| `prepare.intent_miss` | 技术问题被判成闲聊 | 该检索没检索 → 漏答 |
| `retrieval.empty` | 命中 0 条 | 召回问题 |
| `retrieval.low_diversity` | 命中多段但只来自 1 篇 | 召回多样性差 |
| `generation.no_citation` | 有来源但一个引用都没标 | 资料没用上 |
| `generation.citation_invalid` | 引用编号不在来源表内 | **编号错位**（改造后必须恒为 0） |
| `generation.tool_budget_exhausted` | 预算耗尽仍无答案 | 工具循环没兜住 |
| `generation.fallback_model` | 候选链降级 | 模型或服务问题 |
| `generation.slow_first_token` | 首字 > 10s | 性能，不是质量 |

### 提示词指纹

`promptHash` 是提示词内容的 sha256 前 8 位（`promptFingerprint()`）。

**为什么不用人工版本号（v1/v2）**：提示词已经进 git，commit 就是版本。
再维护一个手写编号，必然"改了正文忘了改号"，编号和内容对不上——**两套真相**。
指纹是内容算出来的，不存在忘记更新。

评估记录里也存了同一个值（`eval-history.jsonl` 的 `env.promptHash`），
所以「分数变了」能立刻分清是**提示词改了**还是**模型退化了**。

### 做 thinking 的 A/B

线上真实提问**无法做同题 A/B**（同一个问题不会在开/关下各问一次），
所以观测只能定性回答"关 thinking 的回答长什么样"。定量决策要靠受控 A/B：

```bash
KB_THINKING=off pnpm test:rag:full && KB_THINKING=on pnpm test:rag:full
```

`KB_THINKING=on|off` 强制覆盖配置的 thinking 开关——同一份题集、同一份提示词，只变这一个变量。

> ⚠️ **样本量与随机性**：生成层评估只有 10 题，而生成阶段 `temperature=0.7` 有随机性。
> 实测同一份提示词连跑两轮，引用合法性一轮 90% 一轮 100%——**单次跑分不能证明退化**。
> 要下结论得扩到 20~30 题、每组重复 3 次取中位数。

### 评估跑批也写观测记录

`kb eval --full` 的每一题都会写一行观测（`kind: 'eval'`），**judge 分数写回同一条记录**。

这样才能做"按 judge 分数看改写质量"这类分析——如果 judge 分数和阶段数据分开放，
就得手动 join。观测台上可以按 `kind` 把线上问答（`chat`）和评估跑批（`eval`）分开看。

**注意**：检索层评估（`kb eval` 不带 `--full`）**不走完整管线**——
它直接调 `retriever.invoke(q)`，没有改写阶段，所以不产生观测记录。
它的 249 题是纯检索质量的测量，不是端到端质量的测量。

每条 eval 记录还带一个 `run` 字段（并发数 / 提示词指纹 / thinking 设置）——
**整批共享的变量必须记下来，否则数据没法解释**（见下面并发那节的坑）。

::: warning 评估集的题不能出现在知识库里

知识库里有一篇讲评估集设计的文档（`project-architecture/06-evaluation.md`），
它原本把负例题的**原文**当例子列了出来——而这篇文档本身会被检索到。

后果：模型检索到它 → 看到"资料里提到了这道题" →
把它当成有依据的内容 → 标注 `[来源4]`（其实是文档里的 `[来源N]` 字样）→
**引用合法性检查判它越界**。

看起来像模型幻觉，其实是**评估集污染了知识库**。两个修法：
① 文档里别写题目原文（用"见评估集"代替）——已修
② 把评估设计类文档排除出索引

观测台能直接暴露这类问题：详情抽屉的「检索」分区会显示命中了哪几篇，
一眼就能看出"命中的是一篇讲评估的文档"。

::: tip
**通用规则**：任何写进知识库、又包含评估集题目的文档，都有这个问题。
所以连**本文档**提到那道题时，也只能说"某道 Kubernetes 负例题"，
不能把题目原文抄进来——否则等于又制造了一份污染源。
:::

### 并发：本地单实例模型下，并发反而更慢

生成层评估串行跑 10 题要 9.5 分钟（每题一次生成调用 + 一次 judge 调用）。
`--concurrency N` 可以并发，但**实测并发 2 是负优化**：

| | prepare 均值 | prepare 最大 | 45s 超时 |
|---|---|---|---|
| 并发 1 | **3.6s** | 13.9s | **0 题** |
| 并发 2 | 27.7s | 45.0s | **2 题（20%）** |

原因不是模型慢，是 **Ollama 只有一个模型实例**——两个请求抢同一个实例，
第二个得排队等第一个跑完，**而且排队时间算进 prepare 的 45s 超时里**。
并发让单题慢 7.6 倍，墙钟时间只省一半，代价是 20% 的题超时。

所以**默认串行**（`DEFAULT_CONCURRENCY = 1`）。换机器（多实例驻留 / 更大显存）
再用 `--concurrency` 调高。

> 超时和"模型没按格式输出"是**两回事**，观测里分开记（`prepare.timeout` vs
> `prepare.parse_failed`）——混在一起会把超时误报成"提示词太重"，
> 而"提示词规则太多"恰恰是要排查的核心问题，不能被噪声淹没。

### 门禁：三层判定，别跟随机性对赌

生成阶段 `temperature: 0.7`，同一份题集连跑 10 次，实测忠实度在 **3.7~4.9** 波动（极差 1.2）。
用固定绝对阈值判断 = 拿单次结果跟随机波动对赌，**10 次里有 2 次因纯随机失败**。

现在判三层：

| 层 | 判据 | 作用 |
|---|---|---|
| **硬底线** | 引用越界必须为 0 | 编号错位是 bug，不是质量问题，不许容忍随机 |
| **相对基线** | 与基线差值不超过**噪声带** | 噪声带从 `eval-history.jsonl` 的历史跑批算（标准差 × 2） |
| **看趋势** | 连续 3 次都低于基线才报警 | 单次波动只提示，不算失败 |

跑批时会打印噪声带：

```
噪声带（历史跑批实测波动，±2σ）：引用合法性 ±8% | 忠实度 ±0.71 | 完整性 ±0.67
差异在噪声带内 = 随机波动；连续多次超出才算真退化
```

**门禁的目的是"发现真的退化了"，不是"抓随机波动"**——误报多了就没人看门禁了。

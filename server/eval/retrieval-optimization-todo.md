# 检索优化待办

> 来源：`pnpm rag:review-cases` 筛出的「检索未命中」项，经人工分析确认为**文档确实讲了、但检索没捞到**。
> 这些不是标注问题，是真实的检索优化空间。分析日期：2026-09-23（评估集 250 题）

## 清单

| # | 问题 | 期望文档 | 实际命中（top3） |
|---|------|---------|-----------------|
| 1 | FMP和LCP有什么区别？ | `performance/metrics.md` | ai-agent/function-calling.md, ai-agent/prompt-engineering/skills.md, ai-agent/harness-engineering/function-calling-upgrade.md |
| 2 | 为什么需要及时响应代码审查请求？ | `engineering/team-management.md` | ai-agent/spec-first/guide.md, ai-agent/harness-engineering/function-calling-upgrade.md, service/auth.md |
| 3 | 如何通过主进程获取用户数据目录路径？ | `frontend/desktop.md` | service/data-distribution-locks.md, books/node-process.md, agent-cli/architecture.md |
| 4 | 如何通过优化提示提升AI回答质量？ | `ai-agent/prompt-engineering/basics.md` | react/performance.md, ai-agent/harness-engineering/best-practices.md, ai-agent/rag/knowledge-base.md |
| 5 | 如何利用 cluster 实现 Node.js 多核部署？ | `service/node-high-concurrency.md` | service/node-core.md, service/egg.md, service/node-deployment.md |

## 逐条分析

### 1. FMP 和 LCP 有什么区别？ → `performance/metrics.md`

- **文档有讲**：L68 `FMP（First Meaningful Paint）`、L79 `LCP（Largest Contentful Paint）`。
- **现象**：期望文档完全没进 top5，反而命中了 3 篇 `ai-agent/*`（与性能指标无关）。
- **疑点**：命中文档与问题语义毫无关系，怀疑是**英文缩写（FMP/LCP）在向量空间里"漂移"**，或这两段在 `metrics.md` 里被切得较短、上下文弱。
- **排查方向**：直接算 `query` 与 `metrics.md` 各块的相似度，看是"块内容弱"还是"被无关文档抢占"。

### 2. 为什么需要及时响应代码审查请求？ → `engineering/team-management.md`

- **文档有讲**：L75 `## 代码审查文化`。
- **现象**：未命中，命中 `ai-agent/spec-first`、`service/auth` 等无关文档。
- **疑点**：问题表述偏"软"（"及时响应""请求"），而文档用词是"代码审查文化/原则/清单"，**语义相关但用词不重合**。
- **排查方向**：这条更可能是**问题本身提炼得不好**（生成题的措辞离文档表述太远）。可考虑改述，或接受它作为"难例"。

### 3. 如何通过主进程获取用户数据目录路径？ → `frontend/desktop.md`

- **文档有讲**：L70 `event.reply('file-path', app.getPath('userData'))` —— 但**在代码块里**。
- **现象**：未命中。
- **疑点**：关键信息藏在**代码块**中，被切分成小块后语义很弱（`app.getPath('userData')` 这类代码文本对中文问题的 embedding 匹配天然弱）。
- **排查方向**：验证"代码块内容"在检索中的表现；可能需要在切分时为代码块补充上下文说明。

### 4. 如何通过优化提示提升AI回答质量？ → `ai-agent/prompt-engineering/basics.md`

- **文档有讲**：L3 开篇即提"通过优化与 LLM 的交互方式获得更高质量的回答"。
- **现象**：未命中，命中 `react/performance.md` 等。
- **疑点**：问题偏泛（"优化提示"），而 `basics.md` 内容多而分散，单块与问题的匹配不够突出。
- **排查方向**：属于"泛问题 + 长文档"的典型难例，可考虑改述得更具体。

### 5. 如何利用 cluster 实现 Node.js 多核部署？ → `service/node-high-concurrency.md`

- **文档有讲**：L27 `cluster 多进程`、L61 `多核用 cluster/PM2 -i`。
- **现象**：未命中，但 top3 全是 Node 相关文档（`node-core`、`egg`、`node-deployment`）。
- **疑点**：**cluster 相关知识点散落在多篇文档里**（node-core / node-deployment / node-high-concurrency 都提），被其他篇抢占。
- **排查方向**：考虑把 `expect` 扩成多篇（`node-high-concurrency` + `node-core` + `node-deployment`）——这更像是"标注该放宽"而非检索问题。

## 共性观察

1. **"软问题"（措辞与文档表述不重合）** 是最主要的失分原因（#2、#4）——LLM 生成的问题措辞太自由。
2. **关键信息在代码块里**会显著削弱检索（#3）——代码块的 embedding 语义弱。
3. **知识点散落多篇**时容易被误判为"未命中"（#5）——可能需要放宽 `expect`。
4. 少数疑似**向量漂移**（#1）需要实测确认。

## 后续可做的优化（按性价比）

| 优化 | 针对 | 说明 |
|------|------|------|
| 代码块补上下文 | #3 | 切分时给代码块拼上所在章节标题（轻量） |
| 放宽多篇 expect | #5 | 标注层面即可解决，非检索问题 |
| 混合检索（BM25+向量） | #1 类缩写/专名 | 关键词路能兜住"FMP/LCP"这种精确匹配 |
| 具体化问题表述 | #2 #4 | 属于评估集质量问题，改题即可 |

> 注意：以上都**尚未实施**，仅作待办记录。改任何一项后，跑 `pnpm test:rag` 对比基线确认效果。

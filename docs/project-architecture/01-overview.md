# 01 · 总览与架构

> 目标：读完这一篇，你能说清这个项目是什么、由哪些部分组成、一次问答是怎么跑通的。
> 后续几篇再逐个模块深入。

## 一、它是什么

一个**完全跑在本地**的个人技术知识库，由两部分组成：

1. **知识库站点**（实例根 `docs/`）：基于 VitePress 的静态文档站，承载 250+ 篇技术笔记（React/Vue 原理、浏览器、工程化、服务端、AI Agent 等）。
2. **AI 问答服务**（基座包 `@minijun/kb-core`）：基于 Koa + TypeScript 的后端，把笔记做成向量索引（RAG），接本地大模型实现**带引用溯源**的自然语言问答。

**关键特性**：不联网、零 API 成本、数据不出本机——模型和向量库全部本地运行（Ollama + Docker 里的 Chroma）。

## 二、解决什么问题

| 问题 | 这个项目怎么做 |
|------|--------------|
| 笔记越写越多，找不到 | 全站本地搜索 + 用自然语言问 AI |
| 通用 AI 不懂你的笔记 | RAG：先检索你的笔记，再让模型基于笔记回答 |
| AI 回答不可信 | 回答强制标注引用来源，可点开原文核对；检索不到就明确说"没找到" |
| 担心数据隐私 / API 费用 | 模型与向量库全部本地运行 |

## 三、整体架构

```mermaid
flowchart TB
  subgraph L1["① 接入层 · 文档站 docs（VitePress）"]
    S[静态笔记页面]:::box
    C[AIChat 聊天组件]:::box
    AN[批注系统]:::box
    MG[内容管理面板 · 导入 / 归档]:::box
  end

  subgraph L2["② 应用层 · 后端 @minijun/kb-core（Koa + TS）"]
    R[chat 路由 · SSE]:::box
    L[Agent 循环]:::box
    T[工具：检索 / 取全文]:::box
    RT[检索器 retriever]:::box
    IM[import / manage 路由]:::box
  end

  subgraph L3["③ 模型层 · Ollama（本机推理，提供计算能力）"]
    OE[bge-m3 · 文本向量化]:::box
    OL[qwen3:8b · 回答生成]:::box
  end

  subgraph L4["④ 存储层 · Chroma（Docker，提供数据）"]
    CH[(向量集合 knowledge_base)]:::db
  end

  FS[(内容源：docs/ 下的 Markdown)]:::db
  IX["离线任务：kb index 索引脚本"]:::box

  C -->|POST /api/chat| R
  R --> L
  L -->|工具调用| T
  T --> RT
  RT -->|"① 问题向量化"| OE
  RT -->|"② 相似度检索"| CH
  L -->|生成回答| OL
  R -->|SSE 流式| C

  MG -->|"预检 / 执行 / 归档"| IM
  IM -->|"写入 docs/imported/，再归档到分类"| FS
  FS -->|"构建"| S
  IX -->|"读取 Markdown 并切块"| FS
  IX -->|"调用向量化"| OE
  IX -->|"写入向量"| CH

  classDef box fill:#f6f8fa,stroke:#888,stroke-width:1px;
  classDef db fill:#eef,stroke:#88a,stroke-width:1px;
```

> **入口有两条**：读（AI 问答，`C → R`）和写（整理内容，`MG → IM → FS`）。写的那条只在本地开发时挂载——面板会真的改文件（详见 [02 篇 · 内容管理](./02-docs-site.md#六、内容管理-导入与归档)）。

**模型层（③）和存储层（④）不是同一级**，别被"都跑在本机"误导了：

- **模型层（Ollama）**是**无状态的计算能力**：被调用来做"文本 → 向量"和"生成回答"，用完即走。
- **存储层（Chroma）**是**有状态的数据**：持久化保存向量，只能被查询（检索时）或写入（索引时）。

要注意：**③ 和 ④ 之间没有箭头——它们互相不调用**。应用层是它们共同的上游，分别直连两层：

```
检索器 retriever ──① embedQuery：问题文本交给 bge-m3，换回向量──→ 模型层
                ──② 拿向量请求 Chroma，由它算相似度返回 topK──→ 存储层
```

对应的代码只有一行 `store.similaritySearchWithScore(query, k)`，内部就是这两步——**相似度计算发生在 Chroma 服务端**（HNSW 近似检索），应用层拿到的只是排好序的结果。

> 除了这一路，检索器还有**第二路：BM25 关键词检索**（内存中建的倒排索引）。
> 两路结果归一化后加权融合 → 这就是**混合检索**，默认开启（详见 [03 篇](./03-server-rag.md)）。

所以图上的"分层"是按**职责**划分（提供能力 vs 提供数据），不是调用链的串联：模型层不查库、存储层不算向量，谁也不依赖谁；而模型层和存储层都是应用层的下游依赖。

四条独立的数据流要分清：

1. **整理流**（离线，仅本地）：散落的笔记 → 「内容管理」面板导入（预检 → 落进 `docs/imported/`）→ 归档到分类（`docs/<分类>/`）→ 触发索引更新。**它只动文件，不碰向量库**——所以归档完要再走一次写入流。
2. **写入流**（离线）：`pnpm kb index` 读 `docs` 下的 md → 切块 → bge-m3 向量化 → 写入 Chroma（默认增量，只处理内容变更的文件）。
3. **问答流**（在线）：用户提问 → Koa → Agent 循环（可能多次检索）→ qwen3:8b 生成 → SSE 流式回前端。
4. **展示流**：VitePress 静态站点（笔记页面 + 聊天 UI）。

## 四、基座包与实例

通用能力在**基座包** `@minijun/kb-core`、`@minijun/kb-site` 里（作为依赖接入，不含任何个人内容）；
本仓库是一个「实例」——只放内容、配置与数据，单向依赖基座。

| 包 / 目录 | 职责 | 入口 |
|----|------|------|
| `@minijun/kb-core` | RAG 引擎（索引/切分/检索/BM25 混合/重排）、Agent 工具调用、Koa 服务、导入与归档后端、评估框架、CLI | `cli.ts`（命令 `kb`） |
| `@minijun/kb-site` | VitePress 主题、批注 / AI 助手 / 内容管理组件、站点配置派生（`defineSite`） | `config/define-site.mjs` |
| 仓库根（实例） | 内容 `docs/`、配置 `knowledge.config.mjs`、菜单 `menu.config.mjs`、数据 `eval/` 与 `data/` | `knowledge.config.mjs` |
| `resume/` | 简历与面试准备资料（不参与构建） | — |

> 命令行统一走基座 CLI：`kb init | import | index | menu:export | serve | dev | build | preview | eval | eval:baseline | cases:gen | cases:review`；
> 实例里直接 `pnpm kb <子命令>` 即可（`package.json` 只保留 `dev` / `build` / `preview` / `test:rag*` / `chroma:*` / `ollama:*` 等少数脚本）。

> `archive/` 是历史归档，只读，不参与构建。

## 五、技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 文档站 | VitePress 1.6 + Vue 3 | 静态站，自带本地搜索；主题做了扩展 |
| 图表 | Mermaid 11 | 客户端按需加载渲染，支持点击放大 |
| 后端 | Koa + TypeScript | 轻量；`koa-bodyparser` / `@koa/cors` / `@koa/router` |
| RAG 框架 | LangChain.js 0.3 | 用它封装的文本切分器与 Chroma / Embeddings 适配 |
| 向量库 | Chroma（Docker） | 轻量、可持久化到本地目录；可换远程 / 云 |
| 向量模型 | bge-m3（Ollama） | 中文检索质量好 |
| 生成模型 | qwen3:8b（Ollama） | 本地 8B，够用于"检索 + 总结" |
| **混合检索** | 向量 + BM25（加权融合） | 补上纯向量在**精确词**（缩写 / 专名 / 代码标识符）上的短板；零模型成本 |
| 流式 | SSE（`text/event-stream`） | 后端手写 SSE，前端 `fetch` + `ReadableStream` 解析 |

## 六、目录结构（简化）

```
front-end-knowledge-summary/
├── docs/                     # 文档站（内容 + 站点壳）
│   ├── .vitepress/
│   │   ├── config.mts        # 几行：读 menu.config.mjs → 交给 defineSite
│   │   └── theme/index.js    # 几行：扩展 @minijun/kb-site 的主题（Mermaid 等）
│   ├── ai-agent/ javascript/ react/ vue/ ...   # 各类笔记（目录即分类）
│   └── interview-questions/  # 面试题（由脚本从 resume 同步）
├── eval/                     # 评估集：测试题 / 阈值 / 已审核记录
├── data/                     # 索引清单、向量库（data/chroma）、评估基线与历史
├── resume/                   # 简历与面试资料（不参与构建）
├── scripts/                  # deploy-github.sh（部署）、sync-local.mjs（同步 resume 内容）
├── knowledge.config.mjs      # 实例配置：模型 / 集合名 / 展示 / onlyLocal 内容策略
├── menu.config.mjs           # 菜单与侧边栏（可选；有它就完全按它渲染，不兜底）
└── package.json              # 脚本转发（kb / docker / ollama）
```

> 后端与主题的**代码不在本仓库**——它们分别在基座包 `@minijun/kb-core`、`@minijun/kb-site` 里（装好后位于 `node_modules/`）。

## 七、一次问答的完整链路

```mermaid
sequenceDiagram
  participant U as 用户
  participant C as AIChat 组件
  participant S as Koa /api/chat
  participant L as Agent 循环
  participant V as Chroma + bge-m3
  participant M as qwen3:8b

  U->>C: 提问
  C->>S: POST /api/chat（含历史）
  S->>L: 进入循环（最多 3 轮）
  L->>M: 请求（附工具定义）
  M-->>L: 决定调用 search_knowledge
  L->>V: 向量检索 + BM25 关键词检索（融合）
  V-->>L: 相关文档片段
  L->>M: 把片段回传，继续生成
  M-->>L: 流式输出（含 [来源N]）
  L-->>S: token 事件 + 来源
  S-->>C: SSE 逐块推送
  C-->>U: 实时渲染 + 可点击来源
```

要点：

- 模型**自己决定**要不要检索、检索几次（Function Calling），不是硬编码"先检索再回答"。
- 最多 3 轮循环，防止模型一直调工具兜圈子。
- 回答里的 `[来源1]` 编号由工具结果提供，前端渲染成可点击标签。

## 八、怎么跑起来

```bash
# 1. 依赖
pnpm install

# 2. 模型（首次，共约 6.5GB）
pnpm ollama:pull          # 按配置拉取聊天 + 向量模型

# 3. 向量库 + 索引
pnpm chroma:start         # Docker 启动 Chroma
pnpm kb index            # 增量更新索引（文档改动后跑，只处理变更的文件）

# 4. 启动
pnpm dev                  # 前后端一起（docs 5173 / server 3000）
```

访问 `http://localhost:5173`，首页会自动跳到 `/ai-agent/`，右下角是 AI 助手。

### 常用命令

| 命令 | 作用 |
|------|------|
| `pnpm kb dev` / `pnpm kb serve` | 启动全部（文档 + API）/ 只启动 API |
| `pnpm build` | 构建文档站（默认带 `BASE_PATH=/knowledge/`） |
| `pnpm preview` | 预览构建产物（同样带 base） |
| `pnpm kb index` | 增量更新向量索引（只处理变更的文件） |
| `pnpm kb index --full` | 全量重建索引（首次或需要重建时） |
| `kb eval` | 跑检索质量评估 |

## 九、接下来读什么

- 想了解**站点怎么配置、怎么部署** → [02 · 文档站（docs）](./02-docs-site.md)
- 想了解**索引和检索怎么做** → [03 · 后端与 RAG 检索](./03-server-rag.md)
- 想了解**问答链路和流式** → [04 · Agent 与流式对话](./04-agent-chat.md)
- 想了解**为什么这么设计、踩过什么坑** → [05 · 设计决策与踩坑](./05-decisions.md)

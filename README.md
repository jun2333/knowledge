# 前端知识库

> 基于 VitePress 的前端知识体系 + AI RAG 智能问答（全本地运行）

## 项目结构

```
front-end-knowledge-summary/
├── knowledge.config.mjs       # ★ 实例配置（内容目录 / 模型 / 集合名 / 导航…，唯一入口）
├── docs/                      # 内容 + 站点壳（VitePress）
│   ├── .vitepress/
│   │   ├── config.mts         # 几行：defineSite(...)
│   │   ├── theme/index.js     # 一行：再导出 @kb/site 的主题
│   │   └── sidebar.manual.mts # 本实例精修的 sidebar（个人）
│   ├── getting-started/       # 快速上手（随基座分发）
│   ├── ai-agent/ react/ vue/  # 你的知识内容（目录即分类）
│   └── ...
├── eval/                      # 评估集（测试集 / 阈值 / 已审核记录）
├── data/                      # 本地数据产物（向量库 / 索引清单 / 评估历史与基线）
├── scripts/                   # 个人脚本（简历同步、部署）
├── archive/  resume/          # 个人内容（不参与构建）
├── package.json               # 实例依赖：@kb/core、@kb/site
└── pnpm-workspace.yaml
```

> **基座与实例分离**：通用能力在独立的基座包 `@kb/core`、`@kb/site` 里（零个人内容）；
> 本仓库是「一个实例」，只放内容、配置与数据，单向依赖基座。

## 快速开始

### 前置条件

- **Node.js** >= 20.6
- **pnpm** >= 9
- **Docker**（运行 Chroma 向量数据库）
- **Ollama**（本地运行 AI 模型）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动 Ollama 并下载模型

```bash
# 确保 Ollama 服务已启动（安装后会自动运行，也可手动启动）
ollama serve

# 下载聊天模型和向量模型（首次需要，共约 6.5GB，需等待几分钟）
pnpm ollama:pull-chat    # qwen3:8b，约 5.2GB
pnpm ollama:pull-embed   # bge-m3，约 1.2GB
```

### 3. 启动服务

```bash
# 启动 Chroma 向量数据库（Docker）
pnpm chroma:start

# 构建向量索引（首次或文档更新后执行；默认增量，只处理变更的文件）
pnpm kb index

# 启动前后端开发服务
pnpm dev
```

访问 http://localhost:5173

### 常用命令

```bash
# 开发
pnpm dev               # 启动前后端开发服务
pnpm kb serve          # 只启动后端 API
pnpm build             # 构建文档生产版本（带 BASE_PATH）
pnpm preview           # 预览构建产物

# 向量索引
pnpm kb index          # 增量更新索引（只处理内容变更的文件，推荐）
pnpm kb index --full   # 全量重建索引（首次或需要重建时）

# 检索质量评估（详见下方）
pnpm test:rag           # 检索评估 + 阈值门禁（约 30 秒）
pnpm test:rag:full      # 追加生成层评估（约 15 分钟）
pnpm test:rag:baseline  # 把当前成绩固化为基线

# 评估集维护
pnpm kb cases:gen      # LLM 生成评估题初稿（--limit N 限量）
pnpm kb cases:review   # 自动筛出可疑题目

# 向量库 / 模型
pnpm chroma:start      # 启动 Chroma（Docker）
pnpm chroma:stop       # 停止 Chroma
pnpm ollama:pull-chat  # 下载聊天模型（qwen3:8b）
pnpm ollama:pull-embed # 下载向量模型（bge-m3）
pnpm ollama:stop       # 停掉模型释放内存
ollama ps / ollama list # 查看运行中 / 已下载的模型
```

> 只有 `dev` / `build` / `preview`（注入了 `BASE_PATH`）与 `test:rag*`（回归入口）保留为 npm 脚本；
> 其余都是基座 CLI 的子命令，直接 `pnpm kb <子命令>` 即可（`pnpm kb` 看全部）。

## AI 知识问答

右下角 AI 助手按钮，基于 RAG（检索增强生成），**全部本地运行，无需联网**：

1. 用户提问 → 模型判断是否需要查知识库
2. **Agent 工具调用**：按需调用 `search_knowledge` 检索片段，或 `get_doc_content` 读全文（可多轮）
3. 检索到的片段作为依据 → 本地 LLM（qwen3:8b）生成回答
4. SSE 流式返回，句末标注 `[来源N]`，可点击核对原文

为了减少幻觉与"假引用"，做了几层约束：**没有检索到来源时禁止标注引用**、检索不到就如实说"没找到"，前端还会过滤掉无效的来源编号。

左下角批注按钮，支持选中文本添加批注、管理所有批注。

## 检索质量评估

改检索逻辑或 prompt 后，跑一条命令就能确认有没有把质量改退化：

- **检索层**（250 题，按主题分层）：`Hit@5` / `Hit@1` / `Recall@5` / `MRR`
- **生成层**（10 题，含"知识库外"负例）：引用准确性、忠实度、完整性（本地 LLM 打分）
- **阈值门禁**：指标跌破底线即非零退出；每次结果留档，输出"较上次 / 较基线"变化

```bash
pnpm test:rag          # 日常快检（~30 秒）
pnpm test:rag:full     # 大改动后跑全量（~15 分钟）
pnpm test:rag:baseline # 认可某次结果时，固化为新基线
```

> 设计细节见 `docs/project-architecture/06-evaluation.md`。评估集审核流程见 `server/eval/REVIEW-PLAYBOOK.md`。

## 实例配置与基座化

本项目既是「个人知识库实例」，也是一份可复用的「基座」——任何人都能用它搭自己的知识库。

### 实例配置（唯一入口）

内容目录、模型、向量集合等全部集中在根目录 `knowledge.config.mjs`：

```js
export default {
  name: 'my-knowledge',
  contentRoot: './docs',        // 内容目录；支持绝对路径（可放到仓库外）
  collectionName: 'my_kb',      // 向量集合名（一实例一库）
  dataDir: './data',            // 索引清单 / 向量库 / 评估历史
  evalDir: './eval',            // 评估集 / 阈值
  models: { chat: 'qwen3:8b', embedding: 'bge-m3' },
  // ...
}
```

换一份内容只需改这一份配置。**内容目录支持绝对路径**，因此可以把内容放在仓库外部的目录里。

### 默认本地，可切远程

模型与向量库**默认全部走本地**（Ollama + Chroma），也可以指向远程服务——密钥只从环境变量读，不写进配置：

```js
models: {
  baseUrl: 'http://localhost:11434/v1',   // 本地默认
  apiKeyEnv: 'OPENAI_API_KEY',            // 远程时 Key 从这个环境变量读
  chat: 'qwen3:8b',
  embedding: 'bge-m3',
  // 远程示例：
  // chat: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  // embedding: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'BAAI/bge-m3', apiKeyEnv: 'SILICONFLOW_API_KEY' },
},

chroma: {
  host: 'localhost', port: 8000,          // 本地默认
  // 远程 / 云示例：url: 'https://xxx.chromadb.cloud', tokenEnv: 'CHROMA_TOKEN', tenant: '…', database: '…'
},
```

- 聊天模型走**任意 OpenAI 兼容接口**（DeepSeek / 硅基流动 / OpenAI…）；向量模型同理
- 本地 Ollama 会自动走原生 `/api/chat`（可用 `think:false` 提速）；远程则走标准 `chat.completions`
- 向量库远程时填 `url`（http/https），云端用 `tokenEnv` 读 token，支持 `tenant` / `database`

**顶部导航（nav）是「仅本地」的唯一来源**——本地 / 线上共用这一份。给任一项（分组或单项）加 `onlyLocal`，它就会**线上隐藏**，并让**其路径被排除出编译**（`srcExclude`）、sidebar 与死链检查。路径自动识别目录 / 文件，`.md` 可省略：

```js
site: {
  nav: [
    { text: 'AI Agent', link: '/ai-agent/' },
    { text: '算法', link: '/algorithms/basic', onlyLocal: 'algorithms' },            // 整个目录
    { text: 'Service', link: '/service/roadmap', onlyLocal: 'service/roadmap.md' }, // 单个文件
    { text: '个人记录', onlyLocal: ['books', 'resume'], items: [ /* … */ ] },        // 多项
  ],
}
```

过滤后若某分组**只剩 1 项**，该项会自动提到顶层；`site.nav` 留空则按内容目录自动生成。

### 搭一个自己的知识库

脚手架是基座能力，可生成一个全新的知识库实例（不复制任何个人内容）：

```bash
pnpm create:kb my-kb                                   # 交互式
pnpm create:kb my-kb --yes --name "我的知识库" --collection my_kb --port 3100  # 非交互
```

脚手架**只生成实例骨架**（不复制基座实现、不剥离个人内容）：`knowledge.config.mjs` + `docs/`（含快速上手与示例文档）
+ `eval/` 示例评估集 + `package.json`（依赖 `@kb/core`、`@kb/site`）。之后：

```bash
cd my-kb && pnpm install
pnpm chroma:start && pnpm kb index && pnpm dev
```

> 脚手架与实例骨架都由基座提供。站点 sidebar 默认按内容目录**自动生成**（`@kb/site` 的能力）；
> 本仓库作为个人实例保留了精修的 sidebar（`docs/.vitepress/sidebar.manual.mts`，由 `site.autoSidebar` 控制是否叠加自动生成）。

## 内容统计

| 分类 | 文档数 |
|------|--------|
| React | 30+ |
| Vue | 20+ |
| 浏览器 / 网络 | 15+ |
| JavaScript | 12+ |
| 服务端（Node / Java / DB） | 45+ |
| AI Agent | 20+ |
| 性能 / 工程化 / CSS | 35+ |
| 算法 / 大前端 / 其他 | 40+ |

**总计**：250+ 篇技术笔记

## 技术栈

- **文档**: VitePress + Mermaid
- **基座**: `@kb/core`（Koa + RAG 引擎 + Agent + 评估 + CLI）、`@kb/site`（VitePress 主题 / 批注 / AI 组件）
- **后端**: Koa + TypeScript
- **向量数据库**: Chroma（Docker，Server 模式）
- **Embedding 模型**: bge-m3（本地 Ollama）
- **LLM**: qwen3:8b（本地 Ollama）
- **RAG**: LangChain.js
- **检索优化**: 按来源去重；Rerank（bge-reranker，默认关闭，见评估结论）
- **评估**: 自建回归测试集 + 阈值门禁
- **包管理**: pnpm workspaces

## License

ISC

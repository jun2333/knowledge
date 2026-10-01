# 前端知识库

> 基于 VitePress 的前端知识体系 + AI RAG 智能问答（全本地运行）

## 项目结构

```
front-end-knowledge-summary/
├── knowledge.config.mjs       # ★ 实例配置（内容目录 / 模型 / 集合名 / 导航…，唯一入口）
├── docs/                      # 内容 + 站点壳（VitePress）
│   ├── .vitepress/
│   │   ├── config.mts         # 几行：defineSite(...)
│   │   ├── theme/index.js     # 一行：再导出 @minijun/kb-site 的主题
│   ├── getting-started/       # 快速上手（随基座分发）
│   ├── ai-agent/ react/ vue/  # 你的知识内容（目录即分类）
│   └── ...
├── eval/                      # 评估集（测试集 / 阈值 / 已审核记录）
├── data/                      # 本地数据产物（向量库 / 索引清单 / 评估历史与基线）
├── scripts/                   # 个人脚本（部署等，不参与构建）
├── archive/                   # 历史归档（不参与构建）
├── package.json               # 实例依赖：@minijun/kb-core、@minijun/kb-site
└── pnpm-workspace.yaml
```

> **基座与实例分离**：通用能力在独立的基座包 `@minijun/kb-core`、`@minijun/kb-site` 里（零个人内容）；
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
pnpm ollama:pull         # 按配置拉取聊天 + 向量模型，缺什么拉什么
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
pnpm ollama:pull       # 按配置下载本地模型（聊天 + 向量，缺什么拉什么）
pnpm ollama:stop       # 停掉模型释放内存
ollama ps / ollama list # 查看运行中 / 已下载的模型
```

> 实例的 `package.json` 只保留少量封装脚本：`dev` / `build` / `preview`（注入 `BASE_PATH`）、
> `index` / `index:full`、`chroma:*` / `ollama:*`、`test:rag*`（回归入口）。
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

- **检索层**（249 题，按主题分层）：`Hit@5` / `Hit@1` / `Recall@5` / `MRR`
- **生成层**（10 题，含"知识库外"负例）：引用准确性、忠实度、完整性（本地 LLM 打分）
- **阈值门禁**：指标跌破底线即非零退出；每次结果留档，输出"较上次 / 较基线"变化

```bash
pnpm test:rag          # 日常快检（~30 秒）
pnpm test:rag:full     # 大改动后跑全量（~15 分钟）
pnpm test:rag:baseline # 认可某次结果时，固化为新基线
```

> 设计细节见 `docs/project-architecture/06-evaluation.md`。评估集审核流程见基座包内的 `eval/REVIEW-PLAYBOOK.md`（装好后位于 `node_modules/@minijun/kb-core/eval/`）。

## 实例配置与基座化

本项目既是「个人知识库实例」，也是一份可复用的「基座」——任何人都能用它搭自己的知识库。

### 实例配置（唯一入口）

内容、索引范围、模型、向量集合等全部集中在根目录 `knowledge.config.mjs`：

```js
export default {
  name: 'my-knowledge',
  collectionName: 'my_kb',      // 向量集合名（一实例一库）
  dataDir: './data',            // 索引清单 / 向量库 / 评估历史
  evalDir: './eval',            // 评估集 / 阈值
  index: { include: ['**/*.md'], exclude: [...] },   // 索引范围（glob）
  models: { baseUrl: 'http://localhost:11434/v1', chat: 'qwen3:8b', embedding: 'bge-m3' },
  // ...
}
```

换一份内容只需改这一份配置。**内容根固定为 `docs/`**（不可配置）——内容与站点共用同一批 Markdown，
不需要另外维护一份语料；把笔记搬进来比指过去更自然（搬迁用站点的导入能力）。

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

### 菜单、侧边栏、仅本地

**默认全部按目录推导**（不用配）：

| 目录 | 结果 |
|---|---|
| `docs/A/` | 菜单里多一项「A」（名字取目录名，`categories` 可改显示名） |
| `docs/A/index.md` | 点菜单进这一页；没有就取 A 里第一篇 |
| 一级目录 | 该目录一份侧边栏，**整棵子树都在里面**（子目录是嵌套分组） |
| 只有 1 条的目录 | 不给侧边栏（一条的导航没意义） |

**想完全接管菜单/侧边栏**（分组、外链、自定义顺序）：跑 `pnpm kb menu:export` 生成 `menu.config.mjs` 再改。
**有它时站点完全按它渲染、不做任何推导** —— 新增文件要跟着改（`pnpm kb menu:export --check` 看差异）；删掉它就回到全自动。

**想让内容"只在本地产出"**（线上不构建、不进菜单/侧边栏）：这是**内容策略**，写在 `knowledge.config.mjs` 的 `site.onlyLocal` 里 —— 与菜单配置解耦：

```js
site: {
  // 相对 docs/ 的路径，目录或文件都行（可省略 .md）
  onlyLocal: ['private', 'drafts', 'notes/scratch.md'],
}
```

线上构建时，链接落在这些路径下的菜单项会自动隐藏（分组空了就移除、只剩 1 项就提到顶层）。

### 搭一个自己的知识库

唯一的路径：**装一个包 → `kb init` → 放内容 → 跑起来**（不复制任何个人内容）：

```bash
mkdir my-kb && cd my-kb
pnpm add @minijun/kb-core        # ① 只装这一个包（提供 kb 命令）
npx kb init --install            # ② 生成实例骨架（注意：用 npx，不是 pnpm）
```

> **② 为什么必须是 `npx`**：`pnpm <脚本>` 执行前会先做一次依赖检查（内部跑 `pnpm install`），
> 而 ① 装进来的依赖里有带 install 脚本的包（`protobufjs`，来自 chromadb），pnpm 默认不执行
> 它们并报 `ERR_PNPM_IGNORED_BUILDS` → 检查失败 → **`kb` 根本没启动**。
> `npx` 只是在 `node_modules/.bin` 里找到 `kb` 执行，不经过这层检查。
> ① 结尾那个报错**可以无视**（包已装好）；等 ② 生成出骨架里的 `pnpm-workspace.yaml`（`allowBuilds`），
> 后续的 `pnpm install` / `pnpm kb xxx` 就都正常了。

`kb init` 生成的是**自包含**的实例骨架：`knowledge.config.mjs` + `docs/`（含首页、示例文档、快速上手）+
`package.json` 脚本；实例真正需要的依赖（`@minijun/kb-core` + `@minijun/kb-site`）由它自动写好，你不用手写包名。之后：

```bash
pnpm chroma:start && pnpm kb index && pnpm dev
```

> 想在本地基座源码上开发 / 调试（不装 npm 上的发布版），加 `--local <基座目录>` 让生成的实例指向本地基座。
>
> 菜单与侧边栏默认按目录推导（一级目录 = 菜单一项 + 一份完整侧边栏，子目录只是嵌套分组）；
> 本仓库用 `menu.config.mjs` **完全接管**（自定义分组、顺序与显示名）—— 有它时站点不再按目录推导，
> 所以**新增页面要跟着改**（`pnpm kb menu:export --check` 看差异），改完还要**重启 `pnpm dev`**。

## 技术栈

- **文档**: VitePress + Mermaid
- **基座**: `@minijun/kb-core`（Koa + RAG 引擎 + Agent + 评估 + CLI）、`@minijun/kb-site`（VitePress 主题 / 批注 / AI 组件）
- **后端**: Koa + TypeScript
- **向量数据库**: Chroma（Docker，Server 模式）
- **Embedding 模型**: bge-m3（本地 Ollama）
- **LLM**: qwen3:8b（本地 Ollama）
- **RAG**: LangChain.js
- **检索优化**: 混合检索（向量 + BM25，默认开启）；结果按来源去重；Rerank（bge-reranker，默认关闭 —— 实测反而变差，见评估结论。想开启要先 `pnpm add @huggingface/transformers`，它默认不装，避免所有人为一个默认关闭的功能拖进原生 ONNX 运行时）
- **评估**: 自建回归测试集 + 阈值门禁
- **包管理**: pnpm workspaces

## License

MIT

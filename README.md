# 前端知识库

> 基于 VitePress 的前端知识体系 + AI RAG 智能问答（全本地运行）

## 项目结构

```
front-end-knowledge-summary/
├── docs/                      # VitePress 文档站点
│   ├── .vitepress/            # 主题、站点配置、AI 聊天组件
│   ├── ai-agent/              # AI Agent 知识（RAG / Function Calling…）
│   ├── react/ vue/ browser/   # 前端各领域笔记
│   ├── javascript/ css/ performance/ engineering/
│   ├── service/               # 服务端（Node / Java / DB / 部署）
│   ├── algorithms/ frontend/  # 算法 / 大前端
│   └── ...                    # 其余分类（含部分"仅本地"内容）
├── server/                    # Koa 后端服务（RAG + Agent）
│   ├── src/
│   │   ├── agent/             # Agent 循环 + 工具（Function Calling）
│   │   ├── rag/               # 索引 / 切分 / 检索 / 重排
│   │   ├── routes/            # API 路由（/api/chat，SSE 流式）
│   │   └── config/            # 统一配置
│   ├── scripts/               # 索引与评估脚本
│   └── eval/                  # 评估数据集与阈值
├── scripts/                   # 部署、面试题同步脚本
├── archive/                   # 历史归档（只读）
├── package.json               # Monorepo 根配置
└── pnpm-workspace.yaml        # pnpm 工作区
```

## 快速开始

### 前置条件

- **Node.js** >= 18
- **pnpm** >= 8
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
pnpm rag:index

# 启动前后端开发服务
pnpm dev
```

访问 http://localhost:5173

### 常用命令

```bash
# 开发
pnpm dev              # 启动前后端开发服务
pnpm dev:docs         # 仅启动文档站点
pnpm dev:server       # 仅启动后端服务
pnpm build            # 构建文档生产版本
pnpm preview          # 预览构建产物

# 向量索引
pnpm chroma:start     # 启动 Chroma（Docker）
pnpm chroma:stop      # 停止 Chroma
pnpm rag:index        # 增量更新索引（只处理内容变更的文件，推荐）
pnpm rag:index:full   # 全量重建索引（首次或需要重建时）

# 检索质量评估（详见下方）
pnpm test:rag         # 检索评估 + 阈值门禁（约 30 秒）
pnpm test:rag:full    # 追加生成层评估（约 15 分钟）
pnpm test:rag:baseline # 把当前成绩固化为基线

# Ollama 模型管理
pnpm ollama:ps        # 查看运行中的模型
pnpm ollama:list      # 查看已下载的模型
pnpm ollama:stop      # 停掉模型释放内存
pnpm ollama:pull-chat # 下载聊天模型（qwen3:8b）
pnpm ollama:pull-embed # 下载向量模型（bge-m3）
```

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

- **检索层**（50 题，按主题分层）：`Hit@5` / `Hit@1` / `Recall@5` / `MRR`
- **生成层**（10 题，含"知识库外"负例）：引用准确性、忠实度、完整性（本地 LLM 打分）
- **阈值门禁**：指标跌破底线即非零退出；每次结果留档，输出"较上次 / 较基线"变化

```bash
pnpm test:rag          # 日常快检（~30 秒）
pnpm test:rag:full     # 大改动后跑全量（~15 分钟）
pnpm test:rag:baseline # 认可某次结果时，固化为新基线
```

> 设计细节见 `docs/project-architecture/06-evaluation.md`。

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

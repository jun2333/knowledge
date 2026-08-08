# 前端知识库

> 基于 VitePress 的前端知识体系 + AI RAG 智能问答（全本地运行）

## 项目结构

```
front-end-knowledge-summary/
├── docs/                    # VitePress 文档站点
│   ├── .vitepress/         # 主题、配置、AI 聊天组件
│   ├── ai-agent/           # AI Agent 知识
│   ├── algorithms/         # 算法
│   ├── books/              # 读书笔记
│   ├── browser/            # 浏览器原理
│   ├── css/                # CSS 布局与特性
│   ├── engineering/        # 工程化
│   ├── frontend/           # 大前端（Hybrid/小程序/原生）
│   ├── guide/              # 写作指南
│   ├── javascript/         # JavaScript 核心
│   ├── misc/               # 杂项
│   ├── mvvm/               # MVVM 架构
│   ├── performance/        # 性能优化
│   ├── react/              # React 原理
│   ├── service/            # 服务端（Node/Koa/Nest/Docker...）
│   ├── sports/             # 运动健康
│   └── vue/                # Vue 原理
├── server/                  # Koa 后端服务（AI RAG）
│   └── src/
│       ├── rag/            # 向量索引、检索
│       ├── routes/         # API 路由
│       └── config/         # 配置
├── archive/                 # 历史归档（只读）
├── package.json             # Monorepo 根配置
├── pnpm-workspace.yaml      # pnpm 工作区
└── .env.example             # 环境变量模板
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

# 下载聊天模型和向量模型（首次需要，共约 5GB，需等待几分钟）
pnpm ollama:pull-chat    # qwen2.5:7b，约 4.7GB
pnpm ollama:pull-embed   # nomic-embed-text，约 274MB
```

### 3. 启动服务

```bash
# 启动 Chroma 向量数据库（Docker）
pnpm chroma:start

# 构建向量索引（首次或文档更新后执行）
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

# 向量数据库
pnpm chroma:start     # 启动 Chroma（Docker）
pnpm chroma:stop      # 停止 Chroma
pnpm rag:index        # 重建向量索引

# Ollama 模型管理
pnpm ollama:ps        # 查看运行中的模型
pnpm ollama:list      # 查看已下载的模型
pnpm ollama:stop      # 停掉模型释放内存
pnpm ollama:pull-chat # 下载聊天模型（qwen2.5:7b）
pnpm ollama:pull-embed # 下载向量模型（nomic-embed-text）
```

## AI 知识问答

右下角 AI 助手按钮，基于 RAG（检索增强生成），**全部本地运行，无需联网**：

1. 用户提问 → Ollama 向量模型将问题转为向量
2. 向量检索 → 在 Chroma 中匹配最相关的文档片段
3. 片段 + 问题 → 发送给本地 LLM（qwen2.5:7b）
4. 流式返回答案，附带参考来源

左下角批注按钮，支持选中文本添加批注、管理所有批注。

## 内容统计

| 分类 | 文档数 |
|------|--------|
| React | 26+ |
| Vue | 20+ |
| 浏览器 | 12+ |
| 算法 | 12+ |
| 读书笔记 | 11+ |
| AI Agent | 15+ |
| 服务端 | 12+ |
| 其他 | 30+ |

**总计**: 130+ 篇技术笔记

## 技术栈

- **文档**: VitePress + Mermaid
- **后端**: Koa + TypeScript
- **向量数据库**: Chroma（Docker）
- **Embedding 模型**: nomic-embed-text（本地 Ollama）
- **LLM**: qwen2.5:7b（本地 Ollama）
- **RAG**: LangChain.js
- **包管理**: pnpm workspaces

## License

ISC

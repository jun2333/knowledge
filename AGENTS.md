# Agent Guidelines

## 语言
- 思考过程和回复用户必须使用中文

## 行为准则
- 遇到不确定的或者不会的必须请示用户，不能猜
- 不要随意提交代码，需要请示用户
- 不要随意删除文件，需要请示用户

## 项目说明
- 这是一个 pnpm Monorepo 项目，包含两个子包：
  - `docs/`：VitePress 知识库文档站点 + AI 聊天 UI 组件
  - `server/`：Koa 后端服务，提供 RAG 向量检索和 AI 聊天 API
- 文档目录：`docs/`
- 后端代码：`server/src/`
- 启动开发服务器：`pnpm dev`（前后端同时启动，文档端口 5173，API 端口 3000）
- 启动 Chroma 数据库：`pnpm chroma:start`（需要 Docker）
- 构建向量索引：`pnpm rag:index`
- 旧版笔记归档在 `archive/` 目录

## 经验与方法

### React 原理探索
- 探索 React 原理时，优先查看本地源码：`/Users/tsuna2751/Documents/Jun/code/react`
- 通过源码验证结论，而不是仅凭记忆或网络资料

### 绘图规范
- 项目中的流程图、架构图等统一使用 **Mermaid** 语法
- 不要让 AI 生成图片来替代 Mermaid 图表
- Mermaid 图表可编辑、可版本管理，便于后续维护

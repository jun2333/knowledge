# Agent Guidelines

## 语言
- 思考过程和回复用户必须使用中文

## 行为准则
- 遇到不确定的或者不会的必须请示用户，不能猜
- 不要随意提交代码，需要请示用户
- 不要随意删除文件，需要请示用户

## 项目说明
- 这是一个 pnpm Monorepo 项目，包含三个子包：
  - `docs/`：VitePress 知识库文档站点 + AI 聊天 UI 组件
  - `server/`：Koa 后端服务，提供 RAG 向量检索和 AI 聊天 API
  - `resume/`：简历与面试资料（不参与构建）
- 文档目录：`docs/`
- 后端代码：`server/src/`；索引与评估脚本：`server/scripts/`；评估数据集：`server/eval/`
- 启动开发服务器：`pnpm dev`（前后端同时启动，文档端口 5173，API 端口 3000）
- 启动 Chroma 数据库：`pnpm chroma:start`（需要 Docker）
- 构建向量索引：`pnpm rag:index`（增量，只处理变更文件）；全量重建用 `pnpm rag:index:full`
- 检索质量评估：`pnpm test:rag`（检索层 + 阈值门禁，约 30 秒）；`pnpm test:rag:full`（追加生成层评估）
- 旧版笔记归档在 `archive/` 目录

## 经验与方法

### 评估集审核（RAG）
- 审核 / 初筛 RAG 评估集时，严格遵循 `server/eval/REVIEW-PLAYBOOK.md` 的流程与判断规则
- 结论只有三种：**保留 / 改标注 / 删除**；判断"文档有没有讲该知识点"**必须 grep 验证，禁止凭语义印象**
- 流程：`rag:gen-cases`（生成初稿）→ 过滤技术目录合并 → `rag:review-cases`（自动筛可疑，A/B 两类）→ 逐条审核修正 → `pnpm test:rag` 验证 + `test:rag:baseline` 固化

### React 原理探索
- 探索 React 原理时，优先查看本地源码：`/Users/tsuna2751/Documents/Jun/code/react`
- 通过源码验证结论，而不是仅凭记忆或网络资料

### 绘图规范
- 项目中的流程图、架构图等统一使用 **Mermaid** 语法
- 不要让 AI 生成图片来替代 Mermaid 图表
- Mermaid 图表可编辑、可版本管理，便于后续维护

# Agent Guidelines

## 语言
- 思考过程和回复用户必须使用中文

## 行为准则
- 遇到不确定的或者不会的必须请示用户，不能猜
- 不要随意提交代码，需要请示用户
- 不要随意删除文件，需要请示用户

## 项目说明
- 本仓库是**一个「知识库实例」**；通用能力在**独立基座仓库** `../kb-base`（本地通过 `link:` 依赖）
  - `@kb/core`：RAG 引擎 + Agent + 评估框架 + CLI（`kb`）→ `../kb-base/packages/core`
  - `@kb/site`：VitePress 主题、批注与 AI 组件、站点配置派生（`defineSite`）→ `../kb-base/packages/site`
- 仓库根 = 实例：内容（`docs/`）+ 配置（`knowledge.config.mjs`）+ 数据（`eval/`、`data/`）
- `resume/`：简历与面试资料（不参与构建）
- **实例配置**：根目录 `knowledge.config.mjs`（内容目录 / 模型 / 向量集合名 / 导航 等，唯一入口）
- **CLI**：`kb index | serve | dev | build | preview | eval | eval:baseline | cases:gen | cases:review`（根 `package.json` 的脚本是其封装）
- 站点壳：`docs/.vitepress/{config.mts,theme/index.js}`（各几行，逻辑都在基座包）；个人精修 sidebar：`docs/.vitepress/sidebar.manual.mts`
- 评估集：`eval/`；索引与评估脚本在基座仓库：`../kb-base/packages/core/src/`
- 脚手架与上手文同步：`pnpm create:kb <目录>`、`pnpm sync:starter`（转发到 `../kb-base/scripts/`）
- 旧版笔记归档在 `archive/` 目录

## 经验与方法

### 评估集审核（RAG）
- 审核 / 初筛 RAG 评估集时，严格遵循 `../kb-base/packages/core/eval/REVIEW-PLAYBOOK.md` 的流程与判断规则
- 结论只有三种：**保留 / 改标注 / 删除**；判断"文档有没有讲该知识点"**必须 grep 验证，禁止凭语义印象**
- 流程：`kb cases:gen`（生成初稿）→ 过滤技术目录合并 → `kb cases:review`（自动筛可疑，A/B 两类）→ 逐条审核修正 → `kb eval` 验证 + `kb eval:baseline` 固化

### React 原理探索
- 探索 React 原理时，优先查看本地的 React 源码仓库（路径因机器而异，按需在本地找一份）
- 通过源码验证结论，而不是仅凭记忆或网络资料

### 绘图规范
- 项目中的流程图、架构图等统一使用 **Mermaid** 语法
- 不要让 AI 生成图片来替代 Mermaid 图表
- Mermaid 图表可编辑、可版本管理，便于后续维护

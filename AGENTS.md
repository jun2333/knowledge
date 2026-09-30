# Agent Guidelines

## 语言
- 思考过程和回复用户必须使用中文

## 行为准则
- 遇到不确定的或者不会的必须请示用户，不能猜
- 不要随意提交代码，需要请示用户
- 不要随意删除文件，需要请示用户

## 项目说明
- 本仓库是**一个「知识库实例」**：内容（`docs/`）+ 配置（`knowledge.config.mjs`）+ 数据（`eval/`、`data/`）
- 通用能力来自两个**基座包**（当普通依赖用即可，不必关心其源码在哪）：
  - `@kb/core`：RAG 引擎 + Agent + 评估框架 + CLI（`kb`）+ 导入/归档后端
  - `@kb/site`：VitePress 主题、批注 / AI 助手 / 内容管理组件、站点配置派生（`defineSite`）
- `resume/`：简历与面试资料（不参与构建）
- **实例配置**：根目录 `knowledge.config.mjs`（模型 / 向量集合名 / 展示 / `onlyLocal` 内容策略 等，唯一入口）
- **内容固定放 `docs/`**（不可配置）：`docs/` 下的目录即分类。已有笔记用 `pnpm kb import <目录>` 导入到 `docs/imported/`（收件箱），再到站点右下角「内容管理」里归档到分类
- **CLI**：`kb init | import | index | menu:export | serve | dev | build | preview | eval | eval:baseline | cases:gen | cases:review`（根 `package.json` 的脚本是其封装）
- 站点壳：`docs/.vitepress/{config.mts,theme/index.js}`（各几行，逻辑都在 `@kb/site`）
- 评估集：`eval/`（测试集 / 阈值 / 已审核记录）
- 上手文：`docs/getting-started/`（`kb init` 时随骨架复制一份，之后就是本实例的内容，可自行修改；要跟上基座新版就手动复制 `node_modules/@kb/core/templates/instance/docs/getting-started/index.md`）
- **菜单与侧边栏**：默认按目录推导（一级目录 = 菜单项；同一层 ≥2 篇页面就有侧边栏）。
  想完全接管 → `pnpm kb menu:export` 生成 `menu.config.mjs`（有它时站点**完全按它渲染**，不兜底）。
- **仅本地内容**：`knowledge.config.mjs` 的 `site.onlyLocal: [...]`（内容策略，与菜单解耦）
- 旧版笔记归档在 `archive/` 目录

## 经验与方法

### 本地开发
- **改了基座代码，基本都要重启 `pnpm dev`** —— 只有客户端组件是例外
  | 改的是什么 | 要不要重启 |
  |---|---|
  | `@kb/site/theme/*.vue`、`theme/composables/*`（客户端组件） | 不用，Vite HMR 自动生效 |
  | `docs/*.md` | 不用，VitePress 自己处理 |
  | `@kb/core/src/**`（后端 Koa 服务） | **要重启** —— `kb dev` 是用 tsx 直接跑 TS，**没有 watch** |
  | `@kb/site/config/*`（`define-site` / `menu` / `sidebar` / `local-only`） | **要重启** |
  | `knowledge.config.mjs` | 不用（它在 VitePress 的监听清单里） |
  | `menu.config.mjs` | **要重启**（不在监听清单里，见下） |
- 判断"是不是进程旧了"：对比新起一个 dev（换个端口）的行为。页面数据可以直接 curl：
  `curl "http://localhost:<port>/index.md?import"` —— 里面是钩子（`transformPageData` 等）加工后的 frontmatter。
  注意 **dev 是客户端渲染**，`curl /` 只拿到 ~600B 空壳，看不到正文，取证要用上面那个地址。

### 评估集审核（RAG）
- 审核 / 初筛 RAG 评估集时，严格遵循 `@kb/core` 里 `eval/REVIEW-PLAYBOOK.md` 的流程与判断规则（装好后在 `node_modules/@kb/core/eval/`）
- 结论只有三种：**保留 / 改标注 / 删除**；判断"文档有没有讲该知识点"**必须 grep 验证，禁止凭语义印象**
- 流程：`kb cases:gen`（生成初稿）→ 过滤技术目录合并 → `kb cases:review`（自动筛可疑，A/B 两类）→ 逐条审核修正 → `kb eval` 验证 + `kb eval:baseline` 固化

### React 原理探索
- 探索 React 原理时，优先查看本地的 React 源码仓库（路径因机器而异，按需在本地找一份）
- 通过源码验证结论，而不是仅凭记忆或网络资料

### 绘图规范
- 项目中的流程图、架构图等统一使用 **Mermaid** 语法
- 不要让 AI 生成图片来替代 Mermaid 图表
- Mermaid 图表可编辑、可版本管理，便于后续维护

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
  - `@minijun/kb-core`：RAG 引擎 + Agent + 评估框架 + CLI（`kb`）+ 导入/归档后端
  - `@minijun/kb-site`：VitePress 主题、批注 / AI 助手 / 内容管理组件、站点配置派生（`defineSite`）
- `docs/` 之外的个人目录（如 `resume/`）与 `archive/`：不参与构建，也不进索引
- **实例配置**：根目录 `knowledge.config.mjs`（模型 / 向量集合名 / 展示 / `onlyLocal` 内容策略 等，唯一入口）
- **内容固定放 `docs/`**（不可配置）：`docs/` 下的目录即分类。已有笔记用 `pnpm kb import <目录>` 导入到 `docs/imported/`（收件箱），再到站点右下角「内容管理」里归档到分类
- **CLI**：`kb init | import | index | menu:export | chroma:start | chroma:stop | ollama:pull | ollama:stop | serve | dev | build | preview | eval | eval:baseline | obs | obs-ui | cases:gen | cases:review`（根 `package.json` 的脚本是其封装）
- 站点壳：`docs/.vitepress/{config.mts,theme/index.js}`（各几行，逻辑都在 `@minijun/kb-site`）
- 评估集：`eval/`（测试集 / 阈值 / 已审核记录）
- 上手文：`docs/getting-started/`（`kb init` 时随骨架复制一份，之后就是本实例的内容，可自行修改；要跟上基座新版就手动复制 `node_modules/@minijun/kb-core/templates/instance/docs/getting-started/index.md`）
- **菜单与侧边栏**：默认按目录推导（一级目录 = 菜单项 + 一份完整侧边栏；子目录只是嵌套分组，不会单独顶掉父侧边栏）。
  想完全接管 → `pnpm kb menu:export` 生成 `menu.config.mjs`（有它时站点**完全按它渲染**，不兜底）。
- **仅本地内容**：`knowledge.config.mjs` 的 `site.onlyLocal: [...]`（内容策略，与菜单解耦）
- 旧版笔记归档在 `archive/` 目录

## 经验与方法

### 本地开发
- **改了基座代码，基本都要重启 `pnpm dev`** —— 只有客户端组件是例外
| 改的是什么 | 要不要重启 |
|---|---|
| `@minijun/kb-site/theme/*.vue`、`theme/composables/*`（客户端组件） | 不用，Vite HMR 自动生效 |
| `docs/*.md` | 不用，VitePress 自己处理 |
| 基座 `packages/core/src/**`（后端 Koa 服务） | **要先在 `kb-base/packages/core` 跑 `pnpm build`，再 `pnpm sync:core`，再重启** —— `kb` 跑的是 `dist/`，不再用 tsx 加载 TS 源码，**没有 watch** |
| 基座的**提示词**（`packages/core/src/prompts/*.md`） | 不用重启 —— 模板按 mtime 现取，改完存盘即生效。但**仍要 build + sync**（提示词是 build 拷进 `dist/prompts/` 的） |
| `@minijun/kb-site/config/*`（`define-site` / `menu` / `sidebar` / `local-only`） | **要重启** |
| `knowledge.config.mjs` | 不用（它在 VitePress 的监听清单里） |
| `menu.config.mjs` | **要重启**（不在监听清单里，见下） |
- **改基座的完整四步**（少一步就白改）：
  1. 在 `kb-base` 改源码
  2. `cd kb-base/packages/core && pnpm build`（**必须 build**：跑的是 `dist/`）
  3. 在本仓库 `pnpm sync:core`（把 `dist/` 同步进 `node_modules`）
  4. 改后端代码要**重启** `pnpm dev`；只改提示词不用
- 判断"是不是进程旧了"：对比新起一个 dev（换个端口）的行为。页面数据可以直接 curl：
  `curl "http://localhost:<port>/index.md?import"` —— 里面是钩子（`transformPageData` 等）加工后的 frontmatter。
  注意 **dev 是客户端渲染**，`curl /` 只拿到 ~600B 空壳，看不到正文，取证要用上面那个地址。
- `pnpm install` **实测不会**冲掉同步进 `node_modules` 的基座改动（实测：装新依赖 + 改 lockfile 后，
  `dist/prompts/generate.md` 仍是本地版本）。但**换基座大版本**（`package.json` 里 `@minijun/kb-core`
  的版本号变了）会重装整个包，那时必须重新 `pnpm sync:core`。

### 评估集审核（RAG）
- 审核 / 初筛 RAG 评估集时，严格遵循 `@minijun/kb-core` 里 `eval/REVIEW-PLAYBOOK.md` 的流程与判断规则（装好后在 `node_modules/@minijun/kb-core/eval/`）
- 结论只有三种：**保留 / 改标注 / 删除**；判断"文档有没有讲该知识点"**必须 grep 验证，禁止凭语义印象**
- 流程：`kb cases:gen`（生成初稿）→ 过滤技术目录合并 → `kb cases:review`（自动筛可疑，A/B 两类）→ 逐条审核修正 → `kb eval` 验证 + `kb eval:baseline` 固化

### 阶段观测（排查各阶段质量用）
- 每次问答结束写一行 JSON 到 `data/logs/qa-YYYY-MM-DD.jsonl`（按天切，单文件超 32MB 滚 `.2/.3`）
- 一行 = 一次问答，内含五个阶段各自的耗时/输入/输出 + **自动检查项**（`checks`）
- **线上问答和评估跑批都写**（`kind` 字段区分：`chat` / `eval`），跑批的记录还带 judge 分数
- **看观测**：`kb obs tail`（最近几条）/ `kb obs show <reqId>`（完整记录）/ `kb obs stats thinking`（分组统计）/ `kb obs checks`（只看待解决问题）
- **看观测（可视化）**：`kb obs-ui` —— **观测台页面**，独立 React 应用（端口 5174，自动起后端 API）。
  总览页给分组对比（thinking on/off 的首字/回答长度差值直接标出来）+ 检查项排行；
  明细页能钻到单条的五阶段耗时、改写前后对比、来源编号表、模型原始输出；
  对比页并排比两组，并**同时给出样本量与噪声带**（差值算不算真差异）。
  统计逻辑与 CLI 共用一份（`observe/stats.ts`），两边数字不会对不上。
- **回答三个问题**：
  - 改写质量 → `question` vs `rewritten` + `prepareRaw`（模型原始输出）
  - thinking 开不开 → `kb obs stats thinking` 对比 `firstTokenMs` / `answerChars` / `no_citation` 率
  - 提示词规则太多 → `prepareAttempts`（模型几次没照格式输出）+ `systemChars`（规则多少的刻度）
- **控制**：`KB_OBSERVE=off` 关闭 / `=full` 不截断（默认 basic）
- **做 A/B**：`KB_THINKING=on|off` 强制覆盖配置的 thinking 开关，同一份题集跑两次即可对比
- **评估跑批的记录**额外带 `run` 字段（并发数 / 提示词指纹 / thinking）——整批共享的变量必须记下来，否则数据没法解释（串行和并发的记录混在一起，噪声带会算出 ±30 秒这种荒谬值）

### 评估门禁：三层判定（别跟随机性对赌）
- 生成阶段 `temperature: 0.7`，实测 10 次跑批忠实度在 **3.7~4.9** 波动（极差 1.2）。用固定绝对阈值判断 = 拿单次结果跟随机波动对赌，**10 次里有 2 次因纯随机失败**
- 现在判三层：
  1. **硬底线**：引用越界必须为 0 —— 这是编号错位，是 bug 不是质量问题，不许随机
  2. **相对基线**：与基线差值不超过**噪声带**（从 `eval-history.jsonl` 的历史跑批算，标准差 × 2）
  3. **看趋势**：连续 3 次都低于基线才报警（单次波动只提示不算失败）
- 跑批时会打印噪声带：`噪声带（历史跑批实测波动，±2σ）：忠实度 ±0.71 | ...`
- ⚠️ **别用单次跑分下结论**。要比较改动前后，至少跑 3 次看趋势
- ⚠️ **并发别开高**：实测并发 2 让 prepare 慢 7.6 倍、20% 的题超时（45s）——不是模型慢，是 Ollama 单实例排队。**默认串行**（`--concurrency 1`），换多实例的机器再调
- ⚠️ **超时 ≠ 格式错误**：观测里分开记（`prepare.timeout` vs `prepare.parse_failed`）——混在一起会把超时误报成"提示词太重"，而"提示词规则太多"恰恰是要排查的核心问题


### React 原理探索
- 探索 React 原理时，优先查看本地的 React 源码仓库（路径因机器而异，按需在本地找一份）
- 通过源码验证结论，而不是仅凭记忆或网络资料

### 绘图规范
- 项目中的流程图、架构图等统一使用 **Mermaid** 语法
- 不要让 AI 生成图片来替代 Mermaid 图表
- Mermaid 图表可编辑、可版本管理，便于后续维护

# agent-cli 技术文档

> 📦 本模块搬运自 [agent-cli](https://gitee.com/jun2333/agent-cli) 仓库的 `docs/`（自研终端 AI Agent，12k 行生产代码 / 15 工具）。
> 以**源仓库为事实来源**；本文为知识库镜像，源文档更新后此处同步。

> 面向**第一次接触本项目的人**：从"这是什么"到"每个模块为什么存在、怎么改才不会炸"。
> 文档语言：正文中文，术语 / API / 标识符保留英文原文。

## 这份文档和另外几份材料的关系

| 材料 | 定位 | 什么时候看 |
|---|---|---|
| [`README.md`](https://gitee.com/jun2333/agent-cli)（根目录） | 项目门面：装、跑、核心特性 | 第一次 clone 下来 |
| **`docs/`（本目录）** | **技术文档：代码与技术细节** | 要读代码 / 要改代码 |
| [`docs/requirements.md`](https://gitee.com/jun2333/agent-cli/blob/main/docs/requirements.md) | 需求基线（FR / AC 编号的权威定义） | 查某个 AC / FR 到底要求什么 |
| [`knowledge/`](https://gitee.com/jun2333/agent-cli/tree/main/knowledge) | 给 AI agent 用的规范、模式、经验教训 | 走 harness 工作流时 |

> `requirements.md` 回答"**要做什么**"，本文档回答"**代码长什么样、为什么这么写**"。
> 本文档大量引用 `FR-x` / `AC-x` / `V-x` / `D-x` 等编号，不清楚时查 [`glossary.md`](./glossary.md)。

## 30 秒速览

- **是什么**：跑在终端里的 AI 编程助手，接本地 **Ollama**；从 0 实现 Agent 运行时（LLM 循环 / 工具调用 / 会话管理 / 自研 TUI）。
- **规模**：生产代码 **12,131 行**（35 个模块）+ 测试 **14,687 行**（**测试比生产代码多**）。
- **技术栈**：Node.js + TypeScript（ESM, strict）；OpenAI SDK（仅用于兼容 Ollama 的 `/v1` 接口）；**TUI 是自研 DECSTBM 渲染层，不用 Ink/React**；Vitest 做单测 + 终端模拟器端到端。
- **15 个内置工具**：`bash` `read` `write` `edit` `list_dir` `glob` `grep` `web_search` `view_image` `read_memory` `append_memory` `write_memory` `ask_user` `bash_output` `kill_task`。

## 新人阅读路线（按顺序）

1. **[`architecture.md`](./architecture.md)** —— 分层、两条主数据流、**10 条硬不变量**。⚠️ 硬不变量是最该先看的：踩了就是大坑。
2. **[`modules.md`](./modules.md)** —— 35 个模块逐一清点：职责、关键 API、依赖、对应测试文件。当作"代码地图"随时回查。
3. **[`mechanisms/`](./mechanisms/tui-rendering)** —— 八大机制的深挖（渲染、agent loop、工具、权限、hook、后台任务、会话、交互原语）。改哪个模块，先看对应的那一篇。
4. **[`testing.md`](./testing.md)** —— 测试策略、`term-sim` 终端模拟器、verify 通道。
5. **[`glossary.md`](./glossary.md)** —— `FR` / `AC` / `V-x` / `D-x` / lesson 术语表。

只想快速上手改代码？至少读完 1 和 2，再读你那块对应的 `mechanisms/` 一篇。

## 文档地图

| 文件 | 内容 |
|---|---|
| [`README.md`](./index.md)（本文件） | 文档入口与阅读路线 |
| [`architecture.md`](./architecture.md) | 分层架构、数据流、目录布局、硬不变量 |
| [`modules.md`](./modules.md) | 模块清单（src/ 全部文件） |
| [`mechanisms/tui-rendering.md`](./mechanisms/tui-rendering.md) | DECSTBM 滚动区、布局唯一公式、高度恒定（V-5） |
| [`mechanisms/agent-loop.md`](./mechanisms/agent-loop.md) | Agent 循环事件契约、流式 tool_calls 累积 |
| [`mechanisms/tools.md`](./mechanisms/tools.md) | 工具注册/执行、输出双阈值截断与单位口径 |
| [`mechanisms/permissions.md`](./mechanisms/permissions.md) | 权限判定、4 模式、项目权限文件与信任、I-3 不变式 |
| [`mechanisms/hooks.md`](./mechanisms/hooks.md) | Hook 4 时机、block / warning 语义 |
| [`mechanisms/background-tasks.md`](./mechanisms/background-tasks.md) | TaskManager、作业级状态、面板与详情 |
| [`mechanisms/session.md`](./mechanisms/session.md) | 会话持久化、workspace 隔离、会话锁 |
| [`mechanisms/interaction.md`](./mechanisms/interaction.md) | 交互原语唯一分派路径（AC-27） |
| [`testing.md`](./testing.md) | 测试策略与基础设施 |
| [`glossary.md`](./glossary.md) | 术语与编号体系 |

## 维护约定（防止文档腐烂）

1. **模块头注释是事实来源**：`src/` 每个文件开头都有一段"为什么这么设计 / 职责边界"的注释。改代码时若动了设计，先改头注释，再同步 [`modules.md`](./modules.md)。
2. **带锚点引用**：本文档尽量给出 `文件:行号` 锚点。行号会漂移，请以符号名（函数名 / 常量名）为准。
3. **漂移检查**：见 [`testing.md`](./testing.md) 末尾的「文档漂移检查」——它比对文档中的模块清单与 `src/` 实际文件，缺一个就报错。
4. **编号体系**：`FR-x` / `AC-x` 定义在 `requirements.md`；`V-x`（用户裁决）与 `D-x`（设计决策）散落在 `requirements.md` 与各阶段 `design.md`，见 [`glossary.md`](./glossary.md)。

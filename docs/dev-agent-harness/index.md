---
title: DevAgent Harness 技术文档
---

# DevAgent Harness 技术文档

> 📦 本模块搬运自 [dev-agent-harness](https://github.com/jun2333/dev-agent-harness) 仓库（自研 AI 开发工作流工具箱，纯 Node.js / 零运行时依赖）。
> 以**源仓库为事实来源**；本文为知识库镜像，源文档更新后此处同步。

> 面向**第一次接触本项目的人**：从"这是什么"到"每个机制为什么这样设计、踩了什么坑"。
> 文档语言：正文中文，术语 / API / 标识符保留英文原文。

## 30 秒速览

- **是什么**：约束 AI 辅助开发流程的通用工具箱。让 AI 按「先计划 → 再实现 → 再验证 → 再审查」推进，不限定语言与领域。
- **规模**：6 种内置工作流 · 4 组通用技能 · JS 约 5.8k 行 / 零运行时依赖。
- **核心主张**：可靠性 = **流程约束 + 精准上下文 + 阶段产出 + 经验闭环**。
- **已被真实采用**：以 git submodule 嵌入 [Agent CLI](https://github.com/jun2333/agent-cli) 开发该项目本身，产出 24 条经验条目 / 2 条模式 / 3 条规范。

## 三个最值得看的设计

如果只有时间读三处，读这三个 —— 它们是本项目区别于「随便写个 prompt 约束 AI」的地方：

| 文档 | 讲什么 | 为什么值得看 |
|---|---|---|
| [`orchestrator-design.md`](./orchestrator-design.md) | **确定性事实程序化，语义判断交给 LLM** | 全局约束「脚本参数禁止 LLM 生成」的完整推导，是"他证机制"的源头 |
| [`workflow-spec.md`](./workflow-spec.md) | 工作流 = 自包含定义（步骤 + 产出要求 + 测试手段） | 理解"工作流"在这里的确切含义 —— 不是有序步骤列表，是含 gate 与验证手段的契约 |
| [`DESIGN.md`](./DESIGN.md) | 四个理念各自对应的实现与数据 | 最完整的一份总览，适合通读 |

## 文档地图

| 文件 | 内容 |
|---|---|
| [`README.md`](./README.md) | 项目门面：理念、架构图、6 种工作流、技能清单、使用方式 |
| [`DESIGN.md`](./DESIGN.md) | 设计文档（1,184 行）：定位、四理念落地、工作流体系、知识库体系、门禁、编排器 |
| [`orchestrator-design.md`](./orchestrator-design.md) | 通用编排器设计（697 行）：状态机、参数来源约束、阶段执行、失败处理 |
| [`workflow-spec.md`](./workflow-spec.md) | 工作流规格：`workflow.yaml` schema、stage 字段、gate、verify.checks |
| [`skill-interface.md`](./skill-interface.md) | Skill 接口规范：通用层与项目层的覆盖优先级、模板继承、写入约束 |
| [`agent-entry.md`](./agent-entry.md)（源文件 `harness.md`） | **Agent 入口文件**（必读）：首次使用怎么初始化、每个阶段做什么 |

## 阅读路线

**想搞懂"这是什么"** → `README.md` 全文（约 10 分钟）

**想搞懂"为什么这样设计"** → `DESIGN.md` → `orchestrator-design.md`（约 1 小时）

**想上手用 / 改工作流** → `workflow-spec.md` → `skill-interface.md` → `agent-entry.md`

## 源仓库信息

| 项 | 值 |
|---|---|
| 仓库 | [github.com/jun2333/dev-agent-harness](https://github.com/jun2333/dev-agent-harness) |
| License | MIT |
| 技术栈 | Node.js ≥ 18，纯 CJS，零运行时依赖（YAML 解析器自研 151 行） |
| 嵌入方式 | `git submodule add <repo-url> .harness` |
| 实测使用方 | [agent-cli](https://github.com/jun2333/agent-cli)（submodule 已挂载 `.harness/`，走工作流 + 门禁开发；该目录仅本地可见） |

## 维护约定（防止文档腐烂）

1. **源仓库为事实来源**：本目录是镜像，**不要直接改这里** —— 改动会在下次同步时被覆盖。要改去源仓库改。
2. **同步方式**：从源仓库对应路径复制：

   ```bash
   SRC=<dev-agent-harness 仓库路径>
   DST=<知识库>/docs/dev-agent-harness
   cp "$SRC/README.md"                "$DST/README.md"
   cp "$SRC/harness.md"               "$DST/agent-entry.md"      # 文件名改了，避免与站点语义混淆
   cp "$SRC/skill-interface.md"       "$DST/skill-interface.md"
   cp "$SRC/docs/workflow-spec.md"    "$DST/workflow-spec.md"
   cp "$SRC/docs/DESIGN.md"           "$DST/DESIGN.md"
   cp "$SRC/docs/orchestrator-design.md" "$DST/orchestrator-design.md"
   ```

3. **唯一的人工编辑**是本页（`index.md`）—— 它承担「源文档没写的导读与映射」，与 agent-cli 的 `index.md` 同理。
4. **文件名映射**：源仓库的 `harness.md` 在本目录叫 `agent-entry.md`（它是 Agent 入口提示词，不是普通说明文档）。

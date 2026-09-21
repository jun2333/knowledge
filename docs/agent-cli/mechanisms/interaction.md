# 机制八：交互原语（`src/interaction.ts` + `src/ui/overlay*.ts`）

> AC-27：**UI 层（权限审批 / Hook 信任）与 LLM 层（`ask_user`）必须走同一实现分派路径**。
> 这一层的存在就是为了守住它。

## 1. 为什么要有分派中枢

交互原语有多个消费者（见下）。如果每个各写一次 `openXxx(cb)` + 回调转 Promise 的胶水，
键位语义、Esc 语义、非交互降级就会各写一遍且必然漂移。所以收敛成一个入口：

```ts
broker.request(spec): Promise<InteractionResult>
```

`spec` 是**要问什么**（数据），`result` 是**用户答了什么**（数据）—— 中间怎么渲染、怎么按键，
全部由 TUI / questions 引擎统一处理。

## 2. 当前消费者（`broker.request` 的全部调用点）

| 消费者 | 调用点 | spec 形态 |
|---|---|---|
| 权限审批 | `index.ts` `createApprovalRequest` | questions 4 选项（bash / edit 分档，V-1 默认高亮"拒绝"） |
| `/mode` 模式选择 | `index.ts` `runModeCommand` | select（固定 4 项，V-5 高度 6 行） |
| 工作区权限信任 | `index.ts`（FR-8） | confirm（默认"不信任"，`forced`） |
| Hook 信任 | `hooks.ts` 经 `requestConfirm` 透传 | confirm（列出全部命令） |
| LLM `ask_user` | 工具实现经 `ctx.interaction` | select / input |

> 历史注：设计时的消费者还包括 `/jobs`，FR-7 入口收敛时已删除。

## 3. spec 形态与结果壳

`InteractionSpec` 四种：`confirm`（是/否）· `select`（单选列表）· `input`（自由文本）· `questions`（1~4 问原生形态）。

- 渲染**只有一套实现**：questions 引擎（`ui/overlay-questions.ts`）。
  旧三形态由 `ui/overlay.ts` 的 `specToQuestions` **折叠**成 questions 规格 —— 调用方零改动。
- 结果回填：`mapAnswer` 把 questions 答案转回旧的 `OverlaySubmit` 兼容壳（`confirm` / `select` / `input`），
  所以消费者拿到的仍是自己熟悉的形状。已知偏差：审批语义以 `index` 表达（0 允许一次 / 1 永远允许或本会话 / 2 拒绝 / 3 拒绝并说明），而非 design 原文的 `value` 字段。

## 4. 降级分支（全部集中在这一个函数里，D9 + V-1）

`InteractionResult = OverlayResult | { kind:'unavailable', reason, message? }`。
`unavailable` 是**快速失败**的降级结果（语义 = "本次交互没有被执行"），两种原因：

| reason | 触发 | 后果 |
|---|---|---|
| `non-interactive` | 无 TUI 或 stdin 非 TTY（D9） | 默认拒绝；单轮模式下写类 / bash 自动拒绝（退出码 2） |
| `forced` | `--yes` 下遇到强制审批规则（危险命令，V-1） | 必须显式 `bypass` 模式（且仍人工确认） |

`--yes` 的自动接受**只作用于非 forced 的普通询问**；`forced`（危险命令 / 工作区信任）不被覆盖 —— 安全优先。

## 5. 直渲 vs broker 两条分发路（V-2）

AC-27 要求**渲染入口唯一**（`ui.openInteractionOverlay`），但分发有两类：

- **broker 路径**：需要"等一个结果"的（审批 / 信任 / `ask_user` / `/mode`）—— `request(spec)` → `createSpecSession` → 挂起 → 结果回填。
- **直渲路径**：纯 UI 选择、不需要回传给 LLM 的（`/model` 两页弹层、任务面板）—— 直接 `createQuestionsSession` / `createPanelSession` 挂到同一入口。

两条路都过唯一渲染入口（代码检索锁在 `interaction.test.ts`），但只有 broker 路径参与 AC-27 的"UI 层与 LLM 层同路径"。

## 6. 分层纪律

`interaction.ts` **不碰 stdin/stdout**（唯一例外：ui 缺失时的 stderr 提示）；UI 通过结构化 `InteractionHost` 注入 ——
单测注入记录型假 host 即可，不必起 TUI。

## 7. 测试

`interaction.test.ts`：唯一入口的代码检索锁、broker 降级分支、spec→questions 折叠往返、结果壳映射。

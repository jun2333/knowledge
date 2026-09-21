# 模块清单

> `src/` 全部 35 个生产模块（共 12,131 行）逐一清点。
> 每个模块文件**开头都有一段"为什么这么设计 / 职责边界"的中文注释** —— 那是比本文更权威的事实来源；
> 本文是索引，改代码时两头都要同步。

图例：**职责** = 它负责什么；**关键导出** = 常用 API；**依赖** = 主要协作方；**测试** = 对应测试文件。

---

## 入口 / 编排

| 模块 | 行 | 职责 | 关键导出 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `index.ts` | 1615 | 程序入口：参数解析、system prompt 组装、**命令表**、斜杠命令、`!` bash 模式、Agent 循环的**事件消费者**、退出收尾编排。也是"唯一接线处"（任务面板/常驻行数据源、权限、Hook 都在这里装配） | `startInteractive` `runTurn` `createShutdown` `createApprovalRequest` `HELP_TEXT` `projectPermissionsWriter` `historyTextOf` `bangContextMessage` | 几乎所有模块 | `index.e2e.test.ts`（2642）`index.noninteractive*.e2e.test.ts` `index.exit-signal.e2e.test.ts` |
| `config.ts` | 35 | 全局配置常量与项目根：`projectRoot = process.cwd()`（工具作用于"启动目录"，同 Claude CLI）；Ollama 地址 / 默认模型 / 各类阈值 | `projectRoot` `config` | — | — |

## Agent 层

| 模块 | 行 | 职责 | 关键导出 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `agent/loop.ts` | 195 | Agent 循环核心：调 LLM 流式接口，**按 index 增量累积被分片的 `tool_calls`**，emit 统一事件契约（`llm_start` / `reasoning` / `token` / `tool_start` / `tool_end` / `error`），执行工具并把结果回传下一轮 | `runAgentLoop`（异步生成器） | `tools/` `interaction` `permissions` | `agent/loop.test.ts` |
| `models.ts` | 196 | Ollama 模型清单与能力探测：`ollama list` 无能力字段，故对每个模型再调 `/api/show` 取 `capabilities`；**过滤 embedding 类的唯一判据 = capabilities 不含 `completion`**；探测失败返回 `null` 表示"未知"，此时**保守保留**模型。网络/子进程调用收在可注入的 `ModelsDeps` 里 | `setModelsDeps` `resetModelsDeps` | `config` | `models.test.ts` |

## 工具层（`src/tools/`）

| 模块 | 行 | 职责 | 关键导出 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `tools/index.ts` | 70 | **薄聚合门面**（重构后）：对外只暴露工具层入口，不再内联 schema 与实现 | 聚合导出 | `executor` `registry` | `tools/tools.test.ts` |
| `tools/registry.ts` | 1065 | **15 个工具的唯一定义处**：`meta`(name/description/parameters) + `impl`。含 `bash`（含 `run_in_background`）、`bash_output`、`kill_task`、`ask_user`、memory 三件套、文件四件套、`web_search`、`view_image` | `TOOL_SPECS` `buildDefinitions` `classifyToolResult` | `permissions` `tasks` `interaction` | `tools/tools.test.ts` |
| `tools/executor.ts` | 291 | 工具执行编排：按名称查表 → 权限判定 → Hook `PreToolUse` → 执行 → `PostToolUse` → 输出经 `truncate` 收敛 | `createToolExecutor` | `registry` `permissions` `hooks` `truncate` | `tools/executor.test.ts` |
| `tools/truncate.ts` | 222 | **输出规模口径的唯一实现**（lesson 012）：行数 `countLines()`（按 `\r\n\|\r\|\n` 切分，末尾行尾不额外算一行）、字节数、**双阈值截断**（先按行再按字节）。阈值 / 标注 / "输出 N 行" 三者同源 | `countLines` `measureToolOutput` `truncateToolOutput` `truncateToolResult` | — | `tools/truncate.test.ts` |
| `tools/definitions.baseline.ts` | 279 | **AC-41 基线快照**：重构前（B2 之前）`toolDefinitions` 的真实序列化产出（脚本生成、非人工抄写，附 sha256）。用于断言"重构后 definitions 不变" | 基线常量 | — | `tools/tools.test.ts` |

## 权限 / Hook

| 模块 | 行 | 职责 | 关键导出 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `permissions.ts` | 261 | 权限判定与模式：**判定是纯函数** `decidePermission(meta, args, mode)`（无 IO / 无全局状态），4 种模式 `default`/`acceptEdits`/`plan`/`bypass`；`PermissionController` 持有模式并**按引用**注入 executor（`/mode` 改同一对象，下次工具调用即生效）；会话级授权（`grantSessionEdit` / `grantSessionBash`）不落盘。**I-3 不变式**：`ask && forced` 在任何授权前短路 | `decidePermission` `PermissionController` `nextPermissionMode` `PermissionMode` | — | `permissions.test.ts` |
| `project-permissions.ts` | 199 | **项目级权限文件**（`<仓库根>/.agent-cli/permissions.json`）：仓库根解析（git，非 git 回落 cwd）、三态加载（none/ok/corrupt，损坏仅告警不阻断）、`appendAllowRule` 原子写盘（tmp + rename，立即写）、内容 hash（信任判定用）、`commandFirstWord` 保守首词匹配（**仅绝对路径取 basename**，相对路径拒绝） | `resolveRepoRoot` `permissionsFilePath` `loadProjectPermissions` `appendAllowRule` `permissionsHash` `commandFirstWord` `createPermissionStore` | `hooks` | `project-permissions.test.ts` |
| `hooks.ts` | 481 | Hook 系统：**4 个时机** `PreToolUse`/`PostToolUse`/`UserPromptSubmit`/`Stop`（**不做 `SessionStart`** —— 它会改写已发送内容，违反前缀稳定性）。协议与 Claude Code 同构：stdin 收 JSON，stdout 可回 `{decision:'block', reason}`；失败语义（D33）：`PreToolUse` 非 0/超时 → **阻塞**，其余 → **放行 + 告警**。含项目级 hook 的**信任**判定（hash 写入 user config） | Hook runner `resolveProjectHooksPath` `hooksConfigHash` `trustProjectHooks` `isProjectHooksTrusted` | `project-permissions` | `hooks.test.ts` |

## 后台任务

| 模块 | 行 | 职责 | 关键导出 / 方法 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `tasks.ts` | 715 | `TaskManager`：`spawn('sh -c', detached)` 建进程组（pgid = pid，便于整组回收）；环形内存缓冲（2000 行 / 256KB）+ 落盘 `tasks/<id>.log`；**全事件驱动，不引定时器**（`waitForExit` 复用 `exitWaiters`）。<br>`start(command, {background})` · `kill`(幂等, SIGTERM→SIGKILL) · `killAll` · `waitForExit` · `tailOutput` · `refreshJobStates`(作业级收尾) · `markBackground`(Ctrl+B 转后台) · `forget`/`forgetFinished`(真移除) | `TaskManager` `TaskRecord` `tasksDir` `TASK_ID_PATTERN` | `images` | `tasks.test.ts` |
| `ui/task-panel.ts` | 265 | 任务**面板的纯逻辑**：条目单一形状 + `kind` 标签（**渲染绝不出现 `kind` 分支**，AC-18）；状态徽标/配色映射表；键盘语义（↑↓ / Enter 详情 / `x` 关闭 / `c` 清理）；`canOpenTaskPanel` 是 ↓ 打开面板的**唯一判定处**（纯谓词）。高度冻结 10 行（V-5） | `createTaskPanel` `renderTaskPanel` `handleTaskPanelKey` `entryFromTask` `canOpenTaskPanel` `STATE_BADGE` `TASK_PANEL_HEIGHT` `TaskPanelSource` | `text` `tasks`(类型) | `ui/task-panel.test.ts` |
| `ui/fullscreen.ts` | 136 | 任务**详情全屏视图**（AC-15）：首行头部（状态/id/命令/时长/行数）+ 输出视口；构造接收 `TaskDetailInput` **或读取器函数**（实时模式：每次渲染重读）；默认**贴底跟随最新输出**，手动上滚脱离、回底恢复 | `TaskDetailView` `FullscreenView` `TASK_DETAIL_TAIL_LINES` | `task-panel` `text` | `ui/fullscreen.test.ts` |

## 交互原语（FR-5）

| 模块 | 行 | 职责 | 关键导出 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `interaction.ts` | 260 | **交互原语的分派中枢**（AC-27）：权限审批、`/jobs`、Hook 信任、LLM 的 `ask_user` **四个消费者共用同一实现**。`InteractionBroker` 把"打开 UI → 回调转 Promise"收敛成一处；非交互/`--yes` 下有 4 种降级分支（V-1） | `InteractionBroker` `InteractionSpec` | `ui/tui` `ui/overlay` | `interaction.test.ts` |
| `ui/overlay.ts` | 160 | `InteractionSpec → OverlaySession` 的**纯适配器**：把旧三形态（confirm / select / input）**折叠**成 questions 规格，`questions` 原生形态直接透传；再把 questions 答案回填成旧的 `OverlaySubmit` 兼容壳 | `createSpecSession` `specToQuestions` `mapAnswer` `MAX_OVERLAY_ITEMS` | `overlay-questions` `overlay-session` | `ui/overlay.test.ts` |
| `ui/overlay-questions.ts` | 422 | **通用弹层（questions）引擎 —— 浮层能力的唯一实现**：1~4 问分页、「其他…」内联手输、multiSelect、类型化选项；**高度在生命周期内恒定**（标题创建时折行冻结）；入口处统一净化 spec 文本（安全边界） | `createQuestionsSession` `renderQuestions` `handleQuestionsKey` `questionsHeight` `effectiveOptions` `QuestionsSpec` | `text` `overlay-session` | `ui/overlay-questions.test.ts` |
| `ui/overlay-session.ts` | 91 | 浮层会话契约与约束：`OverlaySession`（id / 冻结 height / render / handleKey / onOpen / onClose）、`assertSessionHeight`（渲染前校验行数恒等于 height）、阻塞型会话判定 `isBlockingSession`（内部 `BLOCKING_SESSION_IDS = {confirm, ask, trust, approval}`） | `OverlaySession` `assertSessionHeight` `isBlockingSession` `OverlayKeyOutcome` | — | `ui/overlay-session.test.ts` |

## UI 层（`src/ui/`）

| 模块 | 行 | 职责 | 关键导出 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `ui/tui.ts` | 2099 | **自研 DECSTBM 终端渲染层**：布局唯一公式（`contentRowsFor` / `reservedRowsFor`）、固定区/滚动区/输入框/常驻行/浮层块绘制、按键路由、粘贴、resize 重排、全屏视图与浮层的宿主、**唯一 `write` 出口** | `TUI` `contentRowsFor` `reservedRowsFor` `TUIHandlers` | 大部分 `ui/*` | `ui/tui.e2e.test.ts`（2642） |
| `ui/input-buffer.ts` | 523 | **输入框缓冲的纯逻辑**：原子数组模型（图片/粘贴占位符是独立元素，**一次 backspace 整体删除**，且图片在消息里的位置与文本位置天然一致）；光标移动、折行、裁剪 | `InputBuffer` | `text` | `ui/input-buffer.test.ts` |
| `ui/status-machine.ts` | 274 | 状态栏的**显式状态机 + 唯一定时器**：迁移表可单测穷举（AC-1）；`Ticker` 惰性启停（idle 必停，AC-4）；动画帧由 elapsed 派生（无内部计数器） | `StatusMachine` `Ticker` `spinnerFrame` `FRAME_INTERVAL_MS`(100) | — | `ui/status-machine.test.ts` |
| `ui/completion-menu.ts` | 228 | 斜杠补全菜单的纯逻辑：候选窗口、过滤后选中重置、`Tab` 填入 / `Enter` 执行 / `Esc` 关闭（不清输入，AC-22）；`prefix` 区分 `/` 与 `!` 历史；高度恒定 | `createCompletionMenu` `renderCompletionMenu` `handleMenuKey` `isCompletionTrigger` `updateQuery` | `text` | `ui/completion-menu.test.ts` |
| `ui/text.ts` | 155 | 终端文本的纯函数工具：显示宽度（中文 2 列）、折行、截断、**`sanitizeForTerminal`（安全净化唯一实现）**、tail、行内 Markdown | `displayWidth` `wrapText` `truncateTo` `tailByWidth` `inlineMarkdown` `sanitizeForTerminal` | — | `ui/tui-format.test.ts` |
| `ui/info-line.ts` | 64 | 输入框下方**常驻 1 行**的渲染：权限模式徽标 + 任务摘要（FR-2） | `renderInfoLine` `MODE_BADGE` | `text` | `ui/info-line.test.ts` |
| `ui/exit-guard.ts` | 67 | `Ctrl+C` 的两段式退出状态机：首次清空输入（并提示后台任务数）、再次退出（AC-38~41）；后台任务**不计入 busy**（V-4） | `ExitGuard` | — | `ui/exit-guard.test.ts` |
| `ui/selector.ts` | 155 | 全屏模态选择器（曾供 `/model` 选模型/等级）⚠️ **当前是死代码**：`/model` 已改为弹层（V-1），生产零调用，`mode:'selector'` 仅测试可达 | `renderSelector` 等 | — | — |

## 命令 / 技能

| 模块 | 行 | 职责 | 关键导出 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `commands.ts` | 163 | 斜杠命令与补全候选的**纯逻辑**：候选从哪来、怎么过滤（`filterCandidates`）、怎么注册源（`CompletionSource`）；`prefix` 区分 `/` 与 `!` 历史源 | `CommandSpec` `CompletionCandidate` `CompletionSource` `filterCandidates` `builtinCandidates` `createBangHistorySource` | `skills` | `commands.test.ts` |
| `skills.ts` | 237 | 技能的**最小发现层**（V-6）：扫描 `~/.agent-cli/skills/` 与 `<项目>/.agent-cli/skills/`，解析 frontmatter `name` 注册为补全候选。**仅发现**，不含索引注入 / `read_skill` / `write_skill`（留给 P4） | 技能发现与候选源 | `commands` | `skills.test.ts` |

## 基础设施

| 模块 | 行 | 职责 | 关键导出 | 依赖 | 测试 |
|---|---:|---|---|---|---|
| `session.ts` | 425 | 会话持久化（**按工作目录隔离** + 会话锁）+ 根提示词 / memory 读写。保存时机：每条用户消息与每次回答后**实时写盘**；不存 system prompt；图片落 `image_ref` 不内联 base64；锁靠 pid 存活探测判过期 | `loadSession` `saveSession` `acquireSessionLock` `releaseSessionLock` `listSessions` `newSessionId` `sessionWorkspaceDir` | `images` | `session.test.ts` |
| `user-config.ts` | 122 | 用户配置持久化（`~/.agent-cli/config.json`）：当前模型、思考等级、`trustedProjects` / `trustedHooks`。**文件不存在/损坏返回 `{}` 不抛**；写入失败静默降级 | `loadUserConfig` `saveUserConfig` `UserConfig` | — | `user-config.test.ts` |
| `images.ts` | 186 | 图片落盘 / data URL 编码 / **路径白名单（安全边界）** / 按数量清理（≤100 张，单图 ≤10MB） | `saveImage` `IMAGE_DIR_NAME` 白名单 | `config` | `images.test.ts` |
| `clipboard.ts` | 212 | macOS 剪贴板取图 / 取文本（`Ctrl+V` 直投图片）：优先 `pngpaste`，降级 `osascript`；失败区分 `unavailable` / 空 / 非图片三种语义；依赖可注入（`setClipboardDeps`）以便单测 | `readClipboardImage` `readClipboardText` `classifyFailure` `setClipboardDeps` | `images` | `clipboard.test.ts` |
| `editor.ts` | 103 | `Ctrl+G` 外部编辑器撰写提示词：当前输入 → 临时 md → `$EDITOR`（其次 `$VISUAL`，缺省 `code --wait`）等待退出 → 读回 → 删临时文件；文件名带随机后缀避免同毫秒碰撞 | `editInExternalEditor` | `config` | `editor.test.ts` |

## 测试基础设施

| 模块 | 行 | 职责 |
|---|---:|---|
| `testing/term-sim.ts` | 160 | **ANSI 终端模拟器**：解析 CSI（光标定位 / erase / DECSTBM 滚动区 / 清屏清历史），维护屏幕字符矩阵 + scrollback，支持 resize / 宽字符（中文 2 列）/ wrap-pending / 滚动区滚动。让 TUI 的"画面"可被断言 —— 见 [`testing.md`](./testing.md)。 |

---

## 附：规模与分布

```
生产代码 12,131 行 / 35 模块
测试代码 14,687 行（> 生产代码）

最大模块：ui/tui.ts 2099 · index.ts 1615 · tools/registry.ts 1065 · tasks.ts 715 · ui/input-buffer.ts 523
```

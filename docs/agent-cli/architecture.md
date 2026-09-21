# 架构总览

> 读代码前的地图。看完你应该能回答：一个按键从按下到产生 LLM 回答，经过了哪些模块；
> 以及哪些约束是**不能碰**的。

## 1. 分层

```
┌──────────────────────────────────────────────────────────────┐
│ 入口 / 编排      index.ts (1615)                              │
│   参数解析 · system prompt 组装 · 命令表 · ! 模式 · 退出收尾    │
└──────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ Agent 层      │  │ 交互原语层        │  │ UI 层（自研 TUI）   │
│ agent/loop.ts │  │ interaction.ts   │  │ ui/tui.ts (2099)   │
│ models.ts     │  │ ui/overlay*.ts   │  │ input-buffer.ts    │
└───────┬───────┘  └────────┬─────────┘  │ status-machine.ts  │
        │                   │            │ task-panel/fullscreen│
        ▼                   ▼            │ completion-menu …   │
┌─────────────────────────────────────┐   └────────────────────┘
│ 工具层   tools/index.ts（门面）      │
│   registry.ts(1065, 15 个工具)      │
│   executor.ts · truncate.ts         │
└───────────┬─────────────────────────┘
            ▼
┌──────────────────────────────────────────────────────────────┐
│ 横切能力                                                      │
│  权限 permissions.ts · project-permissions.ts                 │
│  Hook   hooks.ts                                              │
│  后台任务 tasks.ts                                            │
└──────────────────────────────────────────────────────────────┘
            ▼
┌──────────────────────────────────────────────────────────────┐
│ 基础设施                                                      │
│  config.ts · session.ts · user-config.ts · images.ts          │
│  clipboard.ts · editor.ts · commands.ts · skills.ts           │
└──────────────────────────────────────────────────────────────┘
```

**分层铁律**（各模块头注释反复强调）：`ui/*`、`commands.ts`、`task-panel.ts` 等**纯逻辑模块不碰 `process.stdin/stdout`**，只把"该画什么 / 状态怎么变"返回给 `tui.ts`，由它统一写终端。这是它们能被 Vitest 直测的前提。

## 2. 两条主数据流

### 流 A：交互输入 → 提交

```
keypress
  → tui.ts 路由（先浮层、再命令键、再普通输入）
  → input-buffer.ts（原子数组模型：图片/粘贴占位符不可被拆开）
  → onEnter(content)
  → index.ts handleSubmit
       ├─ 斜杠命令（commands.ts 的命令表）
       ├─ ! 前缀 → runBangCommand（前台 bash；Ctrl+B 转后台）
       └─ 普通消息 → runTurn → 进入流 B
```

### 流 B：LLM → 工具 → 回传（Agent 循环）

```
runTurn(messages, ui, deps)
  → agent/loop.ts  (stream)
       事件：llm_start · reasoning · token · tool_start · tool_end · error
  → index.ts handle(event)
       ├─ token / reasoning → TUI 渲染（appendToLast / updateThinking）
       └─ tool_start → tools/executor.ts
              ├─ permissions.ts 判定（纯函数 decidePermission）
              │    ├─ 放行 → 执行
              │    ├─ ask   → interaction.ts 弹审批（与 ask_user 同一路径）
              │    └─ forced→ 强制审批（--yes 也拒绝）
              └─ hooks.ts  PreToolUse（可 block）/ PostToolUse
       → 结果经 truncate.ts 双阈值截断 → 作为 tool 消息回传 → 下一轮
  → 无 tool_calls → 结束
```

关键点：流式响应里的 `tool_calls` 是**分片返回**的（函数名与参数被拆成多个 delta），必须按 index 累积拼接后才能解析参数 —— `agent/loop.ts`。

### 流 C：退出收尾

`Ctrl+C`（两次）/ `Ctrl+D` / `/exit` → `ui/exit-guard.ts` 状态机 → `index.ts` 的 `createShutdown`：
`cancelAll → releaseLock → killAll → ui.exit → 打印被终止清单 → bye → exit`。**顺序有 AC 约束，不可调换**。

## 3. 磁盘布局

默认根目录 `~/.agent-cli`（环境变量 `AGENT_CLI_DIR` 可整体覆盖，测试靠它隔离）：

```
~/.agent-cli/
├── config.json          用户配置：当前模型 / 思考等级（/model 写入）
├── prompt.md            用户自定义根提示词（存在则替换内置默认值）
├── memory/memory.md     用户长期记忆（启动时拼进 system prompt）
├── session/
│   └── <workspace-id>/  每个工作目录一个（workspace-id = cwd 的 sha256 前 16 位）
│       ├── session-<unixms>.json   会话消息
│       └── session-<unixms>.lock   会话锁（记录持有进程 pid）
├── images/              粘贴/提交的图片（单图 ≤10MB，按 mtime 保留最新 100 张）
└── tasks/               后台任务日志 <task-id>.log
```

仓库内（**项目级，随仓库走**）：

```
<仓库根>/.agent-cli/
├── permissions.json     项目级 allow 规则（"永远允许"写入，需信任才生效）
└── hooks.json           项目级 Hook 配置（需信任才加载）
```

`<仓库根>` = `resolveRepoRoot(cwd)`（git 仓库取仓库根，**非 git 回落 cwd**）—— 见 `src/project-permissions.ts` 的 `resolveRepoRoot` / `permissionsFilePath`。

> ⚠️ 会话文件**不存 system prompt**：恢复时用当前提示词重新组装，避免提示词改版后旧会话用过期的 system（也保护前缀稳定性，见不变量 1）。
> 图片不内联 base64：写盘前 `stripImages` 换成 `image_ref`，恢复时 `hydrateImages` 还原。

## 4. 十条硬不变量（改代码前必读）

踩中任何一条都是"看起来能跑、实际埋雷"。

| # | 不变量 | 在哪 / 为什么 |
|---|---|---|
| 1 | **前缀稳定性**：system prompt 前部不可改写 | Ollama 支持前缀 KV 缓存，实测同前缀 prefill **8587ms → 192ms（44×）**。易变内容（技能索引、memory、目录树）一律作为**对话消息**追加。断言见 `index.e2e.test.ts` 的 AC-59。也正因如此，Hook **明确不做 `SessionStart`**（它会改写已发送内容）。 |
| 2 | **布局唯一公式** `contentRowsFor` / `reservedRowsFor` | `contentRowsFor(rows, floatingRows) = max(1, rows - INPUT_ROWS(5) - STATUS_ROWS(1) - reservedRowsFor(floatingRows))`；`reservedRowsFor = PERSISTENT_ROWS(1) + max(0, floatingRows)`。**禁止再硬编码 `24-5-1-3`** 之类算术。见 `src/ui/tui.ts:216/225`。 |
| 3 | **浮层高度恒定（V-5）** | 浮层/面板/菜单高度在生命周期内**不能变**；一变就触发整区重建（清屏 + 清 scrollback），是本项目最脆弱的路径。故面板打开时**只刷新既有条目内容、不增删条目**。 |
| 4 | **唯一定时器** | 全项目只有一个 `Ticker`（`status-machine.ts`），帧间隔 `FRAME_INTERVAL_MS = 100`；idle（非 animating）**必须停止**（AC-4）。单个 tick 重绘 ≤3 行（AC-65）。 |
| 5 | **单位口径同源** | 行数只认 `countLines()`、截断只认 `truncateToolOutput()`；阈值、标注、"输出 N 行"三者必须同源（lesson 012），曾因两套计数出过 bug。见 `src/tools/truncate.ts`。 |
| 6 | **不可信文本必须先净化** | 任何外部文本（LLM 输出、工具参数/输出、仓库文件、用户输入、会话文件）进终端前过 `sanitizeForTerminal`，且**只能落在内容边界**（不能落渲染层，否则会剥掉自家样式）。规范见 `knowledge/standards/terminal-output-safety.md`。 |
| 7 | **权限 I-3 不变式** | `ask && forced` 必须在任何授权/豁免判定**之前**短路；危险命令走 `forced`，`--yes` 也不得自动批准。见 `src/permissions.ts`。 |
| 8 | **交互唯一分派路径（AC-27）** | 权限审批、Hook 信任、LLM 的 `ask_user` 走**同一套**交互原语（`interaction.ts` + `ui/overlay*.ts`），不许各写一份胶水。 |
| 9 | **会话锁与 workspace 隔离** | 编辑会话前 `acquireSessionLock`；异常退出残留的锁靠 pid 存活探测判过期并接管。不同工作目录的会话互不干扰。 |
| 10 | **单模型常驻** | 本机 Metal 预算 10.7 GiB 装不下两个 8B 模型 → 视觉能力（`view_image`）与主模型同源；`/model` 切换是改配置而非并行加载。 |

## 5. 几个"为什么这么设计"

- **TUI 自研而不用 Ink/React**：直接用 DECSTBM（`ESC[top;bottom r`）把屏幕切成"固定区 + 可滚动内容区"，流式输出不会顶乱界面，滚动行为更接近原生终端；同时渲染逻辑变成纯数据（行数组）可断言。代价是要自己处理宽字符、wrap-pending、resize 重排。
- **输入框用"原子数组"而非字符串**：需求要求图片/粘贴占位符**一次 backspace 整体删除**，且图片在消息里的位置必须与文本中的位置一致；原子数组让原子性由数据结构天然保证（`src/ui/input-buffer.ts`）。
- **状态机外置**：状态栏此前散落在 `index.ts` 的 6 处 `setStatus` 调用，没有单一状态源；抽成 `status-machine.ts` 后迁移表可单测穷举（AC-1）。
- **工具层做薄门面**：`tools/index.ts` 只聚合；定义与实现集中在 `registry.ts`，执行编排在 `executor.ts`，规模口径在 `truncate.ts`。
- **后台任务用事件驱动**：`tasks.ts` 全部走 `child.on('exit')` / `onChange` 回调，**不引定时器轮询**（`waitForExit` 复用 `exitWaiters`）。

# 机制一：TUI 渲染（自研 DECSTBM + Alt Screen）

> 对应 `src/ui/tui.ts`（2099 行）及 `src/ui/` 下各纯逻辑模块。
> 这是本项目最复杂、也最容易改坏的一块。**改这里之前务必读完"坑与约束"。**

## 1. 为什么自研，不用 Ink/React

需求要的是"上方固定（状态栏 / 输入框）、下方可滚动（内容区）"的布局，且流式输出不能把界面顶乱。
现成方案（Ink/React）走的是"整棵组件树 diff → 重绘"，难以精确控制滚动区。故直接基于两条 ANSI 能力自研：

- **DECSTBM**（`ESC1;{bottom}r`）：把终端的滚动区域限制为第 1..bottom 行。区域内的滚动**只影响区域内**，区域外（状态栏 / 输入框 / 常驻行 / 浮层）固定不动。
- **Alt Screen**（`ESC[?1049h` / `?1049l`）：进入备用屏，退出时原样恢复用户原来的终端内容。

好处是渲染结果退化成**纯数据（行数组）**，可被单测 / 终端模拟器断言 —— 这是本项目"测试代码 > 生产代码"的技术前提。
代价：宽字符（中文 2 列）、wrap-pending、resize 重排都得自己处理。

> ⚠️ 顺序坑：`ALT_SCREEN_EXIT` **之后再清屏**（`src/ui/tui.ts:412` 注释）。顺序反了清的就是 alt screen，退出后主屏会残留垃圾。

## 2. 屏幕分区（1-based 行号）

设 `C = contentRowsFor(rows, floatingRows)`（内容区行数）：

| 行 | 区域 | 说明 |
|---|---|---|
| `1 … C` | **内容区（可滚动）** | 会话消息 / 工具行 / 思考区 / 错误。受 DECSTBM 管辖 |
| `C+1` | 状态栏 | `statusRow()` |
| `C+2` | 输入框上边框 | `inputTopRow()` |
| `C+3 … C+5` | 输入内容窗口（3 行） | `inputContentRow(i)`；多行输入在此窗口内滚动 |
| `C+6` | 输入框下边框 | `inputBotRow()` |
| `C+7` | **常驻信息区（1 行）** | `reservedFrom()`；权限模式 + 任务摘要（FR-2） |
| `C+8 …` | **浮层块** | `floatingFrom()` = `reservedFrom() + PERSISTENT_ROWS`；V-7 规定浮层在常驻行**下方** |

24 行终端、无浮层时：`C = 17` → 状态栏 18、输入框 19..23、常驻行 24。

## 3. 布局的唯一公式（硬约束）

```ts
// src/ui/tui.ts:216 / 225
reservedRowsFor(floatingRows = 0) = PERSISTENT_ROWS + Math.max(0, floatingRows)
contentRowsFor(rows, floatingRows = 0) =
    Math.max(1, rows - INPUT_ROWS - STATUS_ROWS - reservedRowsFor(floatingRows))
```

常量：`INPUT_ROWS = 5`（上边框+3行内容+下边框）、`INPUT_CONTENT_ROWS = 3`、`STATUS_ROWS = 1`、`PERSISTENT_ROWS = 1`、`INPUT_PREFIX_WIDTH = 4`。

- `contentRowsFor(24)` = **17**；`contentRowsFor(24, 3)` = **14**（1 行常驻 + 3 行浮层）。
- 生产计算（`syncSize`）与测试断言**都只走这两个函数**，杜绝布局口径分叉。**禁止再写 `24 - 5 - 1 - 3` 之类的内联算术。**

## 4. 三种渲染路径

| 路径 | 触发 | 做了什么 |
|---|---|---|
| **整区重绘** `rerender(top, clearScreen)` | resize、关闭浮层、全屏退出后恢复 | 清屏（+清 scrollback）→ 从 `blocks` 重新 `flattenBlocks()` → 逐行写 |
| **增量写** `appendLine(line)` | 流式 token、新增消息 | 内容区末尾追加一行；超出内容区时靠 DECSTBM 让区域自然上滚。**不整区重绘** |
| **固定区/浮层局部写** `renderFixed()` / `paintInfoLine()` / `renderOverlaySession()` / `renderFloatingBlock()` | 状态迁移、tick、按键 | 只 `cursorTo` 到目标行 + `clearLine` + 写一行/若干行 |

**性能/稳定性约束（AC-65）**：一次 tick 最多重绘 **≤3 行**（状态栏 + 运行中工具行 + 常驻行），且不含清屏、不含 DECSTBM 重建。面板打开时会多刷浮层块（实测 12 行），这是已知且记录在案的例外。

## 5. 浮层（overlay）与"高度恒定"（V-5）

浮层（审批 / 信任 / 模型 / 面板 / 补全菜单）统一走 [`ui/overlay-questions.ts` 的 questions 引擎，由 `openInteractionOverlay` 挂到 TUI。

**高度恒定是硬约束**：某个浮层会话的 `height` 在创建时冻结，生命周期内**不能变**。
原因：高度一变就会触发**整区重建**（清屏 + 清 scrollback + 从 blocks 全量重推）—— 这是本项目最脆弱的路径（V-5）。

由此派生出一系列设计：

- 面板打开时**快照条目集合与顺序**，之后**只刷新既有条目的内容**（按 id 匹配），不插入/删除 → 条目数不变 → 高度不变。
- 弹层的**标题在创建时按当时的 `cols` 折行并冻结**（`titleLines`）；渲染时只按当前列宽逐行截断，**不再二次折行** → 任意列宽下行数都等于 `height`，`assertSessionHeight` 恒成立。
- 二次确认、输入框态等子状态都**复用同一行**（提示行 / 确认行），绝不新增行。

## 6. 输入框

- 模型：`ui/input-buffer.ts` 的**原子数组**（不是字符串）。图片 / 粘贴占位符是独立元素 → 一次 backspace 整体删除；且图片在消息 content 里的位置与文本位置天然一致。
- 渲染：`inputLineTexts()` 画 3 行；光标处字符反色（`INVERSE`）。
- `!` 模式（FR-6）：整行高亮（提示符换黄色 `!`、文本包 YELLOW），**只改行内容不改行数与布局公式**。
- 可用列宽 `inputTextCols() = cols - INPUT_PREFIX_WIDTH - 2`（末尾留 1 列，**避免写到最后一列触发终端自动换行**撑破固定布局）。

## 7. 状态栏与唯一定时器

`ui/status-machine.ts`：显式状态机 + `Ticker`。

- 迁移表可单测穷举（7×8 = 56 格全有定义）。
- `FRAME_INTERVAL_MS = 100`；动画帧由 `elapsedMs` 派生（**无内部帧计数器** → 同一 `now` 必得同一渲染结果）。
- `applyStatus()` 依据 `view.animating` **启停唯一定时器**：idle 必停（AC-4）。`isActive` 可内省，便于断言"零定时器"。
- ⚠️ 全屏任务详情打开时 ticker **强制保持运行**（内容实时），关闭时恢复常态策略 —— 见下方"全屏视图"。

## 8. 常驻信息区（FR-2）

`ui/info-line.ts` 渲染输入框下方那 1 行：权限模式徽标 + 任务摘要（运行中 N / 共 N）。
数据源由 `index.ts` **唯一接线**（`setTaskSummarySource`），每次渲染重读；任务状态变化经 `tasks.onChange` 事件驱动刷新（**不轮询**）。

## 9. resize

`onResize()`：先 `syncSize()`（重算 cols/rows/contentRows）→ `setScrollRegion()`（重建 DECSTBM）→ 若在浮层/全屏则只重绘它，否则整区重绘（清屏 + 清 scrollback，消除终端 reflow 残影）。

> ⚠️ 测试里模拟 resize 时：必须**先 `term.resize()` 扩展屏幕**再触发 `onResize`（`testing-rules`）。

## 10. 全屏视图（任务详情）

`ui/fullscreen.ts` 的 `TaskDetailView`：接管整屏（清屏 + 逐行写满 `rows` 行）。

- **实时**：构造可接收**读取器函数**（而非快照），每次渲染重读状态 / 命令 / 尾部输出。
- **跟随**：默认贴底显示最新输出；手动上滚脱离跟随，滚回底部自动恢复。
- **只在内容变化时才重绘**（`lastFullscreenFrame` 帧缓存）——否则 100ms 的 tick 会整屏反复清屏重写，观感就是疯狂闪烁。
- 打开期间 ticker 强制运行，关闭时按 `animating` 恢复。

⚠️ 全屏期间不要调用会写固定区的方法（`renderStatus` / `paintInfoLine`）——全屏已接管整屏，写固定区会覆盖全屏内容。

## 11. 坑与约束清单（改这里前必读）

1. **不能碰**的唯一公式、高度恒定、tick 预算、Alt Screen 清屏顺序 —— 见上文各处。
2. **宽字符**：中文/全角按 2 列。`displayWidth()` 是唯一实现；`truncateTo()` 是唯一截断实现（它**原样保留 ANSI 转义序列且不占宽度**）。
3. **pending wrap**：把内容写到行末最后一列会让终端进入"待换行"状态，下一次写可能触发换行/滚动。故各处都预留 1 列（`inputTextCols` 减 2、`info-line` 等）。
4. **不可信文本必须先净化**（`sanitizeForTerminal`），且**只能落在内容边界**（如 spec / entry 创建处），**不能落渲染层** —— 渲染层收到的是"样式 + 内容"拼接串，整行净化会剥掉自家高亮。规范见 `knowledge/standards/terminal-output-safety.md`。
5. **纯逻辑分层**：`ui/*` 里除 `tui.ts` 外都不碰 `process.stdin/stdout`，只返回"该画什么 / 状态怎么变"。新增 UI 模块必须遵守，否则无法单测。
6. **`ui/selector.ts` 是死代码**：`/model` 已改弹层（V-1），`mode:'selector'` 仅测试可达。不要照着它写新代码。

## 12. 怎么测

- **纯逻辑**：`input-buffer` / `status-machine` / `overlay-questions` / `task-panel` / `completion-menu` / `text` 各自有 vitest 单测。
- **端到端**：`src/testing/term-sim.ts` 模拟终端（解析 CSI、维护屏幕矩阵 + scrollback、支持宽字符与滚动区），驱动真实 `TUI` 后断言"屏幕内容"与"原始写入串"。详见 [`testing.md`](../testing.md)。

> 断言技巧：TermSim 只解析部分 CSI（`H/G/K/J/r`），**SGR（颜色）会被吞掉**。要断言颜色/不可见序列，得看测试里收集的 `rawWrites`（原始写入串）。

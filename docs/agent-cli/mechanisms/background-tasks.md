# 机制六：后台任务（TaskManager / 面板 / 详情）

> 对应 `src/tasks.ts`（715 行）、`src/ui/task-panel.ts`、`src/ui/fullscreen.ts`，
> 以及 `index.ts` 的 `runBangCommand`（`!` 模式）与工具层 `bash(run_in_background)`。

## 1. 职责边界

- `tasks.ts` 只管：**spawn / 进程组 / 输出采集 / 生命周期**。不碰终端。
- **面板与详情是 `ui/` 的纯逻辑**，通过结构化端口 `TaskPanelSource`（`list` / `tailOutput` / `kill` / 可选 `refreshJobStates` / `forget` / `forgetFinished`）读数据 —— 便于 e2e 注入真实子进程或替身。
- 数据源在 `index.ts` **唯一接线**：`ui.setTaskPanelSource(tasks)`（`TaskManager` 结构上满足该端口）。

## 2. 任务生命周期

```
start(command, {background})
  spawn('sh', ['-c', command], { detached: true, stdio:['ignore','pipe','pipe'] })
  → state = 'running'（pgid = pid，整组可回收）
     │
     ├─ child.on('exit') 且进程组已空 ──────→ 'exited'
     ├─ child.on('exit') 但进程组仍有成员 ──→ 保持 'running'（shellExited = true）
     │        ↑ F2：`cmd &` / nohup 派生的后台进程还在跑，不能标"已结束"
     │          由 refreshJobStates() 在进程组清空后收尾为 'exited'
     └─ kill(id) ─────────────────────────→ 'killed'（幂等：再 kill 返回 alreadyExited）
```

要点：

- **spawn 即返回**（`{taskId, pid, running:true}`），不 await 进程结束。
- task id 形如 `task-<base36 时间>-<base36 序号>`，过白名单 `TASK_ID_PATTERN`（`/^[a-z0-9-]+$/`）—— **按 id 拼路径在结构上不可能**（先查表，未命中即 null）。
- **自然退出（无后台派生）**：`exit` 事件 → 记录 exitCode/signal、`exitedAt`、结束日志流、唤醒等待者、`onChange`。
- **shell 已退但作业还在（F2）**：`isGroupAlive(rec)` 用 `process.kill(-pgid, 0)` 探活；此时 `waitForExit` **照常返回**（`!` 的前台部分已完成），但面板/摘要仍显示"运行中"。收尾靠 `refreshJobStates()`，它挂在**渲染 / 摘要刷新路径**上，**不引入独立定时器**。

## 3. 进程组与回收（AC-13 的核心）

- `detached: true` 使 `sh` 成为**进程组组长**（pgid === pid，已实测）。
- 回收一律 `process.kill(-pgid, signal)` —— **连 `sh -c` 下的孙进程一起收**。
- 顽固组（`trap '' TERM`）：SIGTERM 宽限（`taskKillGraceMs`，默认 2000ms）未退 → **SIGKILL** 再等 1000ms（探针验证过必须靠这一步）。
- shell 已退的作业（F2）：没有新的 `exit` 事件可等 → `kill()` 改为 `waitGroupGone()`（25ms 轮询、有界）。
- `kill()` 幂等：已退出/已终止返回 `{killed:false, alreadyExited:true}` 不抛；未知 id 返回 `null`。
- `killAll()`：只收**本次真的在运行**的任务（已退出的不谎报"已终止"），返回清单供退出时打印（AC-15 的"只剩一行 bye"）。

## 4. 输出采集

- stdout+stderr 合流进 `RingBuffer`：**2000 行 / 256KB** 双阈值（`taskBufferMaxLines` / `taskBufferMaxBytes`），超出丢最旧并记 `droppedLines` / `droppedBytes`。
- 同步落盘 `~/.agent-cli/tasks/<task-id>.log`（`createWriteStream` append）；**日志保留 7 天**（`taskLogRetentionDays`，D18）。
- 落盘流的**异步 open 失败**（目录被并发删/磁盘故障）只以 `'error'` 事件出现 → 处置 = 置空 `rec.stream` 降级为仅内存缓冲（不抛、不影响任务）。
- `bash_output` 工具的增量读取：`readCursor` 游标 + `wakeActivity`（有输出**或**退出时唤醒，`wait_ms` 语义）。

> 行数口径与工具输出截断同源（lesson 012）：`countLines` / 字节阈值必须与 `tools/truncate.ts` 一致。

## 5. `!` bash 模式（FR-6 / AC-28~35）

`index.ts` 的 `runBangCommand`：

1. `tasks.start(command)` —— **前台**（默认 `background: false`），立即开始采集输出。
2. `await Promise.race([tasks.waitForExit(id), detachPromise])` —— 正常等到命令结束；`Ctrl+B` 触发 `detachPromise`。
3. **正常结束**：工具行按 `exitCode` 结算 ✓/✗，输出一次性进内容区，并把 `[本地 shell] …` 作为一条 user 消息注入上下文（AC-29，落盘）。
4. **Ctrl+B 转后台（AC-32）**：`tasks.markBackground(id)`（F1：此后才算"后台任务"进面板）→ 工具行显示 `↗ 已转后台`（**不是 ✗**，任务仍在跑）→ 前台等待解除。
5. busy 语义（V-4）：`!` 执行期间 `setBusy(true, {kind:'bang'})`；**后台任务不计入 busy** —— 否则 `Ctrl+C` 会被 ExitGuard 误判。前台回合运行中则保持 `kind:'turn'` 不清 busy。

补全：`!` 触发的候选来自 `createBangHistorySource`（**仅本会话**成功执行过的命令，不读 `~/.zsh_history`，AC-34/57）。

## 6. LLM 侧：`run_in_background` / `bash_output` / `kill_task`

- `bash(run_in_background: true)` → `tasks.start(cmd, {background: true})`（F1：只有它和 Ctrl+B detach 的才进面板）→ 立即返回 `task_id`。
- **非交互（单轮）模式显式拒绝后台任务**（V-8）：单轮没有统一退出收尾，起后台任务 = 留孤儿进程。返回结构化错误让 LLM 改用前台。
- `bash_output(task_id)`：增量读输出 + `running` 状态；`kill_task(task_id)`：终止。

## 7. 任务面板（FR-3 / AC-13~18）

`ui/task-panel.ts` —— **纯逻辑**，通过 `TaskPanelSource` 读数：

- **面板是"后台任务"视图，不是 TaskManager 的镜像（F1）**：`openTaskPanel` 只快照 `background !== false` 的任务。`!` 前台一次性命令、LLM 前台 bash（走 `execAsync`，根本不是任务）都不出现。
- **快照 + 刷新**：打开时快照条目集合与顺序；之后**只刷新既有条目的内容**（按 id 匹配）—— 条目数不变 ⇒ 高度恒定（V-5）。刷新前先 `refreshJobStates()` 收尾已死的作业。
- **`x` 直接关闭（F5）**：跑着则先 `kill`，然后 `forget(id)` **从管理器真移除** —— 否则重开面板重新快照时它会"复活"。**无二次确认**（用户拍板，推翻原 AC-16 的二次确认设计）。
- **`c` 清理**：移除所有已结束/已终止条目，同样落 `forgetFinished()`。
- 高度冻结 `TASK_PANEL_HEIGHT = 10`（标题 1 + 条目 8 + 提示 1）；条目多靠窗口滚动。
- 渲染**绝不出现 `kind === …` 分支**（AC-18）—— 条目带 `kind` 标签是为将来扩展（如 subagent），新增类型不改渲染代码。

## 8. 任务详情（AC-15）

`ui/fullscreen.ts` 的 `TaskDetailView`：

- 构造接收 `TaskDetailInput` **或读取器函数**（实时模式）：每次渲染重读状态 / 命令 / `tailOutput(id, 1000)`。
- **贴底跟随最新输出**；手动上滚脱离跟随，滚回底部自动恢复。
- 输出以换行结尾时去掉**末尾那一个**空行（否则跟随态会"多滚一行"、底部留白）。
- 全屏打开期间 ticker 强制运行；`renderFullscreen` **只在内容变化时重绘**（`lastFullscreenFrame` 帧缓存）—— 否则 100ms tick 整屏反复清屏重写。

## 9. 坑与约束

1. **"已结束"是作业级语义（F2）**：shell 退出但后代仍在 → 不是结束。反之，命令自己把输出重定向（如 `&> /dev/null`）时详情**就是空的** —— 这是命令行为，不是 bug（详情页有提示行）。
2. **面板条目数不可变**（V-5）：要"增删"只能关掉重开面板（重开时重新快照）。
3. **不引定时器**：输出采集、退出等待、作业收尾全部事件驱动 / 挂在既有渲染路径上。
4. **进程组回收必须整组**：只 kill `sh` 本身会留下孙进程（lesson 018 同族）。
5. **日志流要结算**：`kill()` 里 `settleLogStream()` 有界等待日志流 `close`，否则调用方（如测试的 `rmSync`）与 fd 释放赛跑 → 偶发 `ENOTEMPTY`（lesson 018）。已知残留 W-2：自然退出路径尚未同样结算。

## 10. 测试

- `tasks.test.ts`：真实子进程（`sleep` / `trap '' TERM` / `&` 派生）+ `ps` 复核无孤儿 + 日志落盘 + 作业级状态（F2）+ `forget`。
- `ui/task-panel.test.ts`：渲染 / 键位 / 高度恒定 / 单一形状（AC-18）+ 代码检索锁（渲染无 `kind` 分支）。
- `ui/fullscreen.test.ts`：渲染行数 / 跟随与滚动边界 / 实时重读 / 末尾空行。
- `ui/tui.e2e.test.ts`：真实子进程的 `x` 关闭、`Ctrl+B` 转后台、面板状态同步（含"重开面板不复活"回归）。

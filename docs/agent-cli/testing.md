# 测试策略与基础设施

> 本项目 **测试代码 14,687 行 > 生产代码 12,131 行**。这不是偶然：TUI 的正确性没法靠肉眼验证，
> "测试即规格" 也是各模块能被放心重构的前提。

## 1. 三层验证体系

| 层 | 手段 | 覆盖什么 | 举例 |
|---|---|---|---|
| 纯逻辑单测 | Vitest 直测 | 不碰 stdin/stdout 的模块（分层铁律保证了它们可测） | `status-machine` 迁移表穷举、`truncate` 口径、`permissions` 判定表 |
| **UI 端到端** | `term-sim` 终端模拟器驱动真实 `TUI` | **交互流程**与"终端画面"：流式渲染、浮层、按键、resize、退出 | `tui.e2e.test.ts`（2642 行）、`index.e2e.test.ts` |
| 真实子进程 / 真实 fs | 真 spawn / 真写盘 + `ps` 复核 | 进程组回收、日志落盘、原子写、信任写盘 | `tasks.test.ts`、`project-permissions.test.ts` |

真实 PTY（起 dist 进程手敲）只作**手动冒烟**，不进常规测试（慢、断言繁琐）。

## 2. 怎么跑

```bash
pnpm test              # vitest run（35 文件 / 900+ 用例）
npx tsc --noEmit       # 类型检查
pnpm build             # tsc 编译到 dist/
```

**harness verify 通道**（工作流阶段 gate 只认它）：

```bash
node .harness/tools/verify.js run --workflow feature \
  --output-dir .harness/workspace/{task-id}/test-results \
  --report .harness/workspace/{task-id}/verify/verification-result.json
```

命令来自 `knowledge/verify.config.json`（`build` + `test`），**不允许命令行自选**（他证原则）；
证据落盘 `verification-result.json`，gate 校验只认 `overall_status: passed`。

## 3. `term-sim` 终端模拟器（`src/testing/term-sim.ts`）

进程内驱动真实 `TUI` 并断言"终端画面"：

- 解析 CSI：光标定位（CUP/CHA）、erase、**DECSTBM 滚动区**、清屏 / 清历史；
- 维护**屏幕字符矩阵 + 滚动历史（scrollback）**，支持 resize；
- 宽字符（中文 2 列，第二列占位符自动去除，断言无假空格）、wrap-pending、滚动区滚动。

夹具方式（`tui.e2e.test.ts` 的 beforeEach）：`process.stdout.write` 喂给 TermSim；
stdin 用 EventEmitter 模拟 keypress（`press()` / `type()` 辅助函数）。

### 模拟器注意点（踩过的坑）

1. **resize**：先 `term.resize()` 扩展屏幕，再触发 `onResize`（不要用滚动区指令推断行数）。
2. `\x1b[3J` 清滚动历史 —— 断言 scrollback 时注意它。
3. **键名**：Enter 的 `name` 在真实 PTY 下可能是 `enter` 也可能是 `return`（Ctrl+J 是 `name:'enter'`）——断言/模拟都要兼容。`/` 这类符号键 **`name === undefined`**。
4. **TermSim 只解析部分 CSI（`H/G/K/J/r`），SGR（颜色）会被吞** —— 要断言颜色 / 不可见序列（如 bracketed paste、OSC），得看测试收集的 `rawWrites`（原始写入串）。
5. **断言要"精确 + 负向"**：`toContain('| !')` 对 `| ! echo` 和 `| ! !echo` 都通过，会**把 bug 锁成预期**（真实案例）。用精确串 + `not.toContain(重复特征)`。

## 4. 故障注入反证（lesson 017/021）

"全绿"不等于真实路径可用。关键 AC 用**反证用例**锁死 —— 把实现改坏，测试必须变红：

| AC | 反证方式 |
|---|---|
| AC-8（高度恒定） | 高度若误用"当前页选项数"则 FAIL |
| AC-18（单一形状） | 两条仅 `kind` 不同的条目必须逐字相同 + 代码检索"渲染无 `kind` 分支" |
| AC-51（forced 不变式） | 把 store 提到 `forced` 之前判定 → FAIL |
| AC-41（definitions 基线） | 与重构前序列化快照比对（sha256） |
| AC-59（前缀稳定性） | 连续两轮请求 system+tools 字节逐字一致 |

新增关键行为时问自己：**"如果有人把它改坏，哪条测试会红？"** 答不上来就补一条。

## 5. 生产接线也要锁（lesson 021 / 能力可达性）

"方法有单测" ≠ "生产真的调用了它"。对**接线**类改动，补结构断言（读源码 grep，如 `index.ts` 的 `onChange` 必须含 `refreshTaskPanel`、`openSelector` 必须无调用点）。

## 6. 文档漂移检查（防腐烂）

`docs/modules.md` 的模块清单与 `src/` 实际文件**必须一致**。检查脚本：

```bash
node docs/check-drift.mjs   # 比对文档清单 vs find src -name '*.ts'，不一致 exit 1
```

（清单以 `modules.md` 中 `` `[模块相对路径]` `` 的反引号链接为准；新增 / 删除源文件后同步更新并跑一次。）

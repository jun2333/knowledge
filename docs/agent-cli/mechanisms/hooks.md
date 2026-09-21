# 机制五：Hook 系统（`src/hooks.ts`）

> 与 Claude Code 的 hook 同构（D32/D33）。让用户在工具调用的前后、提示词提交、回答结束时挂自己的 shell 命令。

## 1. 四个时机

| 时机 | 触发点 | 失败语义（D33） |
|---|---|---|
| `PreToolUse` | executor 第 2 步（**早于权限判定**） | 非 0 / 超时 → **阻塞**该工具调用（reason = stderr） |
| `PostToolUse` | executor 第 6 步（真正执行之后） | 非 0 / 超时 → **放行 + 告警** |
| `UserPromptSubmit` | 用户提交提示词 | 非 0 / 超时 → **放行 + 告警** |
| `Stop` | agent 回合结束 | 非 0 / 超时 → **放行 + 告警** |

**明确不做 `SessionStart`**（D32）：它会改写已发送内容，违反 **D23 前缀稳定性硬约束**（见 [`architecture.md`](../architecture.md) 不变量 1）。

## 2. 协议

- **配置**：内联 shell 命令（用户级 `~/.agent-cli/` 或项目级 `.agent-cli/hooks.json`）。
- **输入**：`stdin` 收 `JSON.stringify(payload) + '\n'`（含工具名 / 参数 / 结果 / 耗时等，按时机不同）。
- **输出**：
  - `stdout`：仅 `PreToolUse` 消费，可回 `{decision:'block', reason}` → 阻断工具调用；
  - `stderr`：人读诊断，失败时作为 reason / 告警文案。
- **超时**：`hookTimeoutMs = 10s`（D33：到点 SIGKILL 按失败处理；测试经注入调小做真实超时冒烟）。
- **子进程结算**（lesson 018）：以 `exit` 为结算信号 + 有界 flush 宽限，**不无界等待被孙进程继承的管道**——否则 hook 里 `cmd &` 一挂就把 agent loop 无限挂起。已声明的副作用：hook 里的后台进程不跨调用存活。

## 3. 项目级 hook 与信任（FR-8）

- 项目级配置在 `<仓库根>/.agent-cli/hooks.json`（仓库根解析同权限文件，非 git 回落 cwd）。
- 首次加载弹**信任框**（列出全部命令、默认"拒绝"）；信任按 **内容 hash** 记入 `user-config.trustedHooks[projectRoot]`，hash 变化 → 重新询问。
- 未信任 → 项目级 hook 不加载（用户级不受影响），并有明确提示。
- `--yes` 不自动信任（信任请求带 `forced`，见 [`interaction.md`](./interaction.md)）。

## 4. 失败输出怎么到用户眼前

- `PreToolUse` 阻塞 → executor 返回 `{error: 'Hook 已阻止：…'}` 给 LLM（可继续换策略）。
- 其余时机告警 → `index.ts` 的 `onHookWarning` → `ui.addInfo('[hook] …')`（TUI）/ `stderr`（非交互）。
- 告警文案与权限文件文本一样要过 `sanitizeForTerminal`（内容边界净化，见 [`architecture.md`](../architecture.md) 不变量 6）。

## 5. 测试

`hooks.test.ts`：四时机语义、block/warning、超时（注入短超时真实冒烟）、stdin/stdout 协议、项目级信任、`&` 后台进程不挂起（lesson 018 回归）。

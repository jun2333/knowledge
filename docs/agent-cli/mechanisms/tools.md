# 机制三：工具系统（`src/tools/`）

> 15 个内置工具 + 执行编排 + 输出规模口径。分四个文件，职责刻意分开。

## 1. 文件分工

| 文件 | 职责 |
|---|---|
| `tools/index.ts`（70 行） | **薄门面**：对外聚合导出，不内联任何 schema/实现 |
| `tools/registry.ts`（1065 行） | **15 个工具的唯一定义处**：`meta`（name/description/parameters/`mutating`/`requiresApproval`/`backgroundable`/`output`）+ `impl` |
| `tools/executor.ts`（291 行） | 执行编排：把每条 `ToolSpec` 包成带生命周期的实现（权限 / Hook / 截断 / 生命周期事件） |
| `tools/truncate.ts`（222 行） | **输出规模口径的唯一实现**（行 / 字节 / 双阈值截断） |
| `tools/definitions.baseline.ts` | AC-41 基线快照：重构前 `toolDefinitions` 的真实序列化（脚本生成 + sha256），断言"重构后 definitions 不变" |

## 2. 15 个工具

`bash`（含 `run_in_background`）· `read` · `write` · `edit` · `list_dir` · `glob` · `grep` · `web_search` ·
`view_image` · `read_memory` · `append_memory` · `write_memory` · `ask_user` · `bash_output` · `kill_task`

要点：

- **路径安全**：文件类工具只允许**项目根内**（`config.projectRoot` = 启动目录，白名单语义），防路径穿越。
- **bash**：前台走 `execAsync`（超时 `bashTimeoutMs = 60s`）；`run_in_background: true` 走 `TaskManager`（见 [`background-tasks.md`](./background-tasks.md)），**非交互模式显式拒绝**（V-8）。
- **`ask_user`**：LLM 主动向用户提问 → 走**与权限审批相同的交互路径**（AC-27，见 [`interaction.md`](./interaction.md)）。
- **memory 三件套**：读写 `~/.agent-cli/memory/memory.md`。
- **`view_image`**：预检模型能力（`models.ts`），把本地图片编码进消息（多模态）。

## 3. 执行器的 7 步包装（权限与 Hook 的唯一挂载点）

`createToolExecutor` 把每条 `ToolSpec.impl` 包成（`tools/executor.ts:158-167` 注释原文）：

```
1. emit tool_pre                     ← AC-40 前事件
2. PreToolUse hook                   ← 非 0/超时则直接返回 {error}，不执行 impl（可先拦，避免无谓弹审批）
3. 权限 decidePermission             ← deny 直接返回；ask → requestApproval，拒绝也返回（不中断本轮）
4. spec.impl(args, ctx)              ← 真正执行（异常兜底为 {error} 形状）
5. truncate                          ← 双阈值截断（作用于工具的有效正文）
6. PostToolUse hook                  ← 非阻塞，仅告警
7. emit tool_post                    ← AC-40 后事件
```

三条纪律：

- **pre/post 恒 1:1 成对 emit** —— 包括 hook 阻止与权限拒绝的路径（订阅方要能看到"这次调用被拒了"）。
- **拒绝也要给出明确、可继续的结果**（AC-32/37）：LLM 据此换策略，本轮不中断。
- **`PostToolUse` 只在真正执行之后触发**（被拦住的调用不触发）。

## 4. 输出规模口径（lesson 012，全项目唯一实现）

`tools/truncate.ts`：

- **行** = `countLines()`：按 `\r\n | \r | \n` 切分后的段数，**末尾行尾不额外算一行**；空文本 0 行。
- **字节** = utf8 字节数。
- **双阈值截断**（D19/AC-11）：`toolOutputMaxLines = 1000`、`toolOutputMaxBytes = 50KB`；**只作用于文本**，`ContentPart[]` 的 image 部件豁免（V-4）。
- **三者同源**：截断判定、截断标注（"省略 N 行"）、工具行"输出 N 行"必须用同一实现 —— 曾因两套计数出过 bug，这是 lesson 012 的教训。
- W-3 细节：JSON 信封要先**抽出有效正文**再截断/计数（否则行阈值恒不触发）；截断后 `result.lines` 度量的是**实际交付给 LLM 的内容**。

## 5. 生命周期事件（AC-40）

`executor.on(listener)` 订阅 `tool_pre` / `tool_post`（含 ok / 耗时 / 行数 / 字节）。返回退订函数。
`index.ts` 用它驱动工具行的开始/完成渲染 —— **这是工具行渲染的唯一数据来源**（AC-2 的根因修复）。

## 6. AC-41：definitions 基线

`definitions.baseline.ts` 存着**重构前**`toolDefinitions` 的真实序列化（一次性脚本 dump，附 sha256）。
测试断言"现在的 `buildDefinitions()` 产出与基线一致（B6 起 bash 有一个显式增参除外）"——
防止改工具描述破坏 **prompt 前缀稳定性**（见 [`architecture.md`](../architecture.md) 不变量 1）。

## 7. 测试

`tools/tools.test.ts`（定义基线 / 分类）、`tools/executor.test.ts`（7 步编排、权限与 hook 挂载顺序、pre/post 成对）、`tools/truncate.test.ts`（行/字节口径、双阈值、图片豁免）。

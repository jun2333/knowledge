# 机制四：权限系统（`permissions.ts` + `project-permissions.ts`）

> 两层：**会话内判定**（`permissions.ts`，纯函数 + 模式控制器）与**项目级持久化**（`project-permissions.ts`，落盘 + 信任）。

## 1. 判定是纯函数

```ts
decidePermission(meta, args, mode) → { type: 'allow' | 'deny' | 'ask', reason?, mode? }
```

只读工具元数据 + 参数，**无 IO、无全局状态** —— 所以 AC-31~39 可以直测，不必伪造 LLM 流或起 TUI。

- `allow` → 直接执行
- `deny` → 直接返回拒绝结果（**不弹浮层**），LLM 据此换策略
- `ask` → 走交互审批（[`interaction.md`](./interaction.md)）

## 2. 四种模式（`PermissionMode`）

| 模式 | 语义 |
|---|---|
| `default` | 写类 / bash 一律 `ask`；**非交互下单轮模式自动拒绝**（退出码 2） |
| `acceptEdits` | 文件编辑自动放行；bash 仍 `ask` |
| `plan` | 只读：写类直接 `deny`（AC-34） |
| `bypass` | 全放行 —— 但**危险命令仍走 `forced` 强制审批** |

`Shift+Tab` 循环切换（AC-20，终端不转发 `\x1bZ` 时 `/mode` 兜底）；`PermissionController` **按引用**注入 executor，`/mode` 改的是同一个对象 → 下次工具调用立即生效。状态栏常驻行实时显示当前模式。

## 3. I-3 不变式（安全核心）

**`ask && forced` 必须在任何授权 / 豁免判定之前短路。**

- `forced` 来自**危险命令规则**（`rm -fr` / `rm -rf $HOME` / `/bin/rm` 等正则命中）。
- 效果：`--yes`、`bypass` 模式、项目级 allow 文件**都不能**自动批准危险命令 —— 必须人工确认（默认高亮"拒绝"）。
- 有故障注入反证用例（AC-51）：把 store 提到 `forced` 之前判定会直接 FAIL。

## 4. 审批的 4 选项（AC-21/22）

审批弹层是 questions 引擎的 4 选项（按类型分档）：

- **bash**：允许一次 / **永远允许（写入项目权限文件）** / 拒绝 / 拒绝并说明原因
- **edit**：允许一次 / **本会话总是允许（仅内存）** / 拒绝 / 拒绝并说明原因

按类型分档的原因（AC-24）：bash 影响面大 → 落盘可复用；文件编辑影响面小 → 只本会话，**不落盘**。

## 5. 项目级权限文件（FR-8）

[`project-permissions.ts`：

- **落点**：`<仓库根>/.agent-cli/permissions.json`；仓库根 = `resolveRepoRoot(cwd)`（git 仓库取根，**非 git 回落 cwd**）。
- **三态加载**：`none` / `ok` / `corrupt` —— 损坏只告警（AC-52），**不阻断启动**。
- **写入**：`appendAllowRule` 原子写盘（tmp + rename，**立即写**，AC-53），同 `firstWord` 去重。
- **匹配**：`commandFirstWord(cmd) === rule.firstWord`（**全等**，非前缀 —— `ls` 不命中 `lsblk`，AC-46）。保守规则：env 前缀 / 引号 / shell 元字符一律 `null`；**仅绝对路径取 basename**（`/bin/rm` ≡ `rm` 是设计意图），相对路径（`./ls`、`a/../ls`）一律拒绝 —— 防仓库内同名脚本"借壳"。
- **信任门**：文件内容 hash 存进 `user-config.trustedProjects[repoRoot]`。首次遇到 → 弹**信任框**（默认高亮"不信任"，`--yes` 也不自动信任）；未信任 → 规则不生效（相关命令仍逐条询问）。**hash 变化 → 重新询问**（AC-50，含"永远允许写盘后下次启动再弹信任框"的已知取舍，用户裁决保持现状）。

## 6. 与 Hook / 交互的关系

- 判定发生在 executor 的第 3 步（PreToolUse hook **之后** —— hook 可先拦，避免无谓弹审批），见 [`tools.md`](./tools.md)。
- `ask` 的审批走 `interaction.ts` 的 `requestApproval` → 与 `ask_user` 同一分派路径（AC-27），见 [`interaction.md`](./interaction.md)。

## 7. 测试

`permissions.test.ts`（判定表 / 模式循环 / I-3 反证 / 会话授权）、`project-permissions.test.ts`（路径 / 三态 / 原子写 / hash / 首词表）、`index.e2e.test.ts`（信任框端到端、永远允许立即写盘、`--yes` 不信任）。

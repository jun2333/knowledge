# 机制七：会话持久化（`src/session.ts`）

> 会话 = 一份 JSON 消息数组。这个模块看似简单，但"隔离 / 锁 / 图片 / 不存 system prompt"四个决定都不平凡。

## 1. 磁盘布局

```
~/.agent-cli/                       （AGENT_CLI_DIR 可整体覆盖）
└── session/
    └── <workspace-id>/             每个工作目录一个文件夹
        ├── session-<unixms>.json   会话消息（对话内容）
        └── session-<unixms>.lock   会话锁（记录持有进程 pid）
```

- `<workspace-id>` = **cwd 的 sha256 前 16 位** → 不同目录启动的会话互不干扰。
- `-r` / `/resume`：`listSessions()` 列出当前 workspace 的会话（时间 + 消息数 + 锁状态）。

## 2. 关键设计决定

1. **会话 id 只在内存**：不落盘"当前会话"指针 → 没有退出清空 / 异常残留 / 多进程"当前会话"冲突问题。
2. **实时保存**：每条用户消息、每次回答完成后立即写盘（**不是退出时**）—— 崩溃也不丢。
3. **不存 system prompt**：只存 user / assistant / tool 消息。恢复时由 `index.ts` 用**当前**提示词重新组装 —— 避免提示词改版后旧会话带过期 system，也保护前缀稳定性。
4. **图片不内联 base64**：写盘前 `stripImages` 把 `image_url` 换成自定义 `image_ref`（一张全屏截图可达数 MB，内联会让会话文件膨胀、`listSessions` 的 `JSON.parse` 变慢）；恢复时 `hydrateImages` 重读 `images/` 目录还原成 data URL，文件已失效则降级为文本标记。

## 3. 会话锁

- **编辑会话前** `acquireSessionLock(id)`；正常退出 `releaseSessionLock(id)`。
- **异常退出残留的锁**：锁文件里记录持有进程 pid → 下次用 **pid 存活探测**判定过期并自动接管（不要求用户手删）。
- 锁被他人持有时：`-r` 列表标 `[locked]` 且不可选；直接恢复给出明确提示。

## 4. 配套的用户级文件

| 文件 | 作用 |
|---|---|
| `~/.agent-cli/config.json` | 模型 / 思考等级 / `trustedProjects` / `trustedHooks`（`user-config.ts`；损坏返回 `{}`，写失败静默降级） |
| `~/.agent-cli/prompt.md` | 用户自定义根提示词（存在则**替换**内置默认值） |
| `~/.agent-cli/memory/memory.md` | 用户长期记忆（启动时拼进 system prompt 的**消息尾部**，不改前缀） |

## 5. 测试

`session.test.ts`：workspace 隔离、锁的获取 / 释放 / pid 过期接管、strip/hydrate 图片往返、损坏文件容错。

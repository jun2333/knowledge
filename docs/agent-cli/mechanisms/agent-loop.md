# 机制二：Agent 循环（`src/agent/loop.ts`）

> 195 行的小模块，却是整个项目的"发动机"。它把 LLM 的流式响应变成**事件流**，
> 上层（`index.ts`）消费事件去渲染 / 执行工具 / 回传结果。

## 1. 接口形状

```ts
runAgentLoop({
  messages, definitions, implementations, client,   // OpenAI 兼容 client（指向 Ollama /v1）
  model, maxIterations = 5, signal, think,
}): AsyncGenerator<LoopEvent>
```

`index.ts` 用 `for await (const event of runAgentLoop(...))` 消费。**loop 只发事件，不做 UI** ——
渲染、工具行的 ✓/✗、审批弹窗全在上层。这让它可以被纯单测（mock 一个假流）。

## 2. 事件契约（B1 修正版）

| 事件 | 载荷 | 语义 / 上层动作 |
|---|---|---|
| `status` | `phase: 'llm_start'` | 状态栏迁移 |
| `reasoning` | `content`（增量） | `updateThinking` → 思考面板 |
| `token` | `content`（增量） | `appendToLast` → 正文追加 |
| `tool_start` | `callId` `name` `args` | `transitionStatus(tool_start)` + `beginToolLine`（**开始即渲染**，AC-2） |
| `tool_end` | `ok` `durationMs` `outputLines` `outputBytes` | `endToolLine` 同行原地变完成态（AC-3，D16） |
| `error` | `message` | `showError` + 状态栏 error |

⚠️ 三个曾经踩过的坑（都写进了 `loop.ts` 头注释）：

1. `tool_start` **只 emit 一次**且在 `await fn(args)` **之前**，必带 `callId/name/args` —— 旧实现 emit 两次、第二次不带 name，上层把工具名清成空（AC-2 反例）。
2. `tool_end` 必须存在并携带耗时/行数/字节 —— 否则 "Running tool" 会残留到下一次 `llm_start`。
3. `finish_reason='length'`（长思考 + 图片极易触发）时模型**既无 content 也无 tool_calls** —— 旧实现直接 return，用户只看到"思考着就停了"。现在会发 `error` 提示（"可重试，或先用 /model 降低思考等级"）。

## 3. 流式 `tool_calls` 的增量累积（最容易写错的地方）

OpenAI 兼容流里，`delta.tool_calls` 是**分片**返回的：同一次调用的函数名和参数字符串被拆成多个 delta，
只带 `index`（可能有首片带 `id`）。必须**按 index 累积拼接**，流结束后才能 `JSON.parse` 参数：

```
delta.tool_calls: [{index:0, id, function:{name:'bash'}}]
                  [{index:0, function:{arguments:'{"co'}}]
                  [{index:0, function:{arguments:'mmand":"ls"}'}}]
→ 累积后：{ id, name:'bash', arguments:'{"command":"ls"}' }
```

累积完成后把 assistant 消息（含完整 `tool_calls`）回传 messages，再逐个执行工具。

## 4. 迭代与终止

- `for (turn < maxIterations)`，默认 `config.maxIterations = 5`。
- 每轮：流式收集 → 有 `tool_calls`？→ 执行 + 回传 → 下一轮；无 → 结束生成器。
- 支持 `signal`（用户 Esc 打断 → `AbortController`）。

## 5. 工具执行在哪里

**loop 不自己执行工具**：`tool_start` 事件发出后，由上层（`index.ts`）调用注入的
`implementations[name](args)`（即 `tools/executor.ts` 包装过的实现，含权限 / Hook / 截断，见
[`tools.md`](./tools.md)），完成后 loop 继续发 `tool_end` 并把结果作为 `tool` 消息回传。

> 这个"loop 发事件、上层执行"的拆分是为了让工具执行能弹审批 UI、跑 Hook——
> 这些副作用不属于"解析流式响应"的职责。

## 6. 测试

`agent/loop.test.ts`：注入假 OpenAI client（可控的 chunk 序列），
断言事件序列、tool_calls 分片累积、"静默失败"分支、maxIterations 上限。

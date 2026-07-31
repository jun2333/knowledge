---
title: LLM API 调用基础
date: 2026-07-30
---

# LLM API 调用基础

开发 AI 应用的第一步是学会调用大语言模型的 API。本文以 OpenAI 和 Anthropic 为例，讲解核心概念和调用方式。

## 两大主流 API

| 维度 | OpenAI API | Anthropic API |
|------|-----------|---------------|
| **代表模型** | GPT-4o, GPT-4.1 | Claude 3.5/4 Sonnet, Opus |
| **SDK** | `openai` (npm) | `@anthropic-ai/sdk` (npm) |
| **消息格式** | `role: system/user/assistant` | `role: system/user/assistant` |
| **特色** | 生态最大，工具多 | 长上下文，代码能力强 |

## 核心概念

### Token

LLM 不直接处理文本，而是将文本拆分为 Token（词元）。

```
"Hello, world!" → ["Hello", ",", " world", "!"]  → 4 tokens
"你好世界"       → ["你", "好", "世", "界"]        → 4 tokens
```

**计费规则：**
- 输入 Token（Prompt）和输出 Token（Completion）分开计费
- 输出 Token 通常比输入贵 2-4 倍
- 1000 Token ≈ 750 个英文单词 ≈ 500 个中文字

### 上下文窗口

模型一次能处理的最大 Token 数。

| 模型 | 上下文窗口 |
|------|-----------|
| GPT-4o | 128K |
| GPT-4.1 | 1M |
| Claude Sonnet 4 | 200K |
| Claude Opus 4 | 200K |

**注意：** 上下文窗口包含系统提示 + 对话历史 + 当前输入 + 输出。对话越长，留给输出的空间越少。

### Temperature

控制输出的随机性。

```
temperature = 0    → 确定性最高，相同输入总是相同输出（适合代码生成）
temperature = 0.7  → 平衡（适合对话）
temperature = 1.0  → 随机性最高（适合创意写作）
```

## OpenAI API 调用

### 安装

```bash
npm install openai
```

### 基础调用

```javascript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: '你是一个友好的助手。' },
    { role: 'user', content: '解释一下什么是闭包' },
  ],
  temperature: 0.7,
  max_tokens: 1024,
})

console.log(response.choices[0].message.content)
```

### 流式响应

流式响应让文字逐字输出，用户体验更好。

```javascript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: '写一首关于编程的诗' },
  ],
  stream: true,
})

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content || ''
  process.stdout.write(delta)  // 逐字打印
}
```

### Koa 中实现 SSE 流式转发

```javascript
router.post('/api/chat', async (ctx) => {
  const { message } = ctx.request.body

  ctx.respond = false  // 接管响应
  const res = ctx.res
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: '你是一个技术助手。' },
      { role: 'user', content: message },
    ],
    stream: true,
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`)
    }
  }

  res.write('data: [DONE]\n\n')
  res.end()
})
```

前端用 `EventSource` 或 `fetch` 读取：

```javascript
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: '你好' }),
})

const reader = res.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const text = decoder.decode(value)
  // 解析 SSE 数据
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6)
      if (data === '[DONE]') break
      const { text } = JSON.parse(data)
      // 追加到 UI
    }
  }
}
```

## Anthropic API 调用

### 安装

```bash
npm install @anthropic-ai/sdk
```

### 基础调用

```javascript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: '你是一个友好的助手。',  // system prompt 单独传
  messages: [
    { role: 'user', content: '解释一下什么是闭包' },
  ],
})

console.log(message.content[0].text)
```

### 流式响应

```javascript
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: '写一首关于编程的诗' },
  ],
})

stream.on('text', (text) => {
  process.stdout.write(text)  // 逐字打印
})

const finalMessage = await stream.finalMessage()
```

### OpenAI 与 Anthropic 的差异

| 维度 | OpenAI | Anthropic |
|------|--------|-----------|
| **System Prompt** | 放在 `messages` 数组中 | 单独的 `system` 参数 |
| **响应结构** | `choices[0].message.content` | `content[0].text` |
| **流式事件** | `chunk.choices[0].delta.content` | `text` 事件 |
| **图片输入** | `image_url` | `image` (base64) |

## 多轮对话

LLM 本身是无状态的，多轮对话需要客户端维护历史消息。

```javascript
// 对话历史管理
class ChatSession {
  constructor(systemPrompt) {
    this.messages = [
      { role: 'system', content: systemPrompt },
    ]
    this.maxHistory = 20  // 最多保留 20 条消息
  }

  async send(userMessage, callLLM) {
    // 添加用户消息
    this.messages.push({ role: 'user', content: userMessage })

    // 控制上下文长度（保留 system + 最近 N 条）
    const contextMessages = this.messages.length > this.maxHistory + 1
      ? [this.messages[0], ...this.messages.slice(-this.maxHistory)]
      : this.messages

    // 调用 LLM
    const response = await callLLM(contextMessages)

    // 保存助手回复
    this.messages.push({ role: 'assistant', content: response })

    return response
  }
}

// 使用
const session = new ChatSession('你是一个技术面试助手。')

const reply1 = await session.send('什么是事件循环？', callOpenAI)
console.log(reply1)

const reply2 = await session.send('能举个例子吗？', callOpenAI)
console.log(reply2)  // LLM 知道之前聊过事件循环
```

## 错误处理

```javascript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function safeChat(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    })
    return response.choices[0].message.content
  } catch (err) {
    if (err instanceof OpenAI.RateLimitError) {
      // 429: 请求频率超限
      console.error('触发频率限制，等待后重试')
      await sleep(5000)
      return safeChat(messages)  // 重试
    }

    if (err instanceof OpenAI.APIError) {
      // 其他 API 错误
      console.error(`API 错误: ${err.status} ${err.message}`)
      throw err
    }

    // 网络错误等
    console.error('未知错误:', err)
    throw err
  }
}
```

## 成本估算

| 模型 | 输入价格 (每 1M Token) | 输出价格 (每 1M Token) |
|------|----------------------|----------------------|
| GPT-4o | $2.50 | $10.00 |
| GPT-4.1 | $2.00 | $8.00 |
| GPT-4.1-mini | $0.40 | $1.60 |
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Haiku 3.5 | $0.80 | $4.00 |

**实际案例：**
- 一次普通问答（500 字输入 + 500 字输出）≈ $0.01-0.02
- 1000 次问答 ≈ $10-20
- 用 Haiku/mini 等小模型可以降到 1/5 成本

**省钱技巧：**
1. 简单任务用小模型（分类、提取 → Haiku/GPT-4.1-mini）
2. 复杂任务用大模型（推理、创作 → Sonnet/GPT-4o）
3. 缓存相似请求的结果
4. 精简 system prompt，减少输入 Token

## 完整示例：AI 问答服务

```javascript
import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'
import OpenAI from 'openai'

const app = new Koa()
const router = new Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

app.use(cors())
app.use(bodyParser())

// 非流式接口
router.post('/api/chat', async (ctx) => {
  const { message, history = [] } = ctx.request.body

  const messages = [
    { role: 'system', content: '你是一个友好的技术助手。' },
    ...history,
    { role: 'user', content: message },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  })

  ctx.body = {
    reply: response.choices[0].message.content,
    usage: response.usage,  // token 用量
  }
})

// 流式接口
router.post('/api/chat/stream', async (ctx) => {
  const { message, history = [] } = ctx.request.body

  ctx.respond = false
  const res = ctx.res
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  })

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: '你是一个友好的技术助手。' },
      ...history,
      { role: 'user', content: message },
    ],
    stream: true,
  })

  let fullText = ''
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) {
      fullText += text
      res.write(`data: ${JSON.stringify({ text })}\n\n`)
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  res.end()
})

app.use(router.routes())
app.listen(3000)
```

import Router from '@koa/router'
import OpenAI from 'openai'
import { config } from '../config/index.js'
import { createTools } from '../agent/tools.js'
import { runAgentLoop } from '../agent/loop.js'

const router = new Router()

const client = new OpenAI({
  apiKey: 'ollama',
  baseURL: config.ollamaBaseUrl,
})

const SYSTEM_PROMPT = `你是一个知识库助手。回答需要知识库内容支撑的问题时，按需调用工具：
1. 需要查知识库 → 调用 search_knowledge 检索相关文档片段
2. 检索片段不足以回答（如要求全文总结、对比多篇文章）→ 调用 get_doc_content 读取完整内容

闲聊、寒暄、与知识库无关的简单问题不需要调用工具，直接回答。
如果检索内容中没有相关信息，请如实告知，不要编造答案。
回答时请在相关句子末尾用 [来源1]、[来源2] 这样的格式标注引用（编号来自工具结果中的 [来源N]），但不要单独列出"参考依据"或"参考来源"部分，前端会自动显示可点击的来源标签。

**重要**：返回代码时必须使用 Markdown 代码块语法，指定语言(包括但不限于)：
\`\`\`javascript
// 代码内容
\`\`\`
\`\`\`html
<!-- HTML 代码 -->
\`\`\`
\`\`\`vue
<!-- Vue 代码 -->
\`\`\``

router.post('/api/chat', async (ctx) => {
  const { message, history = [] } = ctx.request.body as {
    message: string
    history?: Array<{ role: string; content: string }>
  }

  if (!message) {
    ctx.status = 400
    ctx.body = { error: 'message is required' }
    return
  }

  // SSE 流式响应需要手动控制写入时机，绕过 Koa 的自动响应机制
  ctx.respond = false

  const res = ctx.res
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // 创建本次请求独立的工具（来源聚合独立于请求）
  const { definitions, implementations } = createTools()

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((h) => ({
      role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message },
  ]

  const allSources: Array<{ source: string; title: string }> = []
  let sourcesSent = false
  const sendSources = () => {
    if (sourcesSent || allSources.length === 0) return
    sourcesSent = true
    res.write(`data: ${JSON.stringify({ type: 'sources', data: allSources })}\n\n`)
  }

  try {
    for await (const event of runAgentLoop({
      messages,
      definitions,
      implementations,
      client,
      model: config.chatModel,
    })) {
      if (event.type === 'tool') {
        // 聚合工具产生的来源（去重），在第一个 token 前一次性发出
        for (const s of event.sources) {
          if (!allSources.some((x) => x.source === s.source)) allSources.push(s)
        }
      } else if (event.type === 'token') {
        sendSources()
        res.write(`data: ${JSON.stringify({ type: 'token', data: event.content })}\n\n`)
      }
    }

    // 极端情况：全程无 token（如模型只调工具就结束），补发 sources 让前端能展示
    sendSources()
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
  } catch (error) {
    console.error('流式生成失败:', error)
    res.write(`data: ${JSON.stringify({ type: 'error', data: '生成失败，请重试' })}\n\n`)
  } finally {
    res.end()
  }
})

export default router

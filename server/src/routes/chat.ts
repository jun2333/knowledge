import Router from '@koa/router'
import OpenAI from 'openai'
import { getRetriever } from '../rag/retriever.js'
import { config } from '../config/index.js'

const router = new Router()

const client = new OpenAI({
  apiKey: config.dashscopeApiKey,
  baseURL: config.dashscopeBaseUrl,
})

const SYSTEM_PROMPT = `你是一个前端知识库助手。基于以下检索到的知识库内容回答用户的问题。
如果检索内容中没有相关信息，请如实告知，不要编造答案。
回答时请在相关句子末尾用 [来源1]、[来源2] 这样的格式标注引用，但不要单独列出"参考依据"或"参考来源"部分，前端会自动显示可点击的来源标签。`

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

  const retriever = await getRetriever(5)
  const docs = await retriever.invoke(message)

  const context = docs
    .map(
      (doc, i) =>
        `[来源${i + 1}: ${doc.metadata.source}]\n${doc.pageContent}`
    )
    .join('\n\n---\n\n')

  // 绕过 Koa 的响应处理，直接操作原生 response
  ctx.respond = false

  const res = ctx.res
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const sources = docs.map((d) => ({
    source: d.metadata.source,
    title: d.metadata.title,
  }))
  res.write(`data: ${JSON.stringify({ type: 'sources', data: sources })}\n\n`)

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n---检索到的知识库内容---\n' + context },
    ...history.map((h) => ({
      role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message },
  ]

  try {
    const response = await client.chat.completions.create({
      model: config.chatModel,
      messages,
      stream: true,
      temperature: 0.7,
    })

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        res.write(`data: ${JSON.stringify({ type: 'token', data: content })}\n\n`)
      }
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
  } catch (error) {
    console.error('流式生成失败:', error)
    res.write(`data: ${JSON.stringify({ type: 'error', data: '生成失败，请重试' })}\n\n`)
  } finally {
    res.end()
  }
})

export default router

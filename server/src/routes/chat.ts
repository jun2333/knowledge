import Router from '@koa/router'
import OpenAI from 'openai'
import { getRetriever, invalidateRetriever } from '../rag/retriever.js'
import { config } from '../config/index.js'

const router = new Router()

const client = new OpenAI({
  apiKey: 'ollama',
  baseURL: config.ollamaBaseUrl,
})

const SYSTEM_PROMPT = `你是一个知识库助手。基于以下检索到的知识库内容回答用户的问题。
如果检索内容中没有相关信息，请如实告知，不要编造答案。
回答时请在相关句子末尾用 [来源1]、[来源2] 这样的格式标注引用，但不要单独列出"参考依据"或"参考来源"部分，前端会自动显示可点击的来源标签。

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

  const retriever = await getRetriever(5)
  let docs
  try {
    docs = await retriever.invoke(message)
  } catch (e) {
    // 集合可能刚被 rag:index 重建，旧句柄失效；重建后重试一次
    invalidateRetriever()
    docs = await (await getRetriever(5)).invoke(message)
  }

  const context = docs
    .map(
      (doc, i) =>
        `[来源${i + 1}: ${doc.metadata.source}]\n${doc.pageContent}`
    )
    .join('\n\n---\n\n')

  // SSE 流式响应需要手动控制写入时机，绕过 Koa 的自动响应机制
  // Koa 默认会等异步函数结束后再发送响应，而 SSE 需要边生成边推送
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

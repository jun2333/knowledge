import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'
import matter from 'gray-matter'
import { config } from '../src/config/index.js'

// 用本地 LLM 逐篇生成"能由该文档回答的问题"，产出评测集初稿。
// ⚠️ 生成结果必须人工审核（措辞是否合理、期望文档是否准确）后再合并到 retrieval-cases.json。
// 用法：pnpm rag:gen-cases [--limit N] [--concurrency N]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = path.resolve(__dirname, '../eval/retrieval-cases.generated.json')

// 走 Ollama 原生 API（OpenAI 兼容接口不支持 think 参数；开启 thinking 会比关闭慢 ~30 倍）
const OLLAMA_CHAT_URL = `${config.ollamaBaseUrl.replace(/\/v1\/?$/, '')}/api/chat`

const CATEGORY_MAP: Record<string, string> = {
  react: 'React',
  vue: 'Vue',
  browser: '浏览器',
  javascript: 'JavaScript',
  css: 'CSS',
  performance: '性能',
  engineering: '工程化',
  service: '服务端',
  'ai-agent': 'AI Agent',
  algorithms: '算法',
  frontend: '大前端',
}
const inferCategory = (rel: string) => CATEGORY_MAP[rel.split('/')[0]] ?? '其他'

/** 让模型基于文档生成一个能由它回答的问题 */
async function generateQuestion(title: string, content: string): Promise<string> {
  const prompt = `根据下面的技术文档，生成一个用户可能提出的、且能由该文档回答的中文技术问题。
要求：只输出问题本身，不要解释、不要引号，不超过 30 字。

文档标题：${title}
文档内容（节选）：
${content.slice(0, 1200)}`

  const res = await fetch(OLLAMA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.chatModel,
      messages: [{ role: 'user', content: prompt }],
      think: false, // 关键：关闭思考，出题这种任务不需要
      stream: false,
      options: { temperature: 0.7 },
    }),
  })
  const data = (await res.json()) as { message?: { content?: string } }
  return (data.message?.content ?? '')
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .pop()! // 兜底：只取最后一行
    .replace(/^["'「《]+|["'」》]+$/g, '')
}

/** 并发执行（限制并发数），保持结果顺序 */
async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.indexOf('--limit')
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) || 0 : 0
  const concArg = args.indexOf('--concurrency')
  const concurrency = concArg >= 0 ? Number(args[concArg + 1]) || 4 : 4

  const files = await glob('**/*.md', {
    cwd: config.docsPath,
    ignore: ['node_modules/**', '.vitepress/**', 'interview-questions/**'],
    absolute: true,
  })
  const targets = limit > 0 ? files.slice(0, limit) : files
  console.log(`共 ${files.length} 篇文档，本次处理 ${targets.length} 篇，并发 ${concurrency}\n`)

  const t0 = Date.now()
  let done = 0
  const results = await mapConcurrent(targets, concurrency, async (file) => {
    const raw = fs.readFileSync(file, 'utf-8')
    const { content, data } = matter(raw)
    const rel = path.relative(config.docsPath, file)
    const title = data.title || content.match(/^#\s+(.+)$/m)?.[1]?.trim() || rel

    const q = await generateQuestion(title, content)
    done++
    console.log(`[${done}/${targets.length}] ${rel} → ${q || '（生成失败）'}`)
    return q ? { q, expect: [rel], category: inferCategory(rel) } : null
  })

  const out = results.filter((r): r is NonNullable<typeof r> => r !== null)
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2))

  const secs = ((Date.now() - t0) / 1000).toFixed(0)
  console.log(`\n生成 ${out.length} 条候选（耗时 ${secs}s）→ ${OUT_PATH}`)
  console.log('⚠️ 请人工审核（措辞、期望文档是否正确）后再合并到 retrieval-cases.json')
}

main().catch((err) => {
  console.error('生成失败:', err)
  process.exit(1)
})

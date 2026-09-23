import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { config } from '../src/config/index.js'
import { createTools } from '../src/agent/tools.js'
import { runAgentLoop } from '../src/agent/loop.js'
import { SYSTEM_PROMPT } from '../src/agent/prompt.js'
import { finalize, printCompare } from './eval-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPORT_PATH = path.resolve(__dirname, '../data/gen-eval-report.md')

// 生成层评估：测"端到端回答质量"，不只是检索。数据在 eval/generation-cases.json（与逻辑分离）。
// expectAnswer=false 的题是"负例"——知识库答不了，模型必须如实说没有，不能编造。
type GenCase = { q: string; category: string; expectAnswer: boolean }

const CASES_PATH = path.resolve(__dirname, '../eval/generation-cases.json')
const cases: GenCase[] = JSON.parse(fs.readFileSync(CASES_PATH, 'utf-8'))

const client = new OpenAI({ apiKey: 'ollama', baseURL: config.ollamaBaseUrl })

type AskResult = { answer: string; sources: string[]; context: string }

/** 跑一次完整 Agent 链路（与线上 chat 完全一致），收集回答、来源、检索到的资料 */
async function ask(q: string): Promise<AskResult> {
  const { definitions, implementations } = createTools()
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: q },
  ]

  let answer = ''
  const sources = new Set<string>()
  let context = ''

  for await (const event of runAgentLoop({
    messages,
    definitions,
    implementations,
    client,
    model: config.chatModel,
  })) {
    if (event.type === 'token') {
      answer += event.content
    } else if (event.type === 'tool') {
      event.sources.forEach((s) => sources.add(s.source))
      context += event.content + '\n\n'
    }
  }
  return { answer: answer.trim(), sources: [...sources], context: context.trim() }
}

/** 引用合法性：回答里的 [来源N] 是否都在有效范围（1..来源数） */
function checkCitations(answer: string, sourceCount: number) {
  const refs = [...answer.matchAll(/\[来源(\d+)\]/g)].map((m) => Number(m[1]))
  const invalid = refs.filter((n) => n < 1 || n > sourceCount)
  return { refCount: refs.length, invalid }
}

/** 是否"如实说没有"（负例题的判定信号） */
const REFUSAL_RE = /(没有|未找到|找不到|不包含|无法回答|无法提供|无法获取|无法查询|无法给出|不知道|抱歉|暂无|不涉及|没有相关)/
const looksRefusal = (answer: string) => REFUSAL_RE.test(answer)

type JudgeScore = { faithfulness: number; completeness: number; citation: number }

/** LLM-as-judge：按 rubric 给忠实度/完整性/引用打分 */
async function judge(c: GenCase, r: AskResult): Promise<JudgeScore | null> {
  const prompt = `你是严格的评估员。根据【参考资料】评估【回答】的质量。

【问题】${c.q}
【参考资料】${r.context.slice(0, 3000) || '（无，未检索到任何资料）'}
【回答】${r.answer}

请对三项各打 1-5 分（只输出 JSON，不要解释）：
- faithfulness：回答是否完全基于参考资料、有无编造（无资料支撑的论断要扣分）
- completeness：是否回答了用户的问题
- citation：引用标注是否恰当（回答完全没有引用则给 1 分）

输出格式：{"faithfulness":n,"completeness":n,"citation":n}`

  try {
    const res = await client.chat.completions.create({
      model: config.chatModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    })
    const text = res.choices[0]?.message?.content ?? ''
    const m = text.match(/\{[^{}]*"faithfulness"[^{}]*\}/)
    if (!m) return null
    const parsed = JSON.parse(m[0]) as JudgeScore
    return parsed
  } catch {
    return null
  }
}

async function main() {
  const report: string[] = ['# 生成层评估报告', '']
  let citeOk = 0
  let refusalOk = 0
  let refusalTotal = 0
  const judgeAvg = { faithfulness: [] as number[], completeness: [] as number[], citation: [] as number[] }

  for (const [i, c] of cases.entries()) {
    console.log(`[${i + 1}/${cases.length}] ${c.q}`)
    const r = await ask(c.q)
    const { refCount, invalid } = checkCitations(r.answer, r.sources.length)

    // 自动检查 1：引用合法性
    const citationLegal = invalid.length === 0
    if (citationLegal) citeOk++

    // 自动检查 2：负例题是否如实拒答
    let refusalNote = ''
    if (!c.expectAnswer) {
      refusalTotal++
      const ok = looksRefusal(r.answer)
      if (ok) refusalOk++
      refusalNote = ok ? '如实说没有 ✅' : '⚠️ 可能编造'
    }

    const score = await judge(c, r)
    if (score) {
      judgeAvg.faithfulness.push(score.faithfulness)
      judgeAvg.completeness.push(score.completeness)
      judgeAvg.citation.push(score.citation)
    }

    const scoreText = score
      ? `忠实 ${score.faithfulness} / 完整 ${score.completeness} / 引用 ${score.citation}`
      : 'judge 解析失败'

    console.log(
      `  来源 ${r.sources.length} 个 | 引用 ${refCount} 处${invalid.length ? `(非法 ${invalid.length})` : '(合法)'} | ${scoreText}${refusalNote ? ` | ${refusalNote}` : ''}`
    )
    console.log()

    report.push(`## ${i + 1}. ${c.q}`)
    report.push('')
    report.push(`- 类别：${c.category}`)
    report.push(`- 来源：${r.sources.length ? r.sources.join(', ') : '（无）'}`)
    report.push(`- 引用：${refCount} 处${invalid.length ? `，非法编号 ${invalid.join(', ')}` : '（合法）'}`)
    report.push(`- 评分：${scoreText}${refusalNote ? `｜${refusalNote}` : ''}`)
    report.push('')
    report.push('**回答**：')
    report.push('')
    report.push(r.answer || '（空）')
    report.push('')
    report.push('---')
    report.push('')
  }

  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const metrics = {
    citationLegalRate: citeOk / cases.length,
    refusalRate: refusalTotal > 0 ? refusalOk / refusalTotal : 1,
    faithfulness: mean(judgeAvg.faithfulness),
    completeness: mean(judgeAvg.completeness),
    citation: mean(judgeAvg.citation),
  }
  const f2 = (n: number) => n.toFixed(2)

  console.log('==== 汇总 ====')
  console.log(`引用合法性：${citeOk}/${cases.length}`)
  console.log(`负例如实拒答：${refusalOk}/${refusalTotal}`)
  console.log(`Judge 平均分：忠实度 ${f2(metrics.faithfulness)} | 完整性 ${f2(metrics.completeness)} | 引用 ${f2(metrics.citation)}`)
  console.log(`明细报告：${REPORT_PATH}`)

  report.unshift(
    `> 汇总：引用合法性 ${citeOk}/${cases.length}；负例如实拒答 ${refusalOk}/${refusalTotal}；` +
      `Judge 平均分 忠实度 ${f2(metrics.faithfulness)} / 完整性 ${f2(metrics.completeness)} / 引用 ${f2(metrics.citation)}`,
    '',
  )
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  fs.writeFileSync(REPORT_PATH, report.join('\n'))

  // 对比 + 留档 + 阈值门禁
  const env = {
    chatModel: config.chatModel,
    judgeModel: config.chatModel,
    cases: cases.length,
  }
  printCompare('generation', metrics, env)
  const passed = finalize('generation', metrics, env)
  if (!passed) process.exit(1)
}

main().catch((err) => {
  console.error('生成评估失败:', err)
  process.exit(1)
})

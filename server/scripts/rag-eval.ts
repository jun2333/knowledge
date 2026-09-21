import { getRetriever } from '../src/rag/retriever.js'

// 检索质量回归测试集：期望命中文件命中 top5 任一即算该题通过
const cases: Array<{ q: string; expect: string[] }> = [
  { q: 'React 中 useMemo 和 useCallback 的区别是什么？', expect: ['react/logic-reuse.md', 'react/hooks-summary.md', 'react/performance.md'] },
  { q: '浏览器 HTTP 缓存有哪些方式？', expect: ['browser/storage-cache.md'] },
  { q: '什么是闭包？', expect: ['javascript/closure.md'] },
  { q: 'Vue 的响应式原理是什么？', expect: ['vue/reactive.md', 'vue/double-binding.md', 'vue/primitive-reactive.md'] },
  { q: '如何优化页面首屏加载速度？', expect: ['performance/first-screen.md', 'performance/optimization.md'] },
  { q: '浏览器的事件循环、宏任务和微任务是什么？', expect: ['javascript/event-loop.md'] },
  { q: 'CSS 的 BFC 是什么？有什么用？', expect: ['css/bfc.md'] },
  { q: 'React Fiber 的调度原理是什么？', expect: ['react/scheduler.md', 'react/reconciler.md'] },
  { q: '什么是跨域？有哪些解决方案？', expect: ['browser/cross-origin.md'] },
  { q: '虚拟列表如何实现？', expect: ['performance/virtual-list.md'] },
  { q: 'TypeScript 相比 JavaScript 有什么优势？', expect: ['javascript/typescript.md'] },
  { q: '前端错误监控如何实现？', expect: ['performance/error-monitoring.md'] },
]

const TOP_K = 5

/** 期望文档在检索结果中最早出现的排名（1-based），未命中返回 0 */
function rankOf(sources: string[], expect: string[]): number {
  for (let i = 0; i < sources.length; i++) {
    if (expect.some((e) => sources[i].includes(e))) return i + 1
  }
  return 0
}

async function main() {
  const retriever = await getRetriever(TOP_K)
  let hitTopK = 0
  let hitTop1 = 0
  let mrrSum = 0

  for (const c of cases) {
    const docs = await retriever.invoke(c.q)
    const sources = docs.map((d) => d.metadata.source as string)
    const rank = rankOf(sources, c.expect)
    const passTopK = rank > 0
    const passTop1 = rank === 1
    if (passTopK) hitTopK++
    if (passTop1) hitTop1++
    mrrSum += rank > 0 ? 1 / rank : 0

    const icon = passTop1 ? '🥇' : passTopK ? '✅' : '❌'
    console.log(`${icon} ${c.q}`)
    console.log(`   期望: ${c.expect.join(', ')}   命中排名: ${rank || '未命中'}`)
    sources.forEach((s, i) => console.log(`   ${i + 1}. ${s}`))
    console.log()
  }

  console.log('==== 汇总 ====')
  console.log(`Top${TOP_K} 命中率: ${hitTopK}/${cases.length} (${((hitTopK / cases.length) * 100).toFixed(0)}%)`)
  console.log(`Top1 命中率: ${hitTop1}/${cases.length} (${((hitTop1 / cases.length) * 100).toFixed(0)}%)`)
  console.log(`MRR: ${(mrrSum / cases.length).toFixed(3)}`)
}

main().catch((err) => {
  console.error('评测失败:', err)
  process.exit(1)
})

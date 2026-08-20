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

async function main() {
  const retriever = await getRetriever(5)
  let hit = 0

  for (const c of cases) {
    const docs = await retriever.invoke(c.q)
    const sources = docs.map((d) => d.metadata.source as string)
    const matched = c.expect.filter((e) => sources.some((s) => s.includes(e)))
    const pass = matched.length > 0
    if (pass) hit++

    console.log(`${pass ? '✅' : '❌'} ${c.q}`)
    console.log(`   期望: ${c.expect.join(', ')}`)
    sources.forEach((s) => console.log(`   top: ${s}`))
  }

  console.log(`\n命中率: ${hit}/${cases.length} (${((hit / cases.length) * 100).toFixed(0)}%)`)
}

main().catch((err) => {
  console.error('评测失败:', err)
  process.exit(1)
})

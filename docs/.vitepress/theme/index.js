import DefaultTheme from 'vitepress/theme'
import mermaid from 'mermaid'

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
  })
  
  mermaidInitialized = true
}

async function renderMermaidDiagrams() {
  const elements = document.querySelectorAll('pre.mermaid')
  
  for (const element of elements) {
    // 跳过已经渲染的元素
    if (element.getAttribute('data-processed')) continue
    
    try {
      const code = element.textContent || ''
      const id = 'mermaid-' + Math.random().toString(36).substring(7)
      const { svg } = await mermaid.render(id, code)
      
      // 创建新的 div 替换 pre
      const div = document.createElement('div')
      div.className = 'mermaid'
      div.innerHTML = svg
      div.setAttribute('data-processed', 'true')
      element.replaceWith(div)
    } catch (error) {
      console.error('Mermaid rendering error:', error)
      element.innerHTML = `<pre style="color: red;">Mermaid 渲染错误: ${error.message}</pre>`
      element.style.display = 'block'
    }
  }
}

export default {
  ...DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // 初始化 mermaid
    if (typeof window !== 'undefined') {
      initMermaid()
      
      // 页面加载后渲染
      setTimeout(renderMermaidDiagrams, 100)
      
      // 监听路由变化
      if (router.onAfterRouteChanged) {
        router.onAfterRouteChanged(() => {
          setTimeout(renderMermaidDiagrams, 100)
        })
      }
    }
  },
}

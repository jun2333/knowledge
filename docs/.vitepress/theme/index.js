import DefaultTheme from 'vitepress/theme'

export default {
  ...DefaultTheme,
  async enhanceApp({ app, router }) {
    // 只在客户端初始化 mermaid
    if (typeof window !== 'undefined') {
      const { default: mermaid } = await import('mermaid')
      
      mermaid.initialize({
        startOnLoad: false, // 禁用自动加载，手动控制
        theme: 'default',
        securityLevel: 'loose',
      })
      
      // 页面加载后渲染
      setTimeout(() => renderMermaid(), 100)
      
      // 路由切换后重新渲染
      router.onAfterRouteChanged = () => {
        setTimeout(() => renderMermaid(), 100)
      }
    }
  },
}

// 渲染所有 Mermaid 图表
async function renderMermaid() {
  try {
    const { default: mermaid } = await import('mermaid')
    const diagrams = document.querySelectorAll('.language-mermaid pre')
    
    for (const diagram of diagrams) {
      const code = diagram.textContent || ''
      const parent = diagram.parentElement
      
      if (!parent) continue
      
      // 如果已经渲染过，跳过
      if (parent.querySelector('.mermaid')) continue
      
      try {
        // 使用合法的 ID 格式（只包含字母、数字、下划线、连字符）
        const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
        const { svg } = await mermaid.render(id, code)
        const container = document.createElement('div')
        container.className = 'mermaid'
        container.innerHTML = svg
        
        // 安全地替换 pre 标签
        // 先验证 diagram 是否仍然是 parent 的子节点
        if (diagram.parentNode === parent) {
          parent.replaceChild(container, diagram)
        }
      } catch (err) {
        console.error('Mermaid render error:', err)
      }
    }
  } catch (err) {
    console.error('Failed to load mermaid:', err)
  }
}

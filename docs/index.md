---
layout: home
---

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // BASE_URL 由 Vite 在构建时注入（本地 /，线上 /knowledge/），比 router.go 更可靠
  const base = import.meta.env.BASE_URL || '/'
  window.location.replace(base + 'ai-agent/')
})
</script>

# 知识库

正在跳转...

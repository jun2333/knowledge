# Vue 响应式系统

::: tip 面试重要性
⭐⭐⭐⭐⭐ Vue 面试必考,深入理解响应式原理是进阶高级前端的必经之路
:::

## 📖 核心概念

Vue 的响应式系统是其最核心的特性,它让我们能够以声明式的方式更新 DOM。

### Vue2 vs Vue3

| 特性 | Vue2 | Vue3 |
|------|------|------|
| 实现方式 | Object.defineProperty | Proxy |
| 数组监听 | 需要 hack | 原生支持 |
| 性能 | 一般 | 更好 |
| 新增属性 | 需要 $set | 直接支持 |

---

## 🔗 相关文档

- [双向绑定原理](/vue/reactive) - 响应式基础
- [Effect 实现原理](/vue/effect) - 副作用管理
- [Computed 和 Watch](/vue/computed-watch) - 计算属性与侦听器

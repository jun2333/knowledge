# 性能优化

::: tip 面试重要性
⭐⭐⭐⭐⭐ 性能优化是区分初级和高级前端的重要标准
:::

## 📊 优化方向

### 加载优化
- 资源压缩 (Tree Shaking, Code Splitting)
- 懒加载 (Lazy Load)
- 预加载 (Preload, Prefetch)
- CDN 加速
- HTTP/2 多路复用

### 渲染优化
- 减少重排重绘
- 使用 transform 和 opacity 做动画
- requestAnimationFrame
- 虚拟列表
- 防抖节流

### 运行时优化
- 事件委托
- 函数记忆化 (Memoization)
- Web Workers

---

## 🎯 实战项目

- [⭐⭐ 大文件上传](/performance/upload-project) - Vue2 + Node.js 完整实现
- [等高虚拟列表](/performance/virtual-list-fixed)
- [不等高虚拟列表](/performance/virtual-list-dynamic)
- [瀑布流布局](/performance/waterfall)

---

## 📈 性能指标

| 指标 | 含义 | 目标值 |
|------|------|--------|
| FCP | 首次内容绘制 | < 1.8s |
| LCP | 最大内容绘制 | < 2.5s |
| FID | 首次输入延迟 | < 100ms |
| CLS | 累积布局偏移 | < 0.1 |
| TTI | 可交互时间 | < 3.8s |

---

## 🔗 相关文档

- [性能指标详解](/performance/metrics)
- [错误监控](/performance/error-monitoring)
- [如何让网页更丝滑](/performance/smooth)

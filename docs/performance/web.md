---
title: Web 性能优化
date: 2023-03-08
---

# Web 性能优化

::: tip 快速上手
如果你想快速了解**最有效的优化方法**和**检查清单**，请看 [性能优化最佳实践](./best-practices)。

本文适合想**深入学习**性能优化原理的读者。
:::

Web 性能优化主要包括三部分：
1. **度量标准**：如何衡量性能
2. **优化手段**：如何提升性能
3. **性能监控**：如何持续监控性能

## 度量标准

### 核心指标

| 指标 | 全称 | 说明 | 目标值 |
|------|------|------|--------|
| **LCP** | Largest Contentful Paint | 最大内容绘制时间 | 0-2500ms |
| **INP** | Interaction to Next Paint | 交互到下次绘制（替代 FID） | 0-200ms |
| **FID** | First Input Delay | 首次输入延迟（已废弃） | 0-100ms |
| **CLS** | Cumulative Layout Shift | 累积布局偏移 | 0-0.1 |
| **TTI** | Time to Interactive | 可交互时间 | 0-3800ms |
| **TBT** | Total Blocking Time | 总阻塞时间 | 0-200ms |
| **FCP** | First Contentful Paint | 首次内容绘制 | 0-1800ms |

::: tip Core Web Vitals
Google 提出的核心 Web 指标（2024 年 3 月更新）：**LCP**、**INP**（替代 FID）、**CLS**。
:::

### 其他指标

- **动画**：保证 60fps（每帧 16.6ms）
- **任务执行**：避免 Long Task（>50ms）

## 优化手段

### 1. 编码优化

#### 数据读取

```javascript
// ✅ 快：局部变量
function process() {
  const count = items.length;
  for (let i = 0; i < count; i++) { }
}

// ❌ 慢：每次访问对象属性
function process() {
  for (let i = 0; i < items.length; i++) { }
}
```

**原则**：
- 字面量与局部变量读取最快
- 局部变量 > 全局变量（作用域链越长越慢）
- 对象嵌套越深，读取越慢

#### DOM 操作

```javascript
// ✅ 缓存 DOM 引用
const el = document.getElementById('box');
const width = el.offsetWidth;
const height = el.offsetHeight;

//  重复访问 DOM
const width = document.getElementById('box').offsetWidth;
const height = document.getElementById('box').offsetHeight;
```

**原则**：
- 减少 DOM 访问次数，多用变量缓存
- 避免强制同步布局（先读后写）
- 使用 DocumentFragment 批量操作 DOM
- 长列表使用虚拟列表或 `content-visibility`

#### 流程控制

```javascript
// ✅ 使用 Map 代替大量 if...else
const handlers = new Map([
  ['click', handleClick],
  ['submit', handleSubmit],
]);
const handler = handlers.get(eventType);

// ✅ for 循环比 forEach 快（大数据量时）
for (let i = 0; i < arr.length; i++) { }
```

### 2. 静态资源优化

#### 文本压缩

- **Brotli**：比 Gzip 压缩率高 15-25%，现代浏览器都支持
- **Zopfli**：兼容 Gzip 的更高压缩率算法

#### 图片优化

```html
<!-- 响应式图片 -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="图片">
</picture>
```

**优化方案**：
- 使用 WebP 格式（比 JPEG 小 25-35%）
- 响应式图片（`<picture>`、`srcset`）
- 懒加载（`loading="lazy"`）
- 用视频代替 GIF（体积更小）

#### 字体优化

```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2'); /* WOFF2 比 TTF 小 30% */
  font-display: swap; /* 避免 FOIT */
}
```

### 3. 交付优化

#### 异步加载 JS

```html
<!-- 不阻塞 HTML 解析 -->
<script src="app.js" async></script>

<!-- 不阻塞 HTML 解析，且保证执行顺序 -->
<script src="app.js" defer></script>
```

| 属性 | HTML 解析 | 下载 | 执行顺序 | 执行时机 |
|------|----------|------|---------|---------|
| 无 | 阻塞 | 同步 | 按顺序 | 立即下载执行 |
| `async` | 不阻塞 | 异步 | 不保证 | 下载完立即执行 |
| `defer` | 不阻塞 | 异步 | 按顺序 | DOM 解析完后 |

#### 懒加载资源

```javascript
// Intersection Observer 实现懒加载
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});
```

#### 优先加载关键 CSS

```html
<!-- 内联关键 CSS -->
<style>
  /* 首屏必需样式 */
  .header { }
  .hero { }
</style>

<!-- 异步加载非关键 CSS -->
<link rel="stylesheet" href="other.css" media="print" onload="this.media='all'">
```

#### 资源提示

```html
<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="https://api.example.com">

<!-- 预连接（DNS + TCP + TLS） -->
<link rel="preconnect" href="https://api.example.com">

<!-- 预获取（未来可能需要的资源） -->
<link rel="prefetch" href="/next-page.js">

<!-- 预渲染（未来可能访问的页面） -->
<link rel="prerender" href="/next-page.html">
```

| 类型 | 作用 | 优先级 |
|------|------|--------|
| `dns-prefetch` | DNS 预解析 | 低 |
| `preconnect` | 预连接（DNS+TCP+TLS） | 高 |
| `prefetch` | 预获取资源 | 低 |
| `prerender` | 预渲染页面 | 最高 |

#### Preload 预加载

```html
<!-- 声明式预加载 -->
<link rel="preload" href="/styles/critical.css" as="style">
<link rel="preload" href="/fonts/font.woff2" as="font" crossorigin>

<!-- JavaScript 预加载 -->
<script>
const link = document.createElement('link');
link.rel = 'preload';
link.as = 'style';
link.href = '/styles/other.css';
document.head.appendChild(link);
</script>
```

#### 快速响应用户输入

- 避免 JS 任务执行时间超过 **50ms**（Long Task）
- 使用 **Time Slicing**（时间切片）拆分长任务
- 使用 **Web Worker** 处理计算密集型任务

```javascript
// Time Slicing 示例
function processLargeArray(array) {
  let index = 0;
  
  function processChunk() {
    const chunk = array.slice(index, index + 100);
    chunk.forEach(item => process(item));
    
    index += 100;
    if (index < array.length) {
      requestIdleCallback(processChunk); // 空闲时继续
    }
  }
  
  processChunk();
}
```

### 4. 构建优化

#### 预编译

```javascript
// Vue 单文件组件会被预编译成渲染函数
// 运行时直接执行，无需模板编译
const render = () => {
  return h('div', { class: 'app' }, 'Hello');
};
```

#### Tree Shaking

```javascript
// ✅ 可以被 tree-shaking（ES Module 静态分析）
import { add } from './math.js';

// ❌ 无法 tree-shaking（CommonJS 动态导入）
const { add } = require('./math.js');
```

#### Code Splitting

```javascript
// 动态导入，按需加载
const module = await import('./heavy-module.js');

// React.lazy
const LazyComponent = React.lazy(() => import('./Component'));
```

#### SSR 服务器渲染

- 首屏 HTML 在服务器生成，加快 FCP
- 有利于 SEO
- 方案：Next.js、Nuxt.js

#### HTTP 缓存

```http
# 强缓存
Cache-Control: max-age=31536000, immutable

# 协商缓存
ETag: "abc123"
Last-Modified: Wed, 08 Mar 2023 00:00:00 GMT
```

### 5. 其他优化

#### 升级 HTTP/2

- 多路复用（一个连接并发多个请求）
- 头部压缩
- 服务器推送

#### CDN 加速

- 静态资源分发到边缘节点
- 减少用户到服务器的距离

#### PWA 离线方案

```javascript
// Service Worker 缓存策略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

**优点**：
- 省去 TCP 连接时间，加快加载
- 减少服务器负载
- 支持离线访问

**缺点**：
- 数据不一致问题（需要更新策略）
- 代码维护成本（缓存管理）

## 性能监控

### 监控方案

| 方案 | 说明 |
|------|------|
| **Performance API** | 浏览器原生性能监控 |
| **Lighthouse** | Google 性能审计工具 |
| **Web Vitals** | Google 核心指标库 |
| **Sentry** | 错误监控 + 性能监控 |
| **自研监控** | 上报 + 分析平台 |

### 性能上报

```javascript
// 上报 LCP
new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1];
  
  // 上报到服务器
  sendToAnalytics({
    metric: 'LCP',
    value: lastEntry.startTime,
  });
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

---
title: 性能优化最佳清单
date: 2023-03-08
---

# 性能优化最佳清单

本文总结网站性能优化最有效的方法，按优先级排序。

## 优先级 P0：核心指标优化

### 1. 优化 LCP（最大内容绘制）

**目标**：0-2500ms

#### 关键措施

| 措施 | 效果 | 难度 |
|------|------|------|
| **图片优化** | 减少 50-80% 体积 | 低 |
| **关键 CSS 内联** | 减少渲染阻塞 | 中 |
| **预加载关键资源** | 提前加载 LCP 元素 | 低 |
| **使用 CDN** | 减少网络延迟 | 低 |
| **SSR/SSG** | 首屏 HTML 直出 | 高 |

#### 图片优化

```html
<!-- 使用 WebP 格式（浏览器从上到下匹配，显示第一个支持的） -->
<picture>
  <source srcset="image.webp" type="image/webp">  <!-- 优先：支持 WebP 就用这个 -->
  <img src="image.jpg" alt="图片" loading="lazy">  <!-- 兜底：不支持 WebP 就用 JPG -->
</picture>

<!-- 响应式图片（根据屏幕宽度选择不同尺寸） -->
<img srcset="image-320w.jpg 320w,
             image-480w.jpg 480w,
             image-800w.jpg 800w"
     sizes="(max-width: 320px) 280px,
            (max-width: 480px) 440px,
            800px"
     src="image-800w.jpg" alt="图片">
<!--
  srcset: 提供多个尺寸选项
  sizes: 告诉浏览器在不同屏幕宽度下使用哪个尺寸
  src: 兜底方案（不支持 srcset 的浏览器）
-->
```

#### 预加载 LCP 元素

```html
<!-- 预加载关键图片 -->
<link rel="preload" as="image" href="/images/hero.webp">

<!-- 预加载关键字体 -->
<link rel="preload" as="font" href="/fonts/font.woff2" crossorigin>
```

#### 关键 CSS 内联

```html
<!-- 内联首屏必需样式 -->
<style>
  .header { }
  .hero { }
  .lcp-element { }
</style>

<!-- 异步加载非关键 CSS -->
<link rel="stylesheet" href="other.css" media="print" onload="this.media='all'">
```

**构建工具自动提取**：

| 工具 | 适用 | 说明 |
|------|------|------|
| **critters** | Webpack | Google 出品，Webpack 5 内置 |
| **vite-plugin-critical** | Vite | Vite 专用插件 |
| **critical** | 通用 | 独立工具，可集成到任何构建流程 |

**Webpack 示例**（critters）：

```javascript
// webpack.config.js
const Critters = require('critters');

module.exports = {
  plugins: [
    new Critters({
      preload: 'swap',      // 预加载非关键 CSS
      pruneSource: false,   // 不删除已内联的样式
    })
  ]
};
```

**Vite 示例**（vite-plugin-critical）：

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import critical from 'vite-plugin-critical';

export default defineConfig({
  plugins: [
    critical({
      width: 1300,
      height: 900,
    })
  ]
});
```

**critical 独立工具**：

```bash
npm install critical
```

```javascript
const critical = require('critical');

critical.generate({
  inline: true,           // 内联到 HTML
  base: 'dist/',
  html: 'dist/index.html',
  width: 1300,
  height: 900,
});
```

### 2. 优化 INP（交互体验）

**目标**：0-200ms

#### 关键措施

| 措施 | 效果 | 难度 |
|------|------|------|
| **拆分长任务** | 避免阻塞交互 | 中 |
| **Web Worker** | 计算密集型任务离线处理 | 高 |
| **优化事件处理** | 减少主线程工作 | 中 |
| **避免布局抖动** | 减少强制同步布局 | 中 |

#### 拆分长任务

```javascript
// ❌ 长任务阻塞交互
function processLargeData(data) {
  data.forEach(item => heavyProcess(item));
}

// ✅ 时间切片
function processLargeData(data) {
  let index = 0;
  
  function processChunk() {
    const chunk = data.slice(index, index + 100);
    chunk.forEach(item => heavyProcess(item));
    
    index += 100;
    if (index < data.length) {
      requestIdleCallback(processChunk);
    }
  }
  
  processChunk();
}
```

#### Web Worker

```javascript
// main.js
const worker = new Worker('worker.js');
worker.postMessage(largeData);
worker.onmessage = (e) => {
  // 处理结果
};

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

### 3. 优化 CLS（视觉稳定性）

**目标**：0-0.1

#### 关键措施

| 措施 | 效果 | 难度 |
|------|------|------|
| **设置图片宽高** | 避免布局偏移 | 低 |
| **预留广告位** | 避免动态插入偏移 | 低 |
| **字体加载优化** | 避免 FOIT/FOUT | 中 |
| **避免动态插入内容** | 减少布局变化 | 中 |

#### 设置图片宽高

```html
<!-- ❌ 未设置宽高，加载后会撑开 -->
<img src="image.jpg">

<!-- ✅ 设置宽高比 -->
<img src="image.jpg" width="800" height="600" style="max-width: 100%; height: auto;">

<!-- ✅ 使用 aspect-ratio -->
<img src="image.jpg" style="aspect-ratio: 4/3; width: 100%;">
```

#### 字体加载优化

```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* 避免 FOIT */
}
```

## 优先级 P1：加载优化

### 4. 资源加载优化

#### 异步加载 JS

```html
<!-- 不阻塞 HTML 解析 -->
<script src="app.js" async></script>

<!-- 不阻塞 HTML 解析，且保证执行顺序 -->
<script src="app.js" defer></script>
```

#### 路由懒加载

```javascript
// React
const LazyComponent = React.lazy(() => import('./Component'));

// Vue
const LazyComponent = () => import('./Component.vue');

// 原生
const module = await import('./module.js');
```

#### 图片懒加载

```html
<!-- 原生懒加载 -->
<img src="image.jpg" loading="lazy">

<!-- Intersection Observer 懒加载 -->
<img data-src="image.jpg" class="lazy">
```

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('.lazy').forEach(img => observer.observe(img));
```

#### 虚拟列表

**问题**：渲染 10000 条数据的列表，DOM 节点太多，导致初始渲染慢、内存占用高、滚动卡顿。

**解决**：只渲染**可视区域**内的元素（通常 10-20 条），而不是全部。

```
实际 DOM 数量：10000 条 → 虚拟列表：10-20 条
```

**常用库**：

| 库 | 框架 | 说明 |
|------|------|------|
| **react-virtualized** | React | 功能全面 |
| **react-window** | React | react-virtualized 轻量版 |
| **vue-virtual-scroller** | Vue | Vue 专用 |

**React 示例**（react-window）：

```bash
npm install react-window
```

```javascript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={10000}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      Row {index}
    </div>
  )}
</FixedSizeList>
```

**与 content-visibility 对比**：

| 方案 | 原理 | 实现 | 兼容性 |
|------|------|------|--------|
| **虚拟列表** | 只渲染可视区域 DOM | 需要库或手动实现 | ✅ 所有浏览器 |
| **content-visibility** | 跳过视窗外元素渲染 | 浏览器原生，一行 CSS | ⚠️ 仅 Chromium |

**选择建议**：
- 需要兼容 Firefox/Safari → 虚拟列表
- 只需支持 Chromium → `content-visibility: auto`（更简单）

### 5. 缓存优化

#### HTTP 缓存

```http
# 强缓存（一年）
Cache-Control: max-age=31536000, immutable

# 协商缓存
ETag: "abc123"
Last-Modified: Wed, 08 Mar 2023 00:00:00 GMT
```

#### Service Worker 缓存

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

## 优先级 P2：体验优化

### 6. 流畅度优化

#### 使用 rAF 做动画

```javascript
// ❌ setInterval 可能掉帧
setInterval(() => {
  element.style.left = `${x}px`;
}, 16);

// ✅ rAF 与屏幕刷新率同步
function animate() {
  element.style.left = `${x}px`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

#### 合成代替绘制

```css
/* 开启 GPU 加速，只触发 Composite */
.element {
  transform: translateZ(0);
  will-change: transform;
}
```

### 7. 白屏监控

```javascript
// 关键点采样检测白屏
function checkWhiteScreen() {
  let emptyPoints = 0;
  
  for (let i = 1; i <= 9; i++) {
    const element = document.elementFromPoint(
      (window.innerWidth * i) / 10,
      window.innerHeight / 2
    );
    
    if (isContainer(element)) emptyPoints++;
  }
  
  if (emptyPoints >= 7) {
    reportWhiteScreen();
  }
}
```

## 优先级 P3：构建优化

### 8. 打包优化

#### Tree Shaking

```javascript
// ✅ 可以被 tree-shaking（ES Module）
import { add } from './math.js';

// ❌ 无法 tree-shaking（CommonJS）
const { add } = require('./math.js');
```

#### Code Splitting

```javascript
// 动态导入
const module = await import('./heavy-module.js');

// 预加载
import(/* webpackPreload: true */ './module.js');
```

#### 压缩优化

| 压缩方式 | 压缩率 | 兼容性 |
|---------|--------|--------|
| **Brotli** | 最高 | 现代浏览器 |
| **Zopfli** | 高 | 兼容 Gzip |
| **Gzip** | 中 | 所有浏览器 |

## 检查清单

### 核心指标

- [ ] LCP < 2500ms
- [ ] INP < 200ms
- [ ] CLS < 0.1

### 加载优化

- [ ] 图片使用 WebP 格式
- [ ] 关键 CSS 内联
- [ ] JS 异步加载（async/defer）
- [ ] 路由懒加载
- [ ] 图片懒加载
- [ ] 启用 Brotli/Gzip 压缩
- [ ] 配置 HTTP 缓存
- [ ] 使用 CDN

### 交互优化

- [ ] 拆分长任务（>50ms）
- [ ] 避免布局抖动
- [ ] 使用 rAF 做动画
- [ ] Web Worker 处理计算密集型任务

### 稳定性

- [ ] 图片设置宽高
- [ ] 字体使用 font-display: swap
- [ ] 预留广告位
- [ ] 白屏监控


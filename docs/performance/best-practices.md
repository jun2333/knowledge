---
title: 性能优化清单
date: 2026-08-07
---

# 性能优化清单

覆盖从**写代码 → 打包 → 送到用户 → 用户使用**全链路的优化手段，按五个阶段分类：**编码、构建、交付、资源、运行时体验**。每一项只讲"怎么做"，原理细节见对应专题文章。

## 一、编码优化（怎么写代码）

### 1.1 JS 执行效率

| 措施 | 做法 |
|------|------|
| **缓存查找链** | 循环内把全局/属性值存进局部变量：`const len = arr.length` |
| **Map 代替分支** | 用对象/Map 查表代替长 if/else、switch 链：`const fn = { 'add': addFn }[op]` |
| **Map/Set 代替 includes** | 频繁判断存在性用 `Set.has`，O(1) 代替 O(n) |
| **避免重复计算** | 循环外提公共计算；计算结果缓存（记忆化） |
| **循环优化** | 提前 break/return 退出；减少循环体内函数调用 |
| **字符串拼接** | 用模板字符串/数组 join，避免 `+=` 拼接产生大量中间字符串 |
| **避免大对象拷贝** | 深拷贝开销大，能引用传递就别拷贝；`structuredClone` 慎用 |
| **大数据处理** | 同步任务超 50ms 就拆分（时间切片）或丢 Web Worker |

```javascript
// ❌ 每次循环都沿作用域链找 window 属性
for (let i = 0; i < arr.length; i++) { window.processItem(arr[i]) }

// ✅ 局部缓存
const len = arr.length, processItem = window.processItem
for (let i = 0; i < len; i++) { processItem(arr[i]) }

// ✅ Map 代替 if/else 链
const getColor = (status) => ({
  success: '#0f0', error: '#f00', pending: '#ff0',
}[status] ?? '#888')
```

### 1.2 DOM 操作优化

| 措施 | 做法 |
|------|------|
| **批量操作** | DocumentFragment 一次性插入，避免逐次 append 触发多次渲染 |
| **事件委托** | 列表事件挂父级，子元素事件冒泡统一处理 |
| **缓存查询结果** | `document.querySelector` 结果存变量，不在循环里重复查 |
| **读写分离** | 避免"读布局 → 写样式 → 再读布局"的强制同步布局，批量读再批量写 |
| **减少节点数** | 长列表用虚拟列表（详见[虚拟滚动](./virtual-list)）；视窗外内容用 `content-visibility: auto` |

```javascript
// ❌ 每插入一个都触发渲染
list.forEach(item => ul.appendChild(createLi(item)))

// ✅ 批量插入只渲染一次
const frag = document.createDocumentFragment()
list.forEach(item => frag.appendChild(createLi(item)))
ul.appendChild(frag)
```

```javascript
// ❌ 强制同步布局：读-写-读交替，每次读都强制重新计算布局
for (const el of els) {
  const h = el.offsetHeight   // 读
  el.style.height = h + 10 + 'px'  // 写
}

// ✅ 读写分离：先全部读，再全部写
const heights = els.map(el => el.offsetHeight)
els.forEach((el, i) => { el.style.height = heights[i] + 10 + 'px' })
```

### 1.3 渲染优化

| 措施 | 做法 |
|------|------|
| **批量改样式** | 用 class 切换代替逐条改 style，一次重排代替多次 |
| **动画用合成属性** | 只动 `transform`/`opacity`，不触发重排重绘 |
| **rAF 对齐帧边界** | 动画与屏幕刷新同步；scroll/resize 回调经 rAF 推迟到渲染管线入口执行，一帧最多一次 |
| **防抖/节流** | 高频事件（scroll/resize/input）用防抖节流降频 |
| **懒渲染** | 首屏只渲染可见内容；React 列表用时间切片分批渲染 |
| **低优先级任务** | 非关键任务用 `requestIdleCallback` 在空闲时执行 |

```javascript
// 防抖：停止触发后才执行（适合搜索）
function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 节流：固定频率执行（适合滚动）
function throttle(fn, interval = 100) {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= interval) { last = now; fn(...args) }
  }
}
```

**注意**：scroll/resize 已被浏览器与渲染帧同步（每帧最多一次），用上面的 rAF 对齐帧边界即可，**未必需要再节流**——节流反而可能让滚动响应变迟钝。防抖/节流主要针对 **input 这类无帧同步、触发频率可能远超帧率**的事件。

### 1.4 内存管理

| 措施 | 做法 |
|------|------|
| **清理监听器/定时器** | 组件卸载时 `removeEventListener`、`clearTimeout/Interval` |
| **闭包防误引用** | 长生命周期闭包不要捕获大对象/大数组 |
| **弱引用** | 缓存用 `WeakMap`/`WeakSet` 不阻止 GC；需要"取回对象但允许被回收"的场景用 `WeakRef` |
| **全局变量瘦身** | 挂在 window 上的数据及时释放 |

```javascript
// WeakRef：持有对象但不阻止 GC，deref 拿不到说明已被回收，重新创建
// 注意：WeakRef 不能遍历，所以用普通 Map 当容器，value 存 WeakRef
const bigObjCache = new Map() // key: 业务标识，value: WeakRef<大对象>

function getBigObject(key) {
  const ref = bigObjCache.get(key)
  if (ref) {
    const obj = ref.deref()
    if (obj) return obj        // 对象还活着，直接复用
  }
  const obj = createBigObject() // 已被回收，重新创建
  bigObjCache.set(key, new WeakRef(obj))
  return obj
}
```

## 二、构建优化（怎么打包）

### 2.1 体积控制

| 措施 | 做法 |
|------|------|
| **Tree Shaking** | 依赖必须用 ESM 才能摇树；`package.json` 配 `sideEffects: false` |
| **代码压缩** | terser/esbuild 压缩 + 移除 console/debugger（生产环境） |
| **产物分析** | `webpack-bundle-analyzer` / `vite-bundle-visualizer` 找出大依赖 |
| **按需引入** | 只引用的函数：`import { debounce } from 'lodash-es'`；组件库按需 |
| **替换重库** | moment → dayjs（缩小 300KB+）、大型 UI 库按需加载 |

```javascript
// package.json：明确无副作用，让打包器放心摇树
{
  "sideEffects": false
}
```

### 2.2 代码拆分

| 措施 | 做法 |
|------|------|
| **路由懒加载** | 每个路由一个 chunk，访问才加载 |
| **组件动态导入** | 大组件、弹窗、图表等 `import()` 按需 |
| **vendor 分包** | 框架（React/Vue）单独 chunk，利用长缓存 |
| **公共依赖提取** | monorepo 共享依赖单独分包，避免重复打入 |
| **预加载提示** | `webpackPreload`（当前页马上用）/ `webpackPrefetch`（下个页面用） |

```javascript
// React 路由懒加载
const Detail = lazy(() => import('./pages/Detail'))

// Vue 路由懒加载
const Detail = () => import('./pages/Detail.vue')

// 动态导入 + 预加载提示（webpack）
import(/* webpackPreload: true */ './heavy-module.js')
```

### 2.3 编译与构建效率

| 措施 | 做法 |
|------|------|
| **快速转译** | 用 esbuild/swc 替代 babel/tsc 做转译（快 10-100 倍） |
| **持久化缓存** | Webpack `cache: { type: 'filesystem' }`；Vite 默认缓存 node_modules 预构建 |
| **预编译** | Vue 模板预编译成 render 函数；模板字符串不运行时解析 |
| **编译期优化** | Vue3 静态提升、React Compiler 自动记忆化，减少运行时开销 |
| **增量构建** | 只编译变更部分，CI 里利用构建缓存 |

### 2.4 产物输出

| 措施 | 做法 |
|------|------|
| **内容指纹** | 文件名带 `contenthash`，内容不变缓存不失效 |
| **关键 CSS 内联** | critters / vite-plugin-critical 提取首屏 CSS 内联进 HTML |
| **CSS 分包** | 非关键 CSS 异步加载，`media="print" onload` 技巧 |
| **控制 polyfill** | `browserslist` 精确声明目标浏览器，别默认全量 polyfill |
| **双格式产物** | 现代浏览器跑 ESM，老浏览器跑降级包 |

```html
<!-- 非关键 CSS 异步加载 -->
<link rel="stylesheet" href="other.css" media="print" onload="this.media='all'">
```

## 三、交付优化（怎么送到用户）

### 3.1 网络传输

| 措施 | 做法 |
|------|------|
| **CDN** | 静态资源上 CDN，边缘节点就近返回 |
| **HTTP/2** | 多路复用消除队头阻塞、头部压缩；需要 HTTPS |
| **HTTP/3** | QUIC 协议，弱网/移动端体验更好 |
| **Brotli 压缩** | 比 Gzip 再小 15-20%，现代浏览器全支持 |
| **TLS 优化** | 会话复用（TLS 1.3 0-RTT）、OCSP 装订减少握手 |

```nginx
# Nginx：开启 Brotli（优先）与 Gzip（兜底）
brotli on;
brotli_comp_level 6;
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
```

### 3.2 缓存策略

| 措施 | 做法 |
|------|------|
| **强缓存 + 指纹** | 带 hash 的文件 `Cache-Control: max-age=31536000, immutable` |
| **协商缓存** | 无指纹文件用 ETag / Last-Modified 验证 |
| **Service Worker** | 预缓存壳资源、运行时缓存 API 响应，弱网可用 |
| **缓存分层** | 浏览器缓存 → 代理/CDN 边缘缓存 → 源站 |

```http
# 带内容指纹的静态资源：一年强缓存
Cache-Control: max-age=31536000, immutable

# 入口 HTML：不缓存，协商
Cache-Control: no-cache
ETag: "abc123"
```

### 3.3 加载策略

| 措施 | 做法 |
|------|------|
| **preload** | 当前页面马上要用的资源（LCP 图片、字体、关键脚本）提前加载 |
| **prefetch** | 下一跳页面要用的资源，空闲时低优先级预取 |
| **preconnect** | 提前建连跨域资源（DNS + TCP + TLS） |
| **dns-prefetch** | 只做 DNS 预解析，成本更低 |
| **async/defer** | 脚本异步加载不阻塞解析；defer 保顺序，async 不保 |
| **关键 CSS 内联** | 首屏样式内联，其余异步（见构建 2.4） |
| **SSR/SSG** | 首屏 HTML 直出，省去客户端首轮渲染 |
| **骨架屏** | 加载中先给结构占位，减少感知等待 |
| **fetchpriority** | 给 LCP 图片等关键资源提高加载优先级 |

```html
<!-- 关键资源提前加载 -->
<link rel="preload" as="image" href="/hero.webp">
<link rel="preload" as="font" href="/font.woff2" crossorigin>
<link rel="preload" as="script" href="/critical.js">

<!-- 下一跳预取 + 提前建连 -->
<link rel="prefetch" href="/next-page.js">
<link rel="preconnect" href="https://api.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- LCP 图片提高优先级 -->
<img src="/hero.webp" fetchpriority="high">
```

## 四、资源优化（图片 / 字体 / 视频）

### 4.1 图片

| 措施 | 做法 |
|------|------|
| **现代格式** | WebP（兼容广）、AVIF（更小）；SVG 用于图标/矢量 |
| **响应式尺寸** | `srcset` + `sizes` 按屏宽选图；CDN 支持裁剪缩放参数 |
| **懒加载** | 首选原生 `loading="lazy"`（配 CSS 占位防空白）；两阶段 LQIP 才用 IntersectionObserver |
| **防 CLS 占位** | 必须设置宽高或 `aspect-ratio`，否则加载后撑开页面 |
| **低质量占位** | LQIP 先显示模糊小图，清晰图到了再替换 |
| **合并请求** | 小图标雪碧图 / iconfont / 内联 base64（小图阈值内） |

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" width="1200" height="600" loading="lazy" alt="封面">
</picture>
```

**懒加载完整方案（原生优先）**：

```html
<!-- 原生懒加载一次到位，四件事配合：
     1. loading="lazy"：接近视口才下载，控制加载时机
     2. width/height + object-fit：占好尺寸，防 CLS（加载前布局不跳）
     3. 容器 CSS 背景放模糊占位图：未加载时不是空白，先看到占位
     4. onload 淡入：真实图就位后平滑过渡 -->
<div class="img-lazy" style="background: url('placeholder-blur.svg') center/cover; aspect-ratio: 2 / 1">
  <img
    src="real-photo.jpg"
    loading="lazy"
    width="1200"
    height="600"
    alt="照片"
    style="display: block; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s"
    onload="this.style.opacity = 1"
  >
</div>
```

**什么时候退回 IntersectionObserver 自定义**：需要**真正两阶段加载**（先显示 LQIP 小图、再换真实大图）时——原生懒加载只认 `src` 一个地址，做不到"先小图后大图"，必须用 `data-src` + JS：

```javascript
// 两阶段：src 放 LQIP 小图，进入视口才换真实图
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target
      img.src = img.dataset.src   // 把占位 src 换成真实地址
      observer.unobserve(img)     // 加载完就不再观察，避免重复触发
    }
  })
})
document.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img))
```

```html
<!-- 对应 HTML：src 是模糊小图（已加载），data-src 是真实图（进视口才加载） -->
<img data-src="real-photo.jpg" src="tiny-blur.jpg" width="1200" height="600" alt="照片">
```

**选型**：默认用原生方案（简单 + 防 CLS + 有占位）；只有"小图换大图"的两阶段体验才需要自定义。

### 4.2 字体

| 措施 | 做法 |
|------|------|
| **子集化** | 中文字体按使用字符裁剪（woff2 子集可省 90%+） |
| **格式** | 只用 woff2，体积最小且全兼容 |
| **font-display: swap** | 先用系统字体占位，避免 FOIT（文字不可见） |
| **preload 字体** | 首屏字体 preload，避免"晚到"导致文本延迟 |
| **系统字体优先** | 能用系统字体栈就不引自定义字体 |

```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+4E00-9FFF; /* 只加载用到的字符范围 */
}
```

### 4.3 视频与其他

| 措施 | 做法 |
|------|------|
| **视频懒加载** | `preload="none"`，点击播放才加载；首屏放封面图 |
| **自适应码率** | HLS/DASH 按网速切清晰度 |
| **第三方脚本** | 统计/客服/广告脚本延迟加载，控制数量和体积 |
| **WebAssembly** | 大模块按需加载，不随主包 |

## 五、运行时体验优化（用户怎么感觉）

### 5.1 交互响应

| 措施 | 做法 |
|------|------|
| **长任务拆分** | 单任务超 50ms 就分块（时间切片）或丢 Worker |
| **输入轻量化** | input 事件只做轻处理，重计算防抖后做 |
| **passive 监听** | scroll/touch 事件加 `{ passive: true }`，不阻塞滚动 |
| **事件委托** | 减少监听器数量（见编码 1.2） |

```javascript
// 长任务拆分：每帧只处理一部分，保证交互不被长时间阻塞
function processChunks(data, size = 100) {
  let index = 0
  function next() {
    const chunk = data.slice(index, index + size)
    chunk.forEach(heavyProcess)
    index += size
    if (index < data.length) {
      requestAnimationFrame(next)  // 每帧处理一块
    }
  }
  next()
}

// passive：明确告诉浏览器不阻止默认行为，滚动不再等 JS
window.addEventListener('scroll', onScroll, { passive: true })
```

**passive 的原理**：不加 passive 时，浏览器不确定监听器会不会调 `preventDefault()`，必须等主线程执行完所有监听器并确认后才让滚动继续——主线程忙（长任务）时事件排队，滚动就挂着，表现为卡顿。`passive: true` 相当于向浏览器承诺"我不阻止默认行为"，合成线程**完全不等**、即时滚动，事件照常异步派发（回调仍会执行，只是结果不影响滚动）。

| 写法 | 滚动是否等主线程 | 适用 |
|------|-----------------|------|
| 不加（默认） | 等，主线程忙时卡顿 | 需要 `preventDefault` 的手势场景 |
| `passive: true` | 不等，即时滚动 | 绝大多数 scroll/touch 监听 |
| `passive: false` | 明确等待 | 同默认，显式声明意图 |

**注意**：passive 监听器里调 `preventDefault()` 无效（控制台警告）。要阻止默认行为（自定义滚动容器、手势冲突）必须 `passive: false`。另外合成线程不会无限等——主线程超时不响应时浏览器会兜底直接滚动。

### 5.2 动画流畅

| 措施 | 做法 |
|------|------|
| **只动合成属性** | `transform`/`opacity` 动画不触发布局 |
| **will-change 适度** | 只对即将动画的元素开，用完移除（滥用浪费 GPU 内存） |
| **帧预算** | 动画期间避免长任务，保证 16ms 内完成一帧 |
| **rAF 驱动** | 动画循环用 rAF，不用 setInterval |

```css
/* 合成动画：只触发 Composite，不触发 Layout/Paint */
.card {
  transform: translateX(0);
  opacity: 1;
  transition: transform 0.3s, opacity 0.3s;
}
```

### 5.3 感知体验

| 措施 | 做法 |
|------|------|
| **骨架屏** | 内容加载前显示结构占位（交付 3.3） |
| **渐进渲染** | 先出框架后填数据，不让用户面对空白 |
| **加载反馈** | 交互后 100ms 内无结果就显示 loading，避免"点了没反应" |
| **首屏优先** | 首屏资源先加载，非首屏组件 Suspense 延迟 |

### 5.4 稳定性

| 措施 | 做法 |
|------|------|
| **页面缓存** | 列表页切详情返回保留滚动位置（keep-alive / 状态缓存） |
| **内存监控** | 长会话页面关注内存增长，及时释放（见编码 1.4） |
| **错误兜底** | 局部渲染失败不拖垮整页（ErrorBoundary） |

## 检查清单

### 编码

- [ ] 循环内无重复查找、无全局/属性重复访问
- [ ] 用 Map/Set 代替长 if/else 与 includes
- [ ] DOM 批量插入、事件委托
- [ ] 无强制同步布局（读写分离）
- [ ] 高频事件已防抖/节流，动画用 rAF
- [ ] 定时器/监听器随组件卸载清理

### 构建

- [ ] 开启 Tree Shaking（ESM + sideEffects）
- [ ] 路由/大组件懒加载，vendor 单独分包
- [ ] 产物已分析过（bundle-analyzer），无超大依赖
- [ ] 生产压缩开启，console 已移除
- [ ] 文件名带 contenthash，关键 CSS 已内联

### 交付

- [ ] 静态资源上 CDN，开启 HTTP/2 与 Brotli
- [ ] 带指纹资源强缓存 immutable，HTML 不缓存
- [ ] 关键资源 preload，跨域资源 preconnect
- [ ] 脚本 async/defer，无阻塞解析

### 资源

- [ ] 图片用 WebP/AVIF + srcset，设置了宽高
- [ ] 图片懒加载开启
- [ ] 字体子集化 + woff2 + font-display: swap
- [ ] 视频 preload="none"

### 运行时体验

- [ ] 无超 50ms 长任务（Lighthouse 检查）
- [ ] 动画只动 transform/opacity
- [ ] 有骨架屏/加载反馈
- [ ] 页面状态缓存，返回不丢位置

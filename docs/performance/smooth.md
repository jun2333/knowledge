---
title: 如何让网页更丝滑
date: 2023-03-08
---

# 如何让网页更丝滑

本文讲解如何优化网页的流畅度，避免卡顿和掉帧。

## RAIL 指标

Google 提出的性能模型，关注用户体验：

| 指标 | 目标 | 说明 |
|------|------|------|
| **Response** | 100ms | 用户交互后 100ms 内响应 |
| **Animation** | 16.7ms | 动画每帧 16.7ms（60fps） |
| **Idle** | 50ms | 空闲任务分片，每片不超过 50ms |
| **Load** | 1000ms | 页面 1 秒内可交互 |

## 交互类型

### 主动交互 vs 被动交互

| 类型 | 例子 | 优先级 |
|------|------|--------|
| **主动交互** | 点击、滚动、键盘输入 | 高 |
| **被动交互** | 动画、Long Task | 低 |

**核心原则**：JS 是单线程的，必须保证**主动交互优先于被动交互**。

```javascript
// ❌ Long Task 阻塞用户交互
button.addEventListener('click', () => {
  // 耗时 200ms 的计算
  for (let i = 0; i < 1000000; i++) { }
});

// ✅ Time Slicing 拆分任务
button.addEventListener('click', () => {
  let index = 0;
  function processChunk() {
    const chunk = data.slice(index, index + 100);
    chunk.forEach(process);
    index += 100;
    if (index < data.length) {
      requestIdleCallback(processChunk); // 空闲时继续
    }
  }
  processChunk();
});
```

## 像素管道（Rendering Pipeline）

浏览器渲染页面的 5 个步骤：

```
JavaScript → Style → Layout → Paint → Composite
```

| 步骤 | 说明 | 触发条件 |
|------|------|---------|
| **JavaScript** | 执行 JS 代码 | 脚本执行 |
| **Style** | 计算样式 | DOM 变化、样式变化 |
| **Layout** | 计算几何信息（位置、大小） | 几何属性变化 |
| **Paint** | 绘制像素（填充、阴影） | 外观属性变化 |
| **Composite** | 合成图层 | transform、opacity |

**优化目标**：尽量跳过前面的步骤，只做 Composite（最快）。

## 优化方案

### 1. 使用高性能 CSS 选择器

```css
/* ❌ 慢：从右到左匹配，效率低 */
.container .item .text { }

/* ✅ 快：直接选择 */
.text { }

/* ❌ 慢：通配符选择器 */
* { }

/* ✅ 快：类选择器 */
.active { }
```

**原则**：
- 避免过深的选择器嵌套
- 优先使用类选择器
- 避免通配符选择器

### 2. 避免布局抖动（Layout Thrashing）

布局抖动：在 JS 中交替读写 DOM 几何属性，导致多次 Layout。

```javascript
// ❌ 布局抖动：读写交替
elements.forEach(el => {
  const width = el.offsetWidth;  // 读（触发 Layout）
  el.style.width = width + 10 + 'px';  // 写（触发 Layout）
});

// ✅ 批量读，批量写
const widths = elements.map(el => el.offsetWidth);  // 批量读
elements.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px';  // 批量写
});
```

**常见触发 Layout 的属性**：
- 读：`offsetWidth`、`offsetHeight`、`scrollTop`、`getComputedStyle()`
- 写：`width`、`height`、`margin`、`padding`

### 3. 合成代替绘制

通过开启 GPU 加速图层，让浏览器只做 Composite，跳过 Paint。

```css
/* 开启 GPU 加速 */
.element {
  transform: translateZ(0);
  /* 或 */
  will-change: transform;
}
```

**原理**：
- `transform` 和 `opacity` 只触发 Composite
- 其他属性（如 `width`、`background`）会触发 Paint

**注意**：不要滥用 `will-change`，会占用内存。

### 4. 使用 requestAnimationFrame

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

**优势**：
- 在渲染前执行，确保属性计算及时
- 与屏幕刷新率同步（通常 60fps）
- 后台标签页自动暂停

### 5. Web Worker 处理计算密集型任务

```javascript
// main.js
const worker = new Worker('worker.js');
worker.postMessage(data);
worker.onmessage = (e) => {
  console.log('计算结果：', e.data);
};

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

**适用场景**：
- 大量数据处理
- 复杂计算
- 不影响主线程交互

## 总结

| 优化 | 效果 |
|------|------|
| 高性能 CSS 选择器 | 加速 Style 计算 |
| 避免布局抖动 | 减少 Layout 次数 |
| 合成代替绘制 | 跳过 Paint，只做 Composite |
| rAF 代替 setInterval | 避免掉帧 |
| Web Worker / Time Slicing | 避免 Long Task 阻塞交互 |

**核心目标**：每帧 16.7ms 内完成所有工作，保证 60fps 流畅体验。

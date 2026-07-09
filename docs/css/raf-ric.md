---
title: rAF 和 rIC
date: 2023-03-08
---

# rAF 和 rIC

`requestAnimationFrame` (rAF) 和 `requestIdleCallback` (rIC) 是两个用于优化浏览器性能的 API，分别在渲染前和空闲时执行任务。

## requestAnimationFrame (rAF)

在浏览器每次重新渲染**之前**执行，用于做流畅的动画。

### 为什么用 rAF 而不是定时器？

```javascript
// ❌ 定时器 - 可能在渲染周期的任意时刻执行
setInterval(() => {
  element.style.left = `${x}px`;
}, 16);

// ✅ rAF - 在渲染前执行，确保动画及时响应
function animate() {
  element.style.left = `${x}px`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

**优势**：
- 在渲染前计算 CSS 属性，避免掉帧
- 浏览器自动优化（后台标签页暂停）
- 与屏幕刷新率同步（通常 60fps）

### 使用示例

```javascript
function animate() {
  // 更新动画状态
  element.style.transform = `translateX(${x}px)`;
  
  // 继续下一帧
  requestAnimationFrame(animate);
}

// 启动动画
requestAnimationFrame(animate);

// 取消动画
const id = requestAnimationFrame(animate);
cancelAnimationFrame(id);
```

## requestIdleCallback (rIC)

用于执行**优先级低**的任务，不阻塞渲染，在浏览器空闲时执行。

### 基本用法

```javascript
function idleTask(deadline) {
  // deadline.timeRemaining() 返回剩余空闲时间（毫秒）
  while (deadline.timeRemaining() > 0) {
    // 执行低优先级任务
    doWork();
  }
  
  // 如果还有任务，继续请求空闲时间
  if (hasMoreWork()) {
    requestIdleCallback(idleTask);
  }
}

requestIdleCallback(idleTask);
```

### 关键特性

- **剩余时间**：`deadline.timeRemaining()` 返回当前空闲时间
- **最大 50ms**：即使浏览器很空闲，最多给 50ms（避免用户突然交互时无法响应）
- **动态变化**：剩余时间随浏览器繁忙程度变化

### 带 timeout 的 rIC

```javascript
// 1000ms 后必须执行，即使浏览器不空闲
requestIdleCallback(idleTask, { timeout: 1000 });
```

## rAF 和 rIC 在事件循环中的位置

```
1. 取出一个宏任务执行
2. 不断执行微任务，直到微任务队列清空
3. 判断是否需要渲染（浏览器决定）
4. 文档尺寸变化 → resize 回调
5. 文档滚动 → scroll 回调
6. 执行 rAF 回调（渲染前）
7. 执行 IntersectionObserver 回调
8. 重新绘制页面
9. 若任务队列都空了 → 执行 rIC 回调（空闲时）
```

## 重要结论

| 结论 | 说明 |
|------|------|
| **事件循环不一定每轮都渲染** | 浏览器根据刷新率、性能、是否后台决定是否渲染 |
| **rAF 在渲染前执行** | 适合做动画，确保属性计算在渲染前完成 |
| **rIC 在渲染后空闲时执行** | 适合低优先级任务，执行频率取决于浏览器空闲程度 |
| **resize/scroll 自带节流** | 只在渲染阶段派发事件，不会每帧都触发 |

## 使用场景对比

| API | 适用场景 | 执行时机 |
|-----|---------|---------|
| **rAF** | 动画、平滑滚动、Canvas 绘制 | 渲染前 |
| **rIC** | 数据预加载、日志上报、非关键计算 | 空闲时 |

## 浏览器支持

| API | Chrome | Firefox | Safari |
|-----|--------|---------|--------|
| rAF | 24+ | 23+ | 6+ |
| rIC | 47+ | 55+ |  不支持 |

::: warning 注意
Safari 不支持 rIC，生产环境使用需要 polyfill 或降级方案。
:::

---
title: 性能指标
date: 2023-03-08
---

# 性能指标

本文总结 Web 性能的各种指标及其含义。

## 指标分类

| 分类 | 指标 | 关注点 |
|------|------|--------|
| **传统指标** | Load、DOMReady、TTFB | 技术细节 |
| **渲染指标** | FP、FCP、LCP、FMP、SI | 用户看到什么 |
| **交互指标** | TTI、TBT、FID、INP | 用户能否交互 |
| **稳定性指标** | CLS | 页面是否稳定 |

## 传统性能指标

关注请求过程各阶段的耗时，但无法反映用户真正关心的体验。

### 各阶段耗时

| 阶段 | 说明 |
|------|------|
| 重定向耗时 | redirectStart → redirectEnd |
| 缓存耗时 | fetchStart → domainLookupStart |
| DNS 解析耗时 | domainLookupStart → domainLookupEnd |
| TCP 连接耗时 | connectStart → connectEnd |
| SSL 握手耗时 | connectEnd → requestStart |
| 请求响应耗时 | requestStart → responseEnd |

### 常用指标

| 指标 | 说明 |
|------|------|
| **Load** | 页面完全加载耗时 |
| **DOMReady** | DOM 解析完成（DOMContentLoaded） |
| **TTFB** | Time to First Byte，发出请求到接收到第一个字节的时间 |

## 以用户为中心的性能指标

### 何时开始渲染

#### FP（First Paint）

- **全称**：首次绘制
- **说明**：浏览器渲染第一个像素的时间
- **目标**：0-1000ms

#### FCP（First Contentful Paint）

- **全称**：首次内容绘制
- **说明**：首次有内容（文字、图片等）渲染的时间
- **目标**：0-1800ms
- **与 FP 的区别**：FCP 包含实际内容（文字、图片），FP 可能只是背景色

```javascript
new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  console.log('FCP:', entries[0].startTime);
}).observe({ type: 'paint', buffered: true });
```

### 何时渲染出主要内容

#### FMP（First Meaningful Paint）

- **全称**：首次有意义绘制
- **说明**：页面主要内容和布局渲染完成的时间
- **状态**：Lighthouse 6.0 已废弃（计算复杂，准确性差）

**计算原理**：
1. 使用 `MutationObserver` 监听 DOM 变化
2. 计算每次变化后 DOM 树的"分数"
3. 分数变化最剧烈的时刻即为 FMP

#### LCP（Largest Contentful Paint）

- **全称**：最大内容绘制
- **说明**：可视区域内最大内容元素可见的时间
- **目标**：0-2500ms
- **推荐**：替代 FMP，API 原生支持，计算简单准确

```javascript
new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

#### SI（Speed Index）

- **全称**：速度指数
- **说明**：衡量页面可视区域内容填充的速度
- **用途**：比较两个页面的渐进加载体验

#### FMP vs LCP vs SI

| 指标 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **FMP** | 反映主要内容 | 计算复杂，准确性差 | ❌ 不推荐 |
| **LCP** | API 支持，计算简单 | 最大内容不一定是核心内容 | ✅ 推荐 |
| **SI** | 反映加载体验 | 计算复杂，难以解释 | ️ 实验室用 |

**结论**：推荐使用 **LCP** 衡量主要内容渲染时间。

### 何时可以交互

#### TTI（Time to Interactive）

- **全称**：可交互时间
- **说明**：页面从开始加载到能够快速、可靠响应用户输入的时间
- **目标**：0-3800ms

**计算方法**：
1. 从 FCP 后开始计算
2. 持续 5 秒内无长任务（>50ms）且无 2 个以上 GET 请求
3. 往前回溯至 5 秒前的最后一个长任务结束时间

#### TBT（Total Blocking Time）

- **全称**：总阻塞时间
- **说明**：FCP 到 TTI 之间所有长任务的阻塞时间总和
- **目标**：0-200ms

```
TBT = Σ(长任务执行时间 - 50ms)
```

**长任务**：执行时间超过 50ms 的任务。

#### TTI vs TBT

| 指标 | 说明 | 使用场景 |
|------|------|---------|
| **TTI** | 页面完全可交互的时间 | 衡量整体加载体验 |
| **TBT** | 主线程被阻塞的总时间 | 衡量交互延迟 |

### 交互是否有延迟

#### FID（First Input Delay）

- **全称**：首次输入延迟
- **说明**：用户首次交互到浏览器响应的时间
- **目标**：0-100ms
- **状态**：2024 年 3 月被 INP 替代

```javascript
new PerformanceObserver((list) => {
  const firstInput = list.getEntries()[0];
  const fid = firstInput.processingStart - firstInput.startTime;
  console.log('FID:', fid);
}).observe({ type: 'first-input', buffered: true });
```

#### INP（Interaction to Next Paint）

- **全称**：交互到下次绘制
- **说明**：测量所有交互的延迟（取第 98 百分位）
- **目标**：0-200ms
- **优势**：比 FID 更全面（FID 只测首次）

**测量方式**：

```javascript
// 方式 1：使用 web-vitals 库（推荐）
import { onINP } from 'web-vitals';

onINP((metric) => {
  console.log('INP:', metric.value);
});

// 方式 2：手动测量（监听多种交互事件）
let inpValue = 0;
const interactionEntries = [];

['click', 'keydown', 'pointerdown'].forEach(type => {
  document.addEventListener(type, (event) => {
    const startTime = performance.now();
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const delay = performance.now() - startTime;
        interactionEntries.push(delay);
        
        // 取第 98 百分位
        interactionEntries.sort((a, b) => a - b);
        const index = Math.floor(interactionEntries.length * 0.98);
        inpValue = interactionEntries[index] || 0;
      });
    });
  }, { capture: true, passive: true });
});
```

::: warning 注意
INP 没有像 FID 那样的单一 API（`first-input`），需要监听多种交互事件并计算第 98 百分位。推荐使用 `web-vitals` 库。
:::

### 页面是否稳定

#### CLS（Cumulative Layout Shift）

- **全称**：累积布局偏移
- **说明**：页面加载期间，视口中元素移动程度的累积得分
- **目标**：0-0.1

**常见原因**：
- 图片未设置宽高
- 动态插入广告
- 字体加载导致重排
- 异步加载内容

```javascript
let clsValue = 0;

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
    }
  }
  console.log('CLS:', clsValue);
}).observe({ type: 'layout-shift', buffered: true });
```

## 指标对比总结

| 场景 | 推荐指标 | 目标值 |
|------|---------|--------|
| **页面加载** | LCP | 0-2500ms |
| **交互延迟** | INP（替代 FID） | 0-200ms |
| **页面稳定** | CLS | 0-0.1 |
| **可交互时间** | TTI | 0-3800ms |
| **阻塞时间** | TBT | 0-200ms |
| **首次内容** | FCP | 0-1800ms |

## Core Web Vitals（2024）

Google 提出的三个核心指标：

| 指标 | 说明 | 权重 |
|------|------|------|
| **LCP** | 加载性能 | 25% |
| **INP** | 交互体验 | 25% |
| **CLS** | 视觉稳定性 | 25% |

### 测量工具

| 工具 | 类型 | 说明 |
|------|------|------|
| **Lighthouse** | 实验室工具 | Chrome DevTools 内置，模拟环境测试 |
| **PageSpeed Insights** | 在线工具 | 输入 URL 即可查看，包含真实用户数据（CrUX） |
| **Chrome DevTools** | 浏览器工具 | Performance 面板，实时测量 |
| **Search Console** | SEO 工具 | 查看网站的 Core Web Vitals 报告 |
| **web-vitals 库** | 代码库 | 在代码中测量并上报 |

**PageSpeed Insights**：https://pagespeed.web.dev/

**Search Console 路径**：体验 → 核心网页指标

::: tip 提示
这三个指标是 SEO 排名的重要因素，建议重点优化。使用 PageSpeed Insights 可以快速查看网站的 Core Web Vitals 表现。
:::

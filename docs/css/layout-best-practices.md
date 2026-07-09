---
title: 常见布局最佳实践
date: 2023-03-08
---

# 常见布局最佳实践

本文总结前端开发中常见的布局模式及其最佳实践。

## 常见布局模式

### 1. 水平垂直居中

#### Flex 方案（推荐）

```css
.parent {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
```

#### Grid 方案

```css
.parent {
  display: grid;
  place-items: center;
  min-height: 100vh;
}
```

#### 绝对定位 + transform

```css
.parent {
  position: relative;
}

.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

#### 绝对定位 + margin auto

```css
.parent {
  position: relative;
}

.child {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  width: 200px;
  height: 200px;
}
```

### 2. 圣杯布局

三栏布局，左右固定宽度，中间自适应，中间栏优先渲染。

```html
<div class="container">
  <div class="main">主内容</div>
  <div class="left">左侧栏</div>
  <div class="right">右侧栏</div>
</div>
```

```css
.container {
  display: flex;
}

.main {
  flex: 1;
  order: 2;
}

.left {
  width: 200px;
  order: 1;
}

.right {
  width: 200px;
  order: 3;
}
```

### 3. 双飞翼布局

与圣杯布局类似，但通过嵌套 div 解决中间栏内容被遮挡问题。

```html
<div class="container">
  <div class="main-wrapper">
    <div class="main">主内容</div>
  </div>
  <div class="left">左侧栏</div>
  <div class="right">右侧栏</div>
</div>
```

```css
.container {
  display: flex;
}

.main-wrapper {
  flex: 1;
}

.main {
  margin: 0 200px; /* 留出左右栏空间 */
}

.left {
  width: 200px;
  margin-left: -100%;
}

.right {
  width: 200px;
  margin-left: -200px;
}
```

**负 margin 原理**：

负 margin 会让元素"往回拉"，从下一行飞到上一行。

**初始状态（没有负 margin）**：

```
┌─────────────────────────────────┐
│         main (100%)             │  ← 占满一行
└─────────────────────────────────┘
┌──────────┐
│   left   │  ← 被挤到下一行
└──────────┘
         ┌──────────┐
         │   right  │  ← 也在下一行
         └──────────┘
```

**应用负 margin 后**：

```
┌──────────┬─────────────────────────────────┬──────────┐
│   left   │         main (100%)             │   right  │
│ margin-left: -100%                         │ margin-left: -200px
└───────────────────────────────────────────┴──────────┘
```

**具体步骤**：

1. **main-wrapper** 占满 100% 宽度，main 有左右 margin 留出空间
2. **left** 设置 `margin-left: -100%`，向左移动父容器宽度，飞到第一行最左边
3. **right** 设置 `margin-left: -200px`，向左移动 200px，飞到第一行最右边

::: tip 提示
现代布局中，圣杯布局和双飞翼布局都可以用 Flex 或 Grid 更简单地实现，上述传统方案主要用于理解历史背景。
:::

### 4. 固定头部 + 可滚动内容

```html
<div class="layout">
  <header class="header">固定头部</header>
  <main class="content">可滚动内容</main>
</div>
```

#### Flex 方案

```css
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  flex-shrink: 0; /* 不缩小 */
  height: 60px;
}

.content {
  flex: 1;
  overflow-y: auto;
}
```

#### Grid 方案

```css
.layout {
  display: grid;
  grid-template-rows: 60px 1fr;
  height: 100vh;
}

.content {
  overflow-y: auto;
}
```

### 5. 等高列布局

多列布局中，让所有列高度一致。

#### Flex 方案（默认就是等高）

```css
.container {
  display: flex;
}

.column {
  flex: 1;
}
```

#### Grid 方案（默认就是等高）

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
```

## 响应式布局

### 媒体查询

```css
/* 移动优先 */
.container {
  width: 100%;
  padding: 16px;
}

/* 平板 */
@media (min-width: 768px) {
  .container {
    width: 750px;
    margin: 0 auto;
  }
}

/* 桌面 */
@media (min-width: 1024px) {
  .container {
    width: 1200px;
  }
}
```

### 移动优先 vs 桌面优先

| 策略 | 写法 | 适用场景 |
|------|------|---------|
| **移动优先** | `min-width` 媒体查询 | 移动端用户为主的产品 |
| **桌面优先** | `max-width` 媒体查询 | 桌面端用户为主的产品 |

**移动优先示例**：

```css
/* 默认样式（移动端） */
.card {
  flex-direction: column;
}

/* 平板及以上 */
@media (min-width: 768px) {
  .card {
    flex-direction: row;
  }
}
```

### 响应式断点参考

| 设备 | 断点 |
|------|------|
| 手机 | < 768px |
| 平板 | 768px - 1024px |
| 桌面 | > 1024px |
| 大屏 | > 1440px |

### Grid 响应式布局

```css
.container {
  display: grid;
  /* 自动填充，每列最小 200px，最大 1fr */
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
```

无需媒体查询，自动适应不同屏幕宽度。

## 布局方案选择指南

| 场景 | 推荐方案 |
|------|---------|
| 水平垂直居中 | Flex 或 Grid |
| 导航栏 | Flex |
| 卡片列表 | Flex wrap 或 Grid |
| 页面整体布局 | Grid |
| 表单布局 | Grid |
| 响应式多列 | Grid `auto-fit` |
| 固定头部 + 滚动内容 | Flex column 或 Grid rows |

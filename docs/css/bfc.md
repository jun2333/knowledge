---
title: BFC 块级格式化上下文
date: 2023-03-08
---

# BFC 块级格式化上下文

BFC（Block Formatting Context，块级格式化上下文）是 Web 页面的可视化 CSS 渲染的一部分，是块盒子的布局过程发生的区域，也是浮动元素与其他元素交互的区域。

理解 BFC 有助于解决以下常见问题：
- margin 重叠
- 浮动元素导致父容器高度塌陷
- 自适应两栏布局

## BFC 渲染规则

可以把 BFC 想象成一个**"独立结界"**，核心特性是：**BFC 是一个隔离的独立容器，内外互不影响**。

在这个结界里：

1. **子元素从上到下排**（垂直排列）
2. **相邻元素的垂直 margin 会合并**（同结界内才合并，不同结界不合并）
3. **子元素左边贴着结界左边**（浮动元素也遵守，但 `position: absolute` 可以突破结界）
4. **结界会避开浮动元素**（不跟浮动重叠）
5. **结界的高度会把浮动子元素算进去**（不会高度塌陷）

**一句话总结**：BFC 就是个独立容器，内部元素自己排，外部浮动进不来，内部浮动出不去。

### 核心作用

| 问题 | BFC 的作用 |
|------|-----------|
| margin 重叠 | 不同 BFC 的 margin 不重叠 |
| 浮动导致高度塌陷 | BFC 会包含浮动子元素 |
| 自适应布局 | BFC 区域不跟浮动重叠 |


## 产生条件

以下条件会创建新的 BFC：

1. 根元素（`<html>`）
2. `float` 属性不为 `none`
3. `position` 属性为 `absolute` 或 `fixed`
4. `display` 属性为以下值之一：
   - `inline-block`、`table-cell`、`table-caption`
   - `flex`、`inline-flex`、`grid`、`inline-grid`
   - **`flow-root`**（推荐，专门用于创建 BFC，无副作用）
5. `overflow` 属性不为 `visible`（如 `auto`、`hidden`、`scroll`）

::: tip 最佳实践
现代 CSS 中，如果只需要创建 BFC 而不需要其他副作用，推荐使用 `display: flow-root`。它语义明确，不会像 `overflow: hidden` 那样可能裁剪内容，也不会像 `float` 那样让元素脱离文档流。
:::

## 应用场景

### 1. 自适应两栏布局

利用 BFC 不与浮动元素重叠的特性，可以实现自适应两栏布局：

```html
<div class="container">
  <div class="sidebar">侧边栏（固定宽度）</div>
  <div class="main">主内容区（自适应宽度）</div>
</div>
```

```css
.sidebar {
  float: left;
  width: 200px;
}

.main {
  display: flow-root; /* 创建 BFC */
  /* 或者使用 overflow: hidden */
}
```

`.main` 创建 BFC 后，会自动占据剩余空间，实现自适应宽度。

### 2. 解决 margin 重叠问题

属于同一个 BFC 的两个相邻元素，垂直方向的 margin 会重叠。将它们放入不同的 BFC 可以解决这个问题：

```html
<div class="parent">
  <div class="child1">元素1</div>
  <div class="wrapper">
    <div class="child2">元素2</div>
  </div>
</div>
```

```css
.wrapper {
  display: flow-root; /* 创建新的 BFC */
}

.child1 {
  margin-bottom: 20px;
}

.child2 {
  margin-top: 30px;
}
```

现在两个元素的 margin 不会重叠，间距为 50px（20px + 30px）。

### 3. 清除内部浮动（防止高度塌陷）

当父容器内的子元素浮动时，父容器高度会塌陷。让父容器创建 BFC 可以包含浮动子元素：

```html
<div class="parent">
  <div class="float-child">浮动子元素</div>
</div>
```

```css
.parent {
  display: flow-root; /* 创建 BFC，包含浮动子元素 */
}

.float-child {
  float: left;
  width: 100px;
  height: 100px;
}
```

父容器创建 BFC 后，计算高度时会包含浮动子元素，防止高度塌陷。
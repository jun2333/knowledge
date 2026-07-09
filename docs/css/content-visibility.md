---
title: Content Visibility
date: 2023-03-08
---

# Content Visibility

`content-visibility` 是 CSS3 新增的属性，用于控制元素是否渲染其内容，可以显著提升长页面的渲染性能。

## 属性值

```css
.element {
  content-visibility: visible;  /* 默认，正常渲染 */
  content-visibility: hidden;   /* 跳过渲染 */
  content-visibility: auto;     /* 自动，可视区域内渲染 */
}
```

## 对比其他隐藏方案

### content-visibility: hidden vs display: none

| 特性 | content-visibility: hidden | display: none |
|------|---------------------------|---------------|
| DOM 存在 | ✅ 元素在 DOM 中 | ❌ 元素不在渲染树中 |
| 内容渲染 | ❌ 不渲染 | ❌ 不渲染 |
| 高度 | 0 | 0 |
| 切换性能 | 快（跳过渲染） | 慢（重新布局） |

```css
/* content-visibility: hidden - 元素在 DOM 中，但不渲染内容 */
.hidden {
  content-visibility: hidden;
}

/* display: none - 元素完全从渲染树中移除 */
.none {
  display: none;
}
```

### content-visibility: hidden vs visibility: hidden

| 特性 | content-visibility: hidden | visibility: hidden |
|------|---------------------------|-------------------|
| 内容渲染 | ❌ 不渲染 | ✅ 渲染（只是不显示） |
| 高度 | 0 | 保持原有高度 |
| 占据空间 |  不占据 | ✅ 占据 |

```css
/* content-visibility: hidden - 高度为 0 */
.cv-hidden {
  content-visibility: hidden;
}

/* visibility: hidden - 高度保持，只是看不见 */
.v-hidden {
  visibility: hidden;
}
```

## content-visibility: auto

`auto` 值相当于 CSS 提供了**原生虚拟列表**支持：

- **可视区域内**的元素：正常渲染
- **可视区域外**的元素：跳过渲染

```css
.long-list .item {
  content-visibility: auto;
}
```

**性能提升**：对于长列表/长页面，可以显著减少初始渲染时间。

## 滚动抖动问题

区域外的元素高度为 0，滚动到视窗内时高度会突然变化，导致视觉抖动。

**解决方案**：使用 `contain-intrinsic-size` 设置预估宽高。

```css
.long-list .item {
  content-visibility: auto;
  contain-intrinsic-size: 100px 200px; /* 宽 100px，高 200px */
}
```

这样即使元素未渲染，也会占据预估的空间，避免滚动抖动。

## 常见问题

### 1. 使用之后占用内存是否减少？

**不会**。元素仍在 DOM 中，只是跳过渲染阶段。内存占用不变，但渲染性能提升。

### 2. 元素内容隐藏，脚本是否能正常加载？

**能**。`content-visibility` 仅仅影响渲染，不影响脚本加载和执行。

```html
<div style="content-visibility: hidden">
  <script>
    // 这个脚本会正常执行
    console.log('脚本已执行');
  </script>
</div>
```

### 3. 可访问性如何？

**可访问**。在视窗外的元素虽然没有渲染，但仍然在文档模型树中存在，屏幕阅读器可以访问。

## 浏览器支持

| 浏览器 | 版本 | 内核 |
|--------|------|------|
| Chrome | 85+ | Chromium (Blink) |
| Edge | 85+ | Chromium (Blink) |
| Opera | 71+ | Chromium (Blink) |
| Firefox | ❌ 不支持 | Gecko |
| Safari | ❌ 不支持 | WebKit |

::: warning 注意
目前只有 **Chromium 内核**浏览器支持，Firefox（Gecko）和 Safari（WebKit）都不支持。生产环境使用需要检测兼容性。
:::

## 使用建议

**适用场景**：
- 长列表（如商品列表、新闻列表）
- 长文章/文档页面
- 虚拟列表的替代方案

**不适用场景**：
- 需要精确控制滚动位置的场景
- 需要支持 Firefox/Safari 的场景

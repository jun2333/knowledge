---
title: IFC 行内格式化上下文
date: 2023-03-08
---

# IFC 行内格式化上下文

IFC（Inline Formatting Context，行内格式化上下文）是块级容器内部仅包含行内级元素时形成的格式化上下文。

## IFC 的形成条件

块级元素中**仅包含内联级别元素**时，会形成 IFC。

::: warning 注意
当 IFC 中有块级元素插入时，会产生两个匿名块将父元素分割开来，产生两个 IFC。
:::

## IFC 渲染规则

1. **水平排列**：子元素在水平方向上一个接一个排列，垂直方向上从容器顶部开始向下排列
2. **宽高限制**：行内元素无法声明宽高，`margin` 和 `padding` 在水平方向有效，垂直方向无效
3. **垂直对齐**：节点在垂直方向上以不同形式对齐（由 `vertical-align` 控制）
4. **线盒（line box）**：能包含一行上所有框的矩形区域。线盒的宽度由包含块和其中的浮动元素决定
5. **浮动优先**：IFC 中的 line box 一般左右边贴紧包含块，但浮动元素会优先排列
6. **高度计算**：line box 高度由 `line-height` 计算规则确定，同一个 IFC 下的多个 line box 高度可能不同
7. **水平对齐**：当内联级盒子的总宽度少于包含它们的 line box 时，水平渲染规则由 `text-align` 属性决定
8. **换行处理**：当内联盒子超过父元素宽度时，会被分割成多个盒子分布在多个 line box 中。如果子元素设置了 `white-space: nowrap`（强制不换行），inline box 将不可被分割，会溢出父元素

## 应用场景

### 1. 水平居中

当一个块要在环境中水平居中时，设置其为 `inline-block` 则会在外层产生 IFC，通过 `text-align` 则可以使其水平居中：

```html
<div class="parent">
  <div class="child">居中元素</div>
</div>
```

```css
.parent {
  text-align: center; /* 创建 IFC，控制内部行内元素水平居中 */
}

.child {
  display: inline-block; /* 使块级元素变成行内块，参与 IFC 布局 */
}
```

### 2. 垂直居中

创建一个 IFC，用其中一个元素撑开父元素的高度，然后设置其 `vertical-align: middle`，其他行内元素则可以在此父元素下垂直居中：

```html
<div class="parent">
  <div class="stretcher"></div>
  <div class="centered">垂直居中元素</div>
</div>
```

```css
.parent {
  height: 200px;
  font-size: 0; /* 消除空白字符间隙 */
}

.stretcher {
  display: inline-block;
  height: 100%;
  vertical-align: middle; /* 撑开高度并设置垂直对齐 */
}

.centered {
  display: inline-block;
  vertical-align: middle; /* 与 stretcher 对齐，实现垂直居中 */
  font-size: 16px; /* 恢复字体大小 */
}
```

::: tip 提示
现代 CSS 中，垂直居中更推荐使用 Flexbox 或 Grid 布局，代码更简洁：

```css
.parent {
  display: flex;
  align-items: center;
  justify-content: center;
}
```
:::
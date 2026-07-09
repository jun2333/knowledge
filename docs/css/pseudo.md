---
title: 伪类与伪元素
date: 2023-03-08
---

# 伪类与伪元素

## 核心区别

| 特性 | 伪类 | 伪元素 |
|------|------|--------|
| **操作对象** | 文档树中已有的元素 | 创建文档树外的新元素 |
| **语法** | 单冒号 `:hover` | 双冒号 `::before`（CSS3） |
| **数量** | 一个元素可以有多个伪类 | 一个元素只能有一个 `::before` 和一个 `::after` |
| **本质** | 选择元素的某种状态 | 创建一个虚拟元素 |

**一句话总结**：伪类选择元素的**状态**，伪元素创建**虚拟元素**。

## 伪类（Pseudo-classes）

伪类用于选择元素的特定状态，也叫**伪类选择器**。

::: tip 说明
伪类本身就是选择器的一种，完整叫法是"伪类选择器"。CSS 选择器包括：元素选择器（`div`）、类选择器（`.class`）、ID 选择器（`#id`）、属性选择器（`[href]`）、伪类选择器（`:hover`）、伪元素选择器（`::before`）。
:::

### 用户行为伪类

```css
a:hover { color: red; }      /* 鼠标悬停 */
a:active { color: blue; }    /* 点击时 */
a:visited { color: purple; } /* 已访问 */
a:focus { outline: none; }   /* 获得焦点 */
```

### 结构伪类

```css
li:first-child { }    /* 第一个子元素 */
li:last-child { }     /* 最后一个子元素 */
li:nth-child(2) { }   /* 第 2 个子元素 */
li:nth-child(odd) { } /* 奇数个子元素 */
li:nth-child(even) { } /* 偶数个子元素 */
li:nth-child(3n) { }  /* 每 3 个 */
```

### 表单伪类

```css
input:enabled { }    /* 可用状态 */
input:disabled { }   /* 禁用状态 */
input:checked { }    /* 选中状态 */
input:required { }   /* 必填项 */
input:valid { }      /* 验证通过 */
input:invalid { }    /* 验证失败 */
```

### 其他伪类

```css
:not(.active) { }    /* 否定伪类 */
:empty { }           /* 空元素 */
:target { }          /* 锚点目标 */
```

## 伪元素（Pseudo-elements）

伪元素用于创建虚拟元素。

### ::before 和 ::after

最常用的伪元素，用于在元素内容前后插入内容。

```css
.icon::before {
  content: '★';
  color: gold;
}

.clearfix::after {
  content: '';
  display: table;
  clear: both;
}
```

**注意**：必须设置 `content` 属性，即使为空字符串。

### ::first-letter

选择文本块的第一个字母。

```css
p::first-letter {
  font-size: 2em;
  font-weight: bold;
}
```

### ::first-line

选择文本块的第一行。

```css
p::first-line {
  font-weight: bold;
  color: blue;
}
```

### ::selection

选择用户选中的文本。

```css
::selection {
  background: yellow;
  color: red;
}
```

### ::placeholder

选择输入框的占位符文本。

```css
input::placeholder {
  color: #999;
  font-style: italic;
}
```

## 语法说明

CSS3 规范要求：
- **伪类**：单冒号 `:hover`
- **伪元素**：双冒号 `::before`

**兼容性**：浏览器也支持单冒号写伪元素（`:before`），但推荐使用双冒号以区分。

## 常见用途

### 1. 清除浮动

```css
.clearfix::after {
  content: '';
  display: table;
  clear: both;
}
```

### 2. 自定义列表样式

```css
ul.custom-list {
  list-style: none;
}

ul.custom-list li::before {
  content: '→';
  margin-right: 8px;
  color: #666;
}
```

### 3. 添加装饰性内容

```css
h2::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 20px;
  background: #1890ff;
  margin-right: 8px;
}
```

### 4. Tooltip 提示

```css
.tooltip {
  position: relative;
}

.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: #333;
  color: white;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip:hover::after {
  opacity: 1;
}
```

## 总结

| 场景 | 选择 |
|------|------|
| 选择元素状态（hover、focus 等） | 伪类 |
| 选择特定位置元素（first-child 等） | 伪类 |
| 在元素前后插入内容 | 伪元素 |
| 清除浮动 | 伪元素 |
| 装饰性内容（不增加 DOM） | 伪元素 |

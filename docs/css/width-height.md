---
title: 元素宽高
date: 2023-03-08
---

# 元素宽高

本文总结获取元素宽高的各种方案及其区别。

## 获取元素宽高方案

### 1. dom.style.width/height

**只能获取行内样式**，无法获取 CSS 类或样式表中的样式。

```javascript
// HTML: <div style="width: 100px"></div>
element.style.width; // '100px'

// HTML: <div class="box"></div>
// CSS: .box { width: 200px; }
element.style.width; // '' (空字符串)
```

### 2. dom.currentStyle.width/height

**IE 专属**，获取计算后的样式。

```javascript
element.currentStyle.width; // IE only
```

### 3. window.getComputedStyle(dom).width/height

**标准方法**，获取计算后的样式（只读）。

```javascript
const style = window.getComputedStyle(element);
style.width;  // '100px'
style.height; // '200px'
```

**特点**：
- 返回计算后的值（包括 CSS 类、样式表、行内样式）
- 返回带单位的字符串（如 `'100px'`）
- 只读，不能设置

### 4. dom.getBoundingClientRect().width/height

获取元素**相对于视口**的位置和尺寸。

```javascript
const rect = element.getBoundingClientRect();
rect.width;   // 100 (数字，不带单位)
rect.height;  // 200
rect.top;     // 距离视口顶部
rect.left;    // 距离视口左侧
rect.right;
rect.bottom;
rect.x;
rect.y;
```

**特点**：
- 返回数字（不带单位）
- 包含 padding 和 border
- 受 transform 影响（缩放后会变化）
- 可以获取位置信息（top、left 等）

### 5. dom.offsetWidth/offsetHeight

获取元素的**布局尺寸**。

```javascript
element.offsetWidth;  // 100 (数字)
element.offsetHeight; // 200
element.offsetLeft;   // 距离 offsetParent 左侧
element.offsetTop;    // 距离 offsetParent 顶部
```

**特点**：
- 返回数字（不带单位）
- 包含 content + padding + border
- 不受 transform 影响
- 可以获取相对位置（offsetLeft/Top）

## 方案对比

| 方案 | 来源 | 返回值 | 包含 | 只读 | 受 transform 影响 |
|------|------|--------|------|------|------------------|
| `style.width` | 行内样式 | 字符串 | content | 否 | - |
| `currentStyle.width` | 计算样式 (IE) | 字符串 | content | 是 | - |
| `getComputedStyle.width` | 计算样式 | 字符串 | content | 是 | - |
| `getBoundingClientRect().width` | 布局 | 数字 | content+padding+border | 是 | ✅ |
| `offsetWidth` | 布局 | 数字 | content+padding+border | 是 | ❌ |

## 如何选择？

| 场景 | 推荐方案 |
|------|---------|
| 获取计算后的样式（带单位） | `getComputedStyle` |
| 获取元素尺寸和位置（数字） | `getBoundingClientRect` |
| 获取元素布局尺寸（不含 transform） | `offsetWidth/offsetHeight` |
| 设置元素宽高 | `style.width/height` |

## 其他宽高相关 API

### 屏幕尺寸

```javascript
window.screen.width;        // 屏幕宽度（分辨率）
window.screen.height;       // 屏幕高度（分辨率）
window.screen.availWidth;   // 屏幕工作区域宽度（去掉任务栏）
window.screen.availHeight;  // 屏幕工作区域高度
```

### 文档尺寸

```javascript
document.documentElement.scrollWidth;  // 网页全文宽度
document.documentElement.scrollHeight; // 网页全文高度
document.documentElement.clientWidth;  // 视口宽度（不含滚动条）
document.documentElement.clientHeight; // 视口高度
```

### 滚动距离

```javascript
window.scrollX;           // 水平滚动距离（现代浏览器）
window.scrollY;           // 垂直滚动距离
document.documentElement.scrollTop;    // 垂直滚动距离（兼容写法）
document.documentElement.scrollLeft;   // 水平滚动距离
```

### 元素滚动

```javascript
element.scrollTop;      // 元素内部垂直滚动距离
element.scrollLeft;     // 元素内部水平滚动距离
element.scrollHeight;   // 元素内容总高度
element.scrollWidth;    // 元素内容总宽度
element.clientHeight;   // 元素可见高度（content + padding）
element.clientWidth;    // 元素可见宽度
```

## 图示总结

```
┌─────────────────────────────────┐
│         margin (外边距)         │
│  ┌───────────────────────────┐  │
│  │       border (边框)       │  │
│  │  ┌─────────────────────┐  │  │
│  │  │   padding (内边距)  │  │  │
│  │  │  ┌───────────────┐  │  │  │
│  │  │  │   content     │  │  │  │
│  │  │  │   (内容区)    │  │  │  │
│  │  │  └───────────────┘  │  │  │
│  │  ─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘

getComputedStyle: 只返回 content 宽度
offsetWidth: content + padding + border
getBoundingClientRect: content + padding + border (受 transform 影响)
```

---
title: 移动端适配方案
date: 2023-03-08
---

# 移动端适配方案

## 前置知识

### 像素相关概念

| 概念 | 说明 |
|------|------|
| **像素 (px)** | 构成屏幕的最小单位，可以理解成一个小方块 |
| **屏幕分辨率** | 屏幕需要多少个像素构成，单位 px |
| **逻辑像素** | 与设备无关的虚拟像素，可以用程序控制 |
| **物理像素 (设备像素)** | 与设备有关，同一设备上物理像素是固定的，由厂家在生产时决定 |
| **PPI** | 每英寸所包含的像素点数目，数值越高屏幕显示越细腻 |
| **设备像素比 (DPR)** | `DPR = 物理像素 / 逻辑像素`，可通过 `window.devicePixelRatio` 获取 |

### 视口 (Viewport)

| 视口类型 | 说明 |
|---------|------|
| **布局视口** | 可通过 `meta` 标签设置 viewport 来改变 |
| **视觉视口** | 视觉上看到的范围 |
| **理想视口** | 缩放比例为 100% 时，理想视口 = 视觉视口 |

**meta viewport**：可以配置视口大小、缩放比例、初始值等参数

**适配目标**：尽量配置布局视口与视觉视口、理想视口一致，以获得更好的视觉体验

## 移动端适配方案

### 1. rem 适配 (flexible 方案)

rem（font size of the root element）是 CSS3 新增的一个相对单位，是指相对于根元素的字体大小的单位。

**原理**：根据不同的设备尺寸，通过 JS 脚本动态设置根元素的字体大小。

**具体做法**：
1. 将视口宽度分成 **10 等份**（也可以分成其他份数，如 100 份）
2. 根元素的 `font-size = 视口宽度 / 10`
3. 这样 **1rem = 1 等份的宽度**，10rem = 整个视口宽度
4. 监听 `window` 的 `resize` 事件，触发之后更新根元素的 `font-size`

**示例**：
- 假设视口宽度是 375px
- 根元素 `font-size = 375 / 10 = 37.5px`
- 那么 `1rem = 37.5px`
- 设计稿上 75px 宽的元素 → 代码中写 `75 / 37.5 = 2rem`

**配合工具**：配合预处理器 (less/scss 等) 自动转换单位，避免自行计算。

::: warning 注意
最早提出 rem 适配方案的是阿里的 flexible，主要是针对苹果提出的 viewport 方案兼容性不佳才产生的适配方案。后面兼容性问题解决了，阿里官方也不提倡使用这样的方案了，建议使用 viewport 方案。
:::

### 2. vw/vh 适配

vw（Viewport Width）、vh（Viewport Height）是基于视图窗口的单位，是 CSS3 中提出来的。

**原理**：将视觉视口宽度 `window.innerWidth` 和视觉视口高度 `window.innerHeight` 等分为 100 份。

- `1vw = 视口宽度的 1%`
- `1vh = 视口高度的 1%`

计算同样可以交给 CSS 预处理器。

### 3. viewport + px 适配

这是 flexible 团队推荐的 viewport 方案。这种方案可以让我们在开发时不用关注设备屏幕尺寸的差异，直接按照设计稿上的标注进行开发，也无需单位的换算，直接用 px。

**核心思路**：通过缩放 viewport，让 CSS 的 1px 等于物理像素的 1px。

**原理**：

假设设计稿是基于 iPhone 6/7/8（375px 宽，DPR=2）：

| 项目 | 值 |
|------|-----|
| 设计稿宽度 | 375px |
| 设备 DPR | 2 |
| 物理像素宽度 | 375 × 2 = 750px |

如果直接写 `width: 375px`，在 DPR=2 的设备上实际占用 750 个物理像素，设计稿上的 1px 边框会显示成 2px 粗。

**解决方案**：把 viewport 缩放 `1/DPR` 倍，这样 CSS 的 1px = 物理像素的 1px。

**示例**：
- DPR=2 → `scale = 0.5`
- DPR=3 → `scale = 0.333`

缩放后：
- 设计稿上 375px 宽的元素 → 代码直接写 `width: 375px`
- 设计稿上 1px 的边框 → 代码直接写 `border: 1px solid #000`（不会变粗）

**动态设置 scale 的 JS 代码**：

```javascript
const scale = 1 / window.devicePixelRatio;
document.querySelector('meta[name="viewport"]').setAttribute('content', 
  `width=device-width, initial-scale=${scale}, maximum-scale=${scale}, minimum-scale=${scale}, user-scalable=no`
);
```

## 1px 边框问题

在设备像素比大于 1 的设备中，1px 的边框实际效果会粗一些（因为会占用多个物理像素）。

### 解决方案

#### 方案 1：伪元素 + transform

```css
.element {
  position: relative;
}

.element::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 200%;
  height: 200%;
  border: 1px solid #000;
  transform: scale(0.5);
  transform-origin: 0 0;
  pointer-events: none;
}
```

**原理**：伪元素设置 1px 边框，长宽为目标元素 2 倍，然后利用 `transform: scale(0.5)` 缩小为 0.5 倍。

#### 方案 2：viewport 缩放 + rem

viewport 根据设备像素比进行缩放处理，其他布局单位用 rem 适配。

```javascript
const scale = 1 / window.devicePixelRatio;
document.querySelector('meta[name="viewport"]').setAttribute('content', `width=device-width, initial-scale=${scale}, maximum-scale=${scale}, minimum-scale=${scale}, user-scalable=no`);
```

## 适配方案对比总结

| 方案 | 优点 | 缺点 | 适用场景 | 1px 问题 |
|------|------|------|---------|---------|
| **rem 适配** | 兼容性好，技术成熟 | 需要 JS，阿里已不推荐 | 老项目维护 | 需单独处理 |
| **vw/vh 适配** | 纯 CSS，不需要 JS，现代浏览器支持好 | 1px 问题需单独处理 | 现代移动端项目 | 需单独处理 |
| **vw + rem 混合** | 布局用 vw，字体用 rem，兼顾两者 | 需要预处理器转换 | **主流推荐**，长期维护的移动端项目 | 需单独处理 |
| **viewport + px** | 直接用 px，1px 问题天然解决，开发简单 | viewport 缩放可能导致第三方库显示异常，字体需单独处理 | 短期 H5 活动页，需要精确还原设计稿 | **天然解决** |
| **响应式设计** | 一套代码多端适配，SEO 友好 | 不适合强还原设计稿 | 内容型网站（新闻、博客、文档） | 不存在（PC 端无此问题） |

### 如何选择？

```
需要精确还原设计稿？
├── 是 → H5 活动页？
│       ├── 是 → viewport + px（最简单）
│       └── 否 → vw + rem 混合
└── 否 → 内容型网站？
        ├── 是 → 响应式设计
        └── 否 → vw/vh 或 vw + rem 混合
```

::: tip 推荐方案
- **长期维护的移动端项目**：vw/vh + rem 混合
- **短期 H5 活动页**：viewport + px
- **内容型多端网站**：响应式设计
:::

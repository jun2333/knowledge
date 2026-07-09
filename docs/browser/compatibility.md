# 现代浏览器兼容性

IE 已于 2022 年停止支持，现代浏览器（Chrome、Firefox、Safari、Edge）都遵循 Web 标准，**传统兼容性问题（如 IE hack、浏览器前缀）已基本消失**。

但兼容性仍然存在，主要体现在：
- **新 API 的支持情况**：CSS/JS 新特性在旧版浏览器中不可用
- **移动端差异**：iOS Safari 与 Android Chrome 的行为差异
- **用户群体差异**：不同地区、行业的浏览器分布不同

---

## 查询兼容性

### caniuse

[caniuse.com](https://caniuse.com) 是查询 Web 特性兼容性的标准工具：

- 搜索特性名称（如 `flexbox`、`grid`、`fetch`）
- 查看各浏览器版本的支持情况
- 了解是否需要前缀或 polyfill

### MDN

[MDN Web Docs](https://developer.mozilla.org) 每个 API 页面底部都有**浏览器兼容性表格**，详细列出各版本支持情况。

### Browserslist

[Browserslist](https://browserslist.dev) 用于定义目标浏览器范围，工具（如 Autoprefixer、Babel）据此自动处理兼容性：

```json
// package.json 或 .browserslistrc
{
  "browserslist": [
    "> 0.5%",
    "last 2 versions",
    "not dead",
    "not ie 11"
  ]
}
```

常用查询：
| 查询 | 说明 |
|------|------|
| `> 0.5%` | 全球使用率 > 0.5% 的浏览器 |
| `last 2 versions` | 每个浏览器的最后 2 个版本 |
| `not dead` | 排除已停止维护的浏览器 |
| `iOS >= 14` | iOS 14 及以上 |
| `Chrome >= 90` | Chrome 90 及以上 |

---

## CSS 兼容性

### Autoprefixer

自动添加浏览器前缀，无需手写：

```css
/* 源码 */
.box {
  display: flex;
  user-select: none;
}

/* Autoprefixer 处理后（根据 Browserslist） */
.box {
  display: flex;
  -webkit-user-select: none;
  user-select: none;
}
```

配合 PostCSS 使用：

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),
  ],
};
```

### CSS 新特性兼容性

| 特性 | 支持情况 | 替代方案 |
|------|---------|---------|
| `gap` (Flexbox) | Chrome 84+, Safari 14.1+ | 使用 margin |
| `:has()` | Chrome 105+, Safari 15.4+ | JS 实现 |
| Container Queries | Chrome 105+, Safari 16+ | Media Queries |
| `aspect-ratio` | Chrome 88+, Safari 15+ | padding-top hack |
| CSS Nesting | Chrome 112+, Safari 16.5+ | 预处理器（Sass/Less） |

### 特性检测

在使用新特性前检测浏览器是否支持：

```js
// CSS 特性检测
if (CSS.supports('display', 'grid')) {
  // 使用 Grid 布局
} else {
  // 降级方案
}

// JS 特性检测
if ('fetch' in window) {
  // 使用 fetch
} else {
  // 使用 XMLHttpRequest 或 polyfill
}
```

> 推荐**特性检测**而非**浏览器检测**（`navigator.userAgent`），因为 UA 可以被修改，且同一浏览器不同版本支持情况不同。

---

## JavaScript 兼容性

### Babel

将新语法转换为旧版兼容的代码：

```js
// 源码（ES2020）
const name = obj?.name ?? 'default';

// Babel 转换后
var _obj$name, _obj;
const name = (_obj$name = (_obj = obj) === null || _obj === void 0 ? void 0 : _obj.name) !== null && _obj$name !== void 0 ? _obj$name : 'default';
```

### Polyfill

新 API 无法通过语法转换实现，需要 polyfill 注入：

```js
// Array.prototype.at() 是 ES2022 新增
// 旧浏览器不支持，需要 polyfill

// 方式一：全局 polyfill（影响全局环境）
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// 方式二：按需引入
import 'core-js/features/array/at';
[1, 2, 3].at(-1); // 3
```

常用 polyfill 方案：
| 方案 | 说明 |
|------|------|
| [core-js](https://github.com/zloirock/core-js) | 最全面的 ES 标准 polyfill 库 |
| [polyfill.io](https://polyfill.io) | 根据 User-Agent 按需返回 polyfill（CDN 服务） |
| Babel `useBuiltIns: 'usage'` | 自动按需引入 polyfill |

### Babel 配置

```js
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: '> 0.5%, last 2 versions, not dead',
      useBuiltIns: 'usage', // 按需引入 polyfill
      corejs: 3,
    }],
  ],
};
```

### JS 新 API 兼容性

| API | 支持情况 | 替代方案 |
|-----|---------|---------|
| `Array.at()` | Chrome 92+, Safari 15.4+ | `arr[arr.length - 1]` |
| `structuredClone()` | Chrome 98+, Safari 15.4+ | `JSON.parse(JSON.stringify())` |
| `Object.hasOwn()` | Chrome 93+, Safari 15.4+ | `Object.prototype.hasOwnProperty.call()` |
| `AbortController` | Chrome 66+, Safari 12.1+ | 无（需 polyfill） |
| `Promise.allSettled()` | Chrome 76+, Safari 13+ | 手动实现 |

---

## 移动端注意事项

### iOS Safari 特殊行为

| 问题 | 说明 | 解决方案 |
|------|------|---------|
| 100vh 问题 | `100vh` 包含地址栏高度 | 使用 `dvh`（动态视口高度）或 JS 计算 |
| 橡皮筋效果 | 滚动到边界时继续拉动会回弹 | `overscroll-behavior: none` |
| 输入框聚焦 | 聚焦时页面自动缩放 | `font-size >= 16px` 或 `user-scalable=no` |
| 日期选择 | `input[type=date]` 样式不一致 | 自定义日期组件 |
| 点击延迟 | 300ms 点击延迟（已修复） | 确保 `width=device-width` |

### 安全区域

iPhone X 及以上有刘海和底部指示条，需要适配：

```html
<meta name="viewport" content="viewport-fit=cover">
```

```css
.container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## 兼容性策略

### 渐进增强 vs 优雅降级

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| **渐进增强** | 先保证基础功能，再为高级浏览器添加增强特性 | 面向广泛用户 |
| **优雅降级** | 先实现完整功能，再为旧浏览器提供降级方案 | 面向技术用户 |

```js
// 渐进增强：先保证基础功能
const button = document.querySelector('button');
button.addEventListener('click', handleClick);

// 增强：如果支持，添加动画
if ('animate' in button) {
  button.animate([{ opacity: 0.5 }, { opacity: 1 }], 300);
}
```

### 按需 Polyfill

不要全局引入所有 polyfill，根据目标浏览器按需引入：

```js
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: '> 0.5%, last 2 versions, not dead',
      useBuiltIns: 'usage', // 根据代码使用情况自动引入
      corejs: 3,
    }],
  ],
};
```

---

## 实践建议

| 建议 | 说明 |
|------|------|
| 使用 Browserslist | 统一管理目标浏览器范围 |
| 使用 Autoprefixer | 自动处理 CSS 前缀 |
| 使用 Babel | 自动转换 JS 语法 |
| 按需引入 polyfill | 避免包体积膨胀 |
| 特性检测优先 | 比浏览器检测更可靠 |
| 关注移动端差异 | iOS Safari 有特殊行为 |
| 定期更新 Browserslist | 根据实际用户数据调整 |

# CSS 布局系统

::: tip 面试重要性
⭐⭐⭐⭐ CSS 布局是前端基础,面试常考各种布局方案
:::

## 📐 布局类型

### 经典布局
- 九宫格布局 - Grid 实现
- [两栏布局](/css/layout-best-practices) - float / flex / grid
- [三栏布局](/css/layout-best-practices) - 圣杯布局、双飞翼布局
- [水平垂直居中](/css/layout-best-practices) - 多种方案对比

### 核心概念
- [BFC 概念](/css/bfc) - 块级格式化上下文
- [IFC 概念](/css/ifc) - 行内格式化上下文
- [伪类与伪元素](/css/pseudo)

---

## 💡 实用技巧

**1. 水平居中**
```css
/* Flexbox */
.parent { display: flex; justify-content: center; }

/* Grid */
.parent { display: grid; place-items: center; }

/* 绝对定位 */
.child { position: absolute; left: 50%; transform: translateX(-50%); }
```

**2. 垂直居中**
```css
/* Flexbox */
.parent { display: flex; align-items: center; }

/* 绝对定位 */
.child { 
  position: absolute; 
  top: 50%; 
  transform: translateY(-50%); 
}
```

---

## 🔗 相关文档

- [移动端适配](/css/mobile-adaptation)
- [Content Visibility](/css/content-visibility)

---
title: Flex & Grid 布局
date: 2023-03-08
---

# Flex & Grid 布局

Flex 和 Grid 是现代 CSS 布局的两大核心系统，分别解决一维和二维布局问题。

## Flex 布局

Flex（Flexible Box）是一维布局系统，用于在**单个方向**（水平或垂直）上排列元素。

### 基本概念

- **容器（Flex Container）**：设置 `display: flex` 的元素
- **项目（Flex Item）**：容器的直接子元素

### 容器属性

#### 主轴方向：`flex-direction`

```css
.container {
  flex-direction: row;          /* 默认，水平从左到右 */
  flex-direction: row-reverse;  /* 水平从右到左 */
  flex-direction: column;       /* 垂直从上到下 */
  flex-direction: column-reverse; /* 垂直从下到上 */
}
```

#### 换行：`flex-wrap`

```css
.container {
  flex-wrap: nowrap;    /* 默认，不换行 */
  flex-wrap: wrap;      /* 换行 */
  flex-wrap: wrap-reverse; /* 反向换行 */
}
```

#### 主轴对齐：`justify-content`

```css
.container {
  justify-content: flex-start;    /* 默认，左对齐 */
  justify-content: flex-end;      /* 右对齐 */
  justify-content: center;        /* 居中 */
  justify-content: space-between; /* 两端对齐，项目间隔相等 */
  justify-content: space-around;  /* 每个项目两侧间隔相等 */
  justify-content: space-evenly;  /* 所有间隔完全相等 */
}
```

#### 交叉轴对齐：`align-items`

```css
.container {
  align-items: stretch;   /* 默认，拉伸填满 */
  align-items: flex-start; /* 起点对齐 */
  align-items: flex-end;   /* 终点对齐 */
  align-items: center;     /* 居中对齐 */
  align-items: baseline;   /* 基线对齐 */
}
```

#### 多行对齐：`align-content`

用于多行 Flex 容器，单行无效。

```css
.container {
  align-content: flex-start;
  align-content: center;
  align-content: space-between;
  align-content: space-around;
  align-content: stretch;
}
```

### 项目属性

#### 放大比例：`flex-grow`

```css
.item {
  flex-grow: 0; /* 默认，不放大 */
  flex-grow: 1; /* 等分剩余空间 */
}
```

#### 缩小比例：`flex-shrink`

```css
.item {
  flex-shrink: 1; /* 默认，空间不足时缩小 */
  flex-shrink: 0; /* 不缩小 */
}
```

#### 基础尺寸：`flex-basis`

```css
.item {
  flex-basis: auto;   /* 默认，使用内容尺寸 */
  flex-basis: 200px;  /* 固定基础尺寸 */
}
```

#### 简写：`flex`

```css
.item {
  flex: 1;           /* flex-grow: 1, flex-shrink: 1, flex-basis: 0% */
  flex: auto;        /* flex-grow: 1, flex-shrink: 1, flex-basis: auto */
  flex: none;        /* flex-grow: 0, flex-shrink: 0, flex-basis: auto */
  flex: 0 1 200px;   /* 完整写法 */
}
```

#### 单独对齐：`align-self`

覆盖容器的 `align-items` 设置。

```css
.item {
  align-self: auto;      /* 默认，继承容器 */
  align-self: center;    /* 单独居中 */
  align-self: flex-end;  /* 单独底部对齐 */
}
```

#### 排序：`order`

```css
.item {
  order: 0;  /* 默认，数值越小越靠前 */
  order: 1;  /* 往后排 */
  order: -1; /* 往前排 */
}
```

## Grid 布局

Grid 是二维布局系统，可以**同时控制行和列**。

### 基本概念

- **容器（Grid Container）**：设置 `display: grid` 的元素
- **项目（Grid Item）**：容器的直接子元素
- **轨道（Track）**：行或列
- **单元格（Cell）**：行和列的交叉区域
- **区域（Area）**：一个或多个单元格组成的矩形区域

### 容器属性

#### 定义行列：`grid-template-columns` / `grid-template-rows`

```css
.container {
  /* 固定尺寸 */
  grid-template-columns: 200px 200px 200px;
  grid-template-rows: 100px 100px;

  /* 比例分配 */
  grid-template-columns: 1fr 1fr 1fr;

  /* 混合使用 */
  grid-template-columns: 200px 1fr 2fr;

  /* repeat 函数 */
  grid-template-columns: repeat(3, 1fr);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

**参数说明**：

| 参数 | 说明 | 示例 |
|------|------|------|
| `px` | 固定尺寸 | `200px` |
| `%` | 百分比 | `50%` |
| `fr` | 比例单位（fraction），分配剩余空间 | `1fr` = 1 份 |
| `auto` | 自动，由内容决定 | `auto` |
| `repeat()` | 重复函数，简化写法 | `repeat(3, 1fr)` = `1fr 1fr 1fr` |
| `minmax()` | 定义最小和最大值 | `minmax(200px, 1fr)` |
| `auto-fit` | 自动填充，尽可能多放列 | `repeat(auto-fit, minmax(200px, 1fr))` |
| `auto-fill` | 自动填充，保留空轨道 | `repeat(auto-fill, minmax(200px, 1fr))` |

**fr 单位详解**：

`fr` 是 Grid 布局特有的比例单位，表示"剩余空间的一份"。

**总份数 = 所有 `fr` 值相加**，每列占 `自己的 fr / 总 fr`。

```css
/* 总共 3 份，每列各占 1/3 */
grid-template-columns: 1fr 1fr 1fr;

/* 总共 3 份，第一列占 1/3，第二列占 2/3 */
grid-template-columns: 1fr 2fr;

/* 有固定尺寸时：先减去固定值，剩余空间再按 fr 分配 */
/* 容器 800px，减去 200px 剩 600px，总共 3 份 */
grid-template-columns: 200px 1fr 2fr;
/* 第二列：600 × 1/3 = 200px，第三列：600 × 2/3 = 400px */
```

**repeat() 函数**：

```css
/* 等价写法 */
grid-template-columns: 1fr 1fr 1fr;
grid-template-columns: repeat(3, 1fr);

/* 复杂模式重复 */
grid-template-columns: repeat(2, 100px 1fr);
/* 等于：100px 1fr 100px 1fr */
```

**auto-fit vs auto-fill**：

```css
/* auto-fit：尽可能多放列，空列会折叠 */
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));

/* auto-fill：尽可能多放列，保留空列的轨道 */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
```

**minmax() 函数**：

```css
/* 列宽最小 200px，最大 1fr（等分剩余空间） */
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
```

#### 间距：`gap`

```css
.container {
  gap: 10px;          /* 行间距和列间距 */
  row-gap: 10px;      /* 行间距 */
  column-gap: 20px;   /* 列间距 */
}
```

#### 项目对齐：`justify-items` / `align-items`

```css
.container {
  justify-items: start | end | center | stretch; /* 水平对齐 */
  align-items: start | end | center | stretch;   /* 垂直对齐 */
}
```

#### 整体对齐：`justify-content` / `align-content`

当 Grid 总尺寸小于容器时使用。

```css
.container {
  justify-content: start | end | center | space-between | space-around | space-evenly;
  align-content: start | end | center | space-between | space-around | space-evenly;
}
```

### 项目属性

#### 定位：`grid-column` / `grid-row`

```css
.item {
  grid-column: 1 / 3;      /* 从第 1 列到第 3 列 */
  grid-column: 1 / span 2; /* 从第 1 列开始，跨越 2 列 */
  grid-column: 1 / -1;     /* 跨越所有列 */

  grid-row: 1 / 2;
  grid-row: 1 / span 2;
}
```

#### 区域命名：`grid-area`

```css
.container {
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }
```

**区域命名的好处**：
- **直观**：`grid-template-areas` 像画表格一样，一眼看出布局结构
- **易维护**：改响应式布局时，只需改区域定义，不用重新算行号列号
- **解耦**：子元素只关心自己叫什么区域，不关心具体在第几行第几列

#### 单独对齐：`justify-self` / `align-self`

```css
.item {
  justify-self: center; /* 水平居中 */
  align-self: center;   /* 垂直居中 */
}
```

## Flex vs Grid

| 特性 | Flex | Grid |
|------|------|------|
| 维度 | 一维（单方向） | 二维（行列同时） |
| 内容优先 | 是（内容决定布局） | 否（布局决定内容） |
| 适用场景 | 导航栏、卡片列表、居中 | 页面整体布局、复杂网格 |
| 对齐控制 | 主轴 + 交叉轴 | 行 + 列独立控制 |
| 响应式 | 配合 wrap | 配合 `auto-fit` / `auto-fill` |

### 如何选择？

```
布局需求？
── 单方向排列（水平或垂直）→ Flex
│   ├── 导航栏
│   ├── 卡片列表
│   └── 水平垂直居中
└── 二维布局（行列同时控制）→ Grid
    ├── 页面整体布局
    ├── 图片画廊
    └── 表单布局
```

::: tip 提示
Flex 和 Grid 不是互斥的，可以组合使用：
- Grid 做整体页面布局
- Flex 做局部组件布局（如导航栏、卡片内部）
:::

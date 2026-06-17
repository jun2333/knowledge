# 导航结构总览

::: tip 说明
本文档记录了文档站点的完整导航结构,方便查阅和维护
:::

---

## 📍 顶部导航栏 (Nav)

共 **11** 个主菜单:

| 菜单名称 | 链接 | 说明 |
|---------|------|------|
| 首页 | `/` | 主页 |
| 快速开始 | `/guide/quick-start` | 使用指南 |
| JavaScript | `/javascript/core` | JS 核心知识 |
| Vue | `/vue/reactive` | Vue 原理 |
| React | `/react/concept` | React 原理 |
| 浏览器 | `/browser/overview` | 浏览器机制 |
| CSS | `/css/layout` | CSS 布局 |
| 性能优化 | `/performance/optimization` | 性能优化 |
| 工程化 | `/engineering/architecture` | 前端工程 |
| 算法 | `/algorithms/basic` | 算法基础 |
| 读书笔记 | `/books/js-you-dont-know` | 书籍笔记 |

---

## 📑 侧边栏导航 (Sidebar)

### 1. JavaScript (12个页面)
- 概览
- ⭐ 数据类型与内存管理 ✅
- ⭐⭐ ES6+ 新特性
- ⭐⭐ 异步编程 (Promise)
- ⭐⭐ 闭包与作用域
- ⭐ 原型与继承
- ⭐ 事件机制
- ⭐⭐ 发布订阅模式
- ⭐ 并发控制
- ⭐⭐ 节流防抖
- ⭐ 数组扁平化
- 面试题精选

### 2. Vue (19个页面)
**响应式系统 (5)**
- 双向绑定原理 ✅
- Effect 实现原理
- 原始值的响应式
- 非原始值的响应式
- Computed 和 Watch

**渲染器 (4)**
- Vue2 vs Vue3 Diff 算法
- Patch 过程对比
- Diff 算法详解
- 渲染器设计

**编译器 (3)**
- 编译总览
- OpenBlock 机制
- 编译优化

**组件化 (5)**
- Vue2 生命周期
- Vue3 生命周期
- 组件实例
- 异步组件
- 内置组件

**生态 (2)**
- Vuex 实现原理
- Vue Router 实现

### 3. React (22个页面)
**理念 (3)**
- React 设计理念 ✅
- 前端框架概览
- React vs Vue

**Hooks (3)**
- FC 组件与 Hook
- Hooks 用法总结
- 自定义 Hook 案例

**渲染器 (5)**
- Reconciler 协调器
- ⭐⭐ Reconcile 算法 (Diff)
- Commit 阶段
- 状态更新流程
- 性能优化

**调度器 (3)**
- Scheduler 调度器
- 优先级机制
- 批量更新

**其他核心 (6)**
- Context API
- JSX 原理
- State 管理
- Ref 转发
- 逻辑复用
- 错误处理

**生命周期 & 事件 (2)**
- 生命周期
- 事件系统

**Router (2)**
- Router 原理
- Mini Router 实现

**渲染优化 (2)**
- 渲染优化实践
- 异步渲染

### 4. 浏览器 (17个页面)
**概览 (1)**
- 总览 ✅

**网络协议 (8)**
- DNS 域名系统
- HTTP 演进史
- TCP 协议
- HTTP Methods
- HTTPS 安全
- HTTP/2
- HTTP/3
- WebSocket

**渲染机制 (4)**
- CSS 渲染优化
- 关键 CSS
- Toy Browser 实现
- HTML Parser

**存储与缓存 (2)**
- 存储机制
- 缓存策略

**其他 (2)**
- 浏览器兼容性
- 事件循环

### 5. CSS (15个页面)
**布局 (11)**
- 布局概览 ✅
- BFC 概念
- IFC 概念
- 九宫格布局
- 两栏布局
- 三栏布局
- 水平垂直居中
- 伪类与伪元素
- 元素宽高
- 三角形实现
- 文本溢出省略

**高级 (4)**
- Content Visibility
- rAF 和 rIC
- 移动端适配
- 块级行内间距

### 6. 性能优化 (9个页面)
**理论 (3)**
- Web 性能优化 ✅
- 如何让网页更丝滑
- 性能指标

**实战 (6)**
- ⭐⭐ 大文件上传 (Vue2)
- 大文件上传 (Vue3)
- 等高虚拟列表
- 不等高虚拟列表
- 瀑布流布局
- 错误监控

### 7. 工程化 (13个页面)
**架构设计 (6)**
- 微前端架构
- Islands 架构
- PWA 方案
- 国际化方案
- 渲染方式
- SDK 设计

**工具链 (4)**
- Webpack 插件开发
- ServiceWorker 集成
- Vite 原理
- Webpack 原理

**Node.js (4)**
- Node 模块机制
- Node 内存管理
- 多进程设计
- 异步 IO

### 8. 算法 (16个页面)
**基础 (8)**
- 算法基础概览 ✅
- 二分查找
- 变形二分法
- 堆
- 散列表
- 二叉查找树
- 二叉树
- ⭐⭐⭐ 字符串匹配算法

**排序 (3)**
- 冒泡、插入、选择排序
- 归并排序
- 快速排序

**LeetCode (5)**
- 数组操作
- 链表
- 字符串
- 栈与队列
- 动态规划
- 双指针
- 回溯算法

### 9. 读书笔记 (9个页面)
**JavaScript (4)**
- ⭐⭐ 你不知道的 JS ✅
- 作用域与闭包
- 对象详解
- 类型转换

**前端进阶 (4)**
- ⭐⭐ 重学前端 - Class 原理
- 函数分类与 this
- ⭐⭐ 现代前端技术解析
- 前端知识架构图

**Node.js (2)**
- Node 深入浅出
- 产品化思考

### 10. 指南 (3个页面)
- 快速开始 ✅
- 学习路径 ✅
- 面试准备 ✅

---

## ✅ 已完成页面

以下页面已创建并有内容:

1. `/` - 首页
2. `/guide/quick-start` - 快速开始
3. `/guide/learning-path` - 学习路径
4. `/guide/interview-prep` - 面试准备
5. `/javascript/core` - JS 概览
6. `/javascript/memory` - 内存管理 (详细)
7. `/vue/reactive` - Vue 响应式
8. `/react/concept` - React 理念
9. `/browser/overview` - 浏览器概览
10. `/css/layout` - CSS 布局
11. `/performance/optimization` - 性能优化
12. `/engineering/architecture` - 工程化架构
13. `/algorithms/basic` - 算法基础
14. `/books/js-you-dont-know` - 你不知道的 JS

---

## ⚠️ 待补充页面

以下导航链接已配置,但对应页面内容需要从原有 Markdown 文件迁移或新建:

### 高优先级 (面试高频)
- `/javascript/async` - 异步编程
- `/javascript/closure` - 闭包与作用域
- `/javascript/es6` - ES6+ 特性
- `/vue/effect` - Effect 原理
- `/vue/diff-compare` - Diff 算法对比
- `/react/fc-hook` - FC 组件与 Hook
- `/react/reconciler` - Reconciler
- `/react/scheduler` - Scheduler
- `/browser/event-loop` - 事件循环
- `/browser/http-history` - HTTP 演进

### 中优先级
- 所有 CSS 布局详细页面
- 所有性能优化实战页面
- 所有算法详细页面
- 所有读书笔记页面

### 低优先级
- 工程化相关深入内容
- React 高级特性
- Vue 编译器细节

---

## 🔧 维护建议

### 添加新页面步骤
1. 在 `docs/` 对应目录下创建 `.md` 文件
2. 在 `docs/.vitepress/config.mts` 中添加侧边栏配置
3. 确保链接路径一致
4. 重启开发服务器查看效果

### 页面规范
```markdown
# 标题

::: tip 面试重要性
⭐⭐⭐⭐⭐ 说明
:::

## 核心概念

内容...

## 代码示例

```javascript
// 示例代码
```

## 常见面试题

### Q1: 问题?

**A:** 回答...

## 总结

...
```

---

## 📊 统计

- **顶部导航**: 11 个
- **侧边栏分组**: 10 个主要分类
- **总页面数**: 约 140+ 个链接
- **已完成**: 14 个核心页面
- **待补充**: 约 126 个页面

---

## 🎯 下一步行动

1. **优先迁移现有笔记** - 将 `JS相关/`, `Vue设计原理/`, `React设计原理/` 等目录下的 Markdown 文件转换为文档站点格式
2. **补充高频面试内容** - 异步编程、闭包、事件循环等
3. **添加代码示例** - 为每个知识点添加可运行的代码
4. **标注难度和重要性** - 使用星级标注
5. **部署上线** - 部署到 Vercel/GitHub Pages

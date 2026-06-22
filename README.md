# 前端面试知识库

> 系统化整理的前端面试知识点，从基础到进阶，助你拿下前端 Offer

## 🚀 快速开始

### 在线文档站点（推荐）

```bash
npm install
npm run dev  # 或 npm run docs:dev
```

然后访问 http://localhost:5173

**✨ 新特性**：现在支持全文搜索、更好的导航和移动端适配！

📖 **写作指南**：查看 [docs/GUIDE.md](docs/GUIDE.md) 了解如何维护知识库。

---

## 📚 知识体系

### JavaScript 核心
- [数据类型与内存管理](docs/javascript/memory.md) ⭐⭐⭐⭐⭐
- 异步编程 (Promise/async-await) - 待补充
- 闭包与作用域 - 待补充
- 原型与继承 - 待补充
- 事件机制 - 待补充

### 框架原理
- **Vue**
  - [响应式原理](docs/vue/double-binding.md) - Vue3 响应式系统实现
  - [生命周期](docs/vue/lifecycle-v2.md) - Vue2/Vue3 生命周期详解
  - [Computed & Watch](docs/vue/computed-watch.md) - 计算属性与监听器
- **React**
  - [Fiber 架构](docs/react/reconciler.md) - Reconciler 协调器
  - [Hooks 原理](docs/react/fc-hook.md) - FC 组件与 Hook 实现
  - [调度器](docs/react/scheduler.md) - Scheduler 优先级调度

### 浏览器
- [渲染机制](docs/browser/toy-browser.md) - 见 toy-browser 项目
- 事件循环 - 待补充
- [存储机制](docs/browser/storage-cache.md) - 浏览器存储与缓存
- [网络协议](docs/browser/https.md) - HTTP/HTTPS/TCP/WebSocket

### 性能优化
- [大文件上传](docs/performance/upload-idea.md) - 完整项目实战
- [加载优化](docs/performance/web.md) - Web 性能优化策略
- [渲染优化](docs/performance/smooth.md) - 让网页更丝滑

### CSS 布局
- [BFC 概念](docs/css/bfc.md) - 块级格式化上下文
- [移动端适配](docs/css/mobile-adaptation.md) - 响应式设计方案
- [更多布局示例](archive/source-notes-2025/CSS布局相关/) - 历史代码示例

### 算法
- [排序算法](docs/algorithms/bubble-insert-selection.md) - 冒泡、插入、选择排序
- [数据结构](docs/algorithms/heap.md) - 堆、栈、树、散列表
- [常见面试题](docs/algorithms/binary-search.md) - 二分查找、字符串匹配

### 工程化
- [ServiceWorker Webpack Plugin](docs/engineering/architecture.md) - 插件开发

---

## 🎯 学习路径推荐

### 初级前端工程师
1. JavaScript 基础 → 数据类型、作用域、闭包
2. DOM 操作 → 事件机制、异步编程
3. CSS 布局 → Flexbox、Grid、响应式

### 中级前端工程师
1. 框架原理 → Vue/React 核心概念
2. 浏览器 → 渲染机制、性能优化
3. 工程化 → Webpack、TypeScript

### 高级前端工程师
1. 架构设计 → MVVM、微前端
2. 性能调优 → 加载优化、运行时优化
3. 源码阅读 → Vue/React 源码分析

---

## 📁 目录结构

```
.
├── docs/                    # 🌟 VitePress 文档站点（唯一内容源）
│   ├── .vitepress/         # VitePress 配置
│   ├── javascript/         # JavaScript 核心知识点
│   ├── react/              # React 框架原理
│   ├── vue/                # Vue 框架原理
│   ├── browser/            # 浏览器相关
│   ├── css/                # CSS 布局与特性
│   ├── performance/        # 性能优化
│   ├── algorithms/         # 算法
│   ├── engineering/        # 工程化与架构
│   ├── books/              # 读书笔记
│   ├── ai-agent/           # AI Agent 学习
│   └── misc/               # 杂项知识
├── archive/                 # 历史归档（只读）
│   └── source-notes-2025/  # 2025年前的旧笔记结构
├── package.json
└── README.md
```

**💡 重要提示**：自 2026-06 起，所有内容统一在 `docs/` 目录下维护，实现单一真相源。

---

## 🔧 使用说明

### 日常写作

**直接在 `docs/` 目录下编辑即可！**

```bash
# 启动开发服务器（支持热重载）
npm run dev

# 编辑任意 markdown 文件
code docs/react/my-new-topic.md

# 保存后浏览器自动刷新，实时预览
```

详细的工作流说明请查看 [docs/GUIDE.md](docs/GUIDE.md)

### 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev          # 简写
npm run docs:dev     # 完整写法

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 查看历史项目

各个子项目的代码已归档到 `archive/source-notes-2025/`，可以查看历史实现：

- `archive/source-notes-2025/性能优化/大文件上传/` - Vue3 大文件上传项目
- `archive/source-notes-2025/浏览器/渲染/html-parser/toy-browser/` - 简易浏览器实现
- `archive/source-notes-2025/架构/serviceworker-webpack-plugins/` - Webpack 插件开发

---

## 📊 内容统计

| 分类 | 已完成 | 待补充 |
|------|--------|--------|
| JavaScript | 4+ | 3 (闭包、原型链、事件机制) |
| 框架原理 | 47+ (Vue 20 + React 27) | 0 |
| 浏览器 | 12+ | 1 (事件循环) |
| 性能优化 | 6+ | 0 |
| CSS | 8+ | 0 |
| 算法 | 12+ | 0 |
| AI Agent | 9+ | 持续更新中 |

**总计**: 100+ 篇高质量技术笔记

---

## 📝 更新日志

- **2026-06**: 
  - ✨ 重构为单一真相源架构，所有内容统一在 `docs/` 下维护
  - 🚀 升级 VitePress 文档站点，支持全文搜索和更好的导航
  - 📦 归档历史笔记到 `archive/` 目录
  - 📖 新增写作指南文档
- **2024-08**: 添加 toy-browser 等项目实践
- **更早**: 个人学习笔记积累

---

## 💡 贡献指南

这是一个个人学习知识库，主要用于面试准备和技术复习。

**后续计划：**
- [ ] 补充完整的 JavaScript 核心知识点
- [ ] 整理 Vue/React 框架原理
- [ ] 添加更多面试高频题目
- [ ] 完善项目实战案例
- [ ] 标注每个知识点的难度和重要性

---

## 📄 License

ISC

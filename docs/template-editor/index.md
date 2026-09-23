# 自研模板编辑器

> 一个支持 Email / PDF 双模式的可视化模板编辑器，底层用 FreeMarker 实现模板能力，通过 Web Component 对外暴露以支持跨技术栈接入。
> 本文档集按**由全局到局部**的顺序拆解它的架构与核心实现，读完能说清"它是怎么搭起来的、每个机制为什么这么设计"。

## 阅读顺序

| 篇目 | 主题 | 你会了解到 |
|------|------|-----------|
| [01 · 总览与架构](./01-overview.md) | 全局 | 它是什么、四层架构、Core Engine 四包怎么分、技术选型与双模式差异 |
| [02 · 文档模型与选区](./02-document-model.md) | 数据 | DocNode 文档树、EditorState 分层、Selection 选区模型与 DOM 映射 |
| [03 · Command 引擎](./03-command-engine.md) | 机制 | 所有操作怎么统一封装、CommandContext 如何解耦 Command 与 Manager |
| [04 · 渲染引擎](./04-render-engine.md) | 机制 | DOMHandler 契约、统一 Reconcile、事件驱动的靶向更新与性能策略 |
| [05 · 工具设计](./05-tools.md) | 实现 | 变量 / 条件 / 循环 / 文本样式 / 对齐五类工具，以及变量系统与拖拽 |
| [06 · 序列化与单一数据源](./06-serialization.md) | 实现 | DocNode 树怎么变成 FreeMarker 模板、为什么数据库只存一份 JSON |
| [07 · Undo/Redo](./07-history.md) | 机制 | 快照 + diff 靶向更新、选区恢复，以及恢复期间的 input 拦截坑 |
| [08 · Web Component 接入](./08-embedding.md) | 集成 | 属性 / 事件 / 方法三类对外契约、Shadow DOM 隔离、React 挂载方式 |
| [09 · 设计决策与面试复盘](./09-decisions.md) | 经验 | 每个"为什么这么选"、真实难点复盘、高频追问的答题要点 |

## 一句话概括

运营 / 产品人员**不写代码**也能编辑 Email 和 PDF 模板：编辑器把 FreeMarker 语法（变量、条件、循环）封装成可视化操作，编辑态所见即输出态；内部用**文档模型（DocNode）作为唯一数据源**，Command 模式统一封装操作，渲染走统一的 reconcile，对外用 Web Component 暴露。

## 项目背景

> 这部分是简历 / 面试口径，技术细节在后面各篇展开。

| 项 | 内容 |
|----|------|
| 定位 | 公司（蜜獾）内部自研，2025.03 ~ 2026.06 |
| 背景 | 邮件 / PDF 模板此前依赖 Word + PDF 编辑器人工维护，单份模板维护需 **2 小时以上** |
| 方案 | 可视化模板编辑器（TS + React + Vite），支持在富文本环境中插入 FreeMarker 变量与条件块、HTML 自适应布局、在线填变量预览；内部用 Command 模式统一封装操作，实现可扩展与撤销 / 重做 |
| 成果 | 单份模板维护成本从 **2 小时降至分钟级**；模板生产能力下放给业务人员，实现自助化生产 |
| 角色 | 项目主导者，负责方案设计与核心功能攻坚 |

## 文档地图

```
docs/template-editor/
├── index.md               # 本文件：总览与阅读路线
├── 01-overview.md         # 总览与架构
├── 02-document-model.md   # 文档模型、状态与选区
├── 03-command-engine.md   # Command 引擎与解耦
├── 04-render-engine.md    # 渲染引擎（DOMHandler + Reconcile + 性能）
├── 05-tools.md            # 工具设计、变量系统、拖拽
├── 06-serialization.md    # FreeMarker 序列化与单一数据源
├── 07-history.md          # Undo / Redo
├── 08-embedding.md        # Web Component 接入协议
└── 09-decisions.md        # 设计决策、难点复盘、面试问答
```

## 面试速查

时间紧、只想快速回顾的话，按这个顺序看：

1. [01 · 总览与架构](./01-overview.md) —— 画出四层架构和四包依赖，能讲清"为什么用 Web Component"
2. [09 · 设计决策与面试复盘](./09-decisions.md) —— 关键决策表 + 难点 + 高频追问，一站复习
3. 你简历上重点写的那块，再补对应机制篇（Command / 渲染 / Undo-Redo）

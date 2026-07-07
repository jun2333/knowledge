# ReactDOM 实现原理

## 概述

ReactDOM 是 React 在浏览器环境中的渲染器实现，负责将 React 元素转换为真实的 DOM 节点。

## 核心职责

- 创建、更新、删除 DOM 节点
- 处理事件绑定
- 管理表单元素的状态
- 处理浏览器兼容性问题

## 关键 API

### createRoot

```js
import { createRoot } from 'react-dom/client'

const root = createRoot(document.getElementById('root'))
root.render(<App />)
```

### render（旧版）

```js
import { render } from 'react-dom'

render(<App />, document.getElementById('root'))
```

## 渲染流程

1. React 调用 ReactDOM 的 `render` 方法
2. ReactDOM 创建 Fiber 根节点
3. 进入 Reconciler 的协调流程
4. Commit 阶段调用 ReactDOM 的 DOM 操作方法
5. 完成真实 DOM 的更新

## 与 Reconciler 的关系

ReactDOM 是 Renderer 的具体实现，Reconciler 负责计算差异，ReactDOM 负责执行 DOM 操作。

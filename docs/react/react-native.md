# React Native 渲染机制

## 概述

React Native 使用 React 的架构，但渲染目标不是 DOM，而是原生组件（iOS/Android）。

## 架构差异

| React Web | React Native |
|-----------|--------------|
| ReactDOM | React Native Renderer |
| DOM 节点 | 原生组件（UIView/View） |
| CSS 样式 | 原生样式系统 |
| 浏览器事件 | 原生手势系统 |

## 渲染流程

1. JSX 转换为 React 元素
2. Reconciler 计算差异
3. Renderer 将操作转换为原生指令
4. 通过 Bridge 或 JSI 发送到原生层
5. 原生层执行 UI 更新

## 关键概念

### Bridge 通信

React Native 通过 Bridge 在 JS 和原生层之间传递消息。

### JSI（JavaScript Interface）

新一代架构使用 JSI 直接调用原生方法，性能更好。

### Fabric 渲染器

React Native 的新渲染架构，支持异步渲染和并发特性。

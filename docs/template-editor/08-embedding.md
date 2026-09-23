# 08 · Web Component 接入

> 目标：读完这篇，你能说清宿主项目怎么把编辑器嵌进去——传什么属性、监听什么事件、调什么方法，以及样式是怎么隔离的。

## 一、为什么要做成 Web Component

编辑器要被不同技术栈的项目接入（React 项目、Vue 项目、纯 HTML 页面），Web Component 是框架无关的标准。宿主只需要挂一个自定义元素，不关心内部是 React 还是别的（选型理由见 [01 · 总览与架构](./01-overview.md)）。

对外契约分三类：**属性**（宿主 → 组件）、**事件**（组件 → 宿主）、**方法**（宿主 → 组件）。

## 二、属性（Attributes → 组件）

```typescript
// 外部通过属性传入配置
<template-editor
  mode="email"
  variables='[{"name":"user_name","label":"用户名"}]'
  template="<p>Dear ${user_name}</p>"
  readonly="false"
></template-editor>
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `mode` | `"email" \| "pdf"` | 编辑模式 |
| `variables` | JSON string | 可用变量列表 |
| `template` | string | 初始模板内容（FreeMarker） |
| `readonly` | boolean | 只读模式 |

`mode` 决定编辑器加载哪套 settings（EmailSettings / PDFSettings），详见 [02 · 文档模型与选区](./02-document-model.md) 的 EditorState 一节。

## 三、事件（组件 → 外部）

```typescript
// 组件内部 dispatch
this.dispatchEvent(new CustomEvent('template-change', {
  detail: { template: string, dirty: boolean }
}));

this.dispatchEvent(new CustomEvent('selection-change', {
  detail: { selection: Selection | null }
}));
```

| 事件 | 触发时机 | detail |
|------|---------|--------|
| `template-change` | 模板内容变化 | `{template, dirty}` |
| `selection-change` | 选区变化 | `{selection}` |
| `variable-drop` | 变量拖入 | `{variable, position}` |
| `ready` | 组件初始化完成 | `{}` |

宿主靠 `template-change` 拿到序列化后的模板字符串（序列化细节见 [06 · 序列化](./06-serialization.md)），靠 `dirty` 判断是否有未保存修改。

## 四、方法（外部 → 组件）

```typescript
const editor = document.querySelector('template-editor');

editor.getTemplate();          // 获取当前 FreeMarker 模板字符串
editor.setTemplate(str);       // 设置模板
editor.fillVariables(data);    // 填充变量值，进入预览
editor.undo();                 // 撤销
editor.redo();                 // 重做
editor.exportHTML();           // 导出渲染后的纯 HTML
```

> 属性的约束是"声明式配置"，方法是"命令式操作"，两类并存：初始配置用属性（随元素一起渲染），交互操作（undo / 预览）用方法。

## 五、Shadow DOM 隔离

```typescript
class TemplateEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // 在 shadow root 中挂载 React 应用
    const mountPoint = document.createElement('div');
    this.shadowRoot.appendChild(mountPoint);
    ReactDOM.createRoot(mountPoint).render(<App host={this} />);
  }
}
customElements.define('template-editor', TemplateEditor);
```

Shadow DOM 确保编辑器内部样式（Tailwind）不会泄漏到宿主页面，宿主页面的全局样式也不会影响编辑器。

> 这一层隔离和 [01 · 总览与架构](./01-overview.md) 的样式策略是配套的：交互 UI 用 Tailwind 且被 Shadow DOM 关住，内容样式内联且随模板导出，两套样式各走各的路，互不干扰。

---

**上一篇**：[07 · Undo/Redo](./07-history.md) ｜ **下一篇**：[09 · 设计决策与面试复盘](./09-decisions.md)

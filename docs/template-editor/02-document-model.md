# 02 · 文档模型与选区

> 目标：读完这篇，你能说清编辑器"真正在维护的数据"是什么——一棵文档树（DocNode）、一个顶层状态容器（EditorState）、一套选区坐标（Selection）。

## 一、为什么要文档模型

编辑器在操作 DOM 的同时，维护一棵**文档树（DocNode）**作为 Single Source of Truth。

DOM 是用户直接交互的界面，DocNode 是结构化的数据模型，两者保持同步。之所以不直接把 DOM 当数据源：

- DOM 结构携带大量渲染细节（多余空白、包装标签），不适合直接序列化成模板
- 需要可序列化的结构来做持久化、版本 diff、跨端渲染
- 需要一个稳定坐标系来锚定选区、做 Undo/Redo

## 二、节点结构

```typescript
type NodeType = 'root' | 'block' | 'inline' | 'text' | 'variable' | 'condition' | 'loop';

interface DocNode {
  id: string;
  type: NodeType;
  children?: DocNode[];
  attrs?: Record<string, any>;     // 样式、对齐等
  content?: string;                // text 节点的文本
  variable?: VariableRef;          // variable 节点的变量引用
  expression?: string;             // condition/loop 节点的 FreeMarker 表达式
}

interface VariableRef {
  name: string;       // 变量名：user_name
  label: string;      // 显示名：用户名
  defaultValue?: string;
}
```

### 设计要点

- **模型更新策略**：用户输入走"DOM 先变 → 同步回 DocNode"，工具操作走"Command 改 DocNode → reconcile 渲染"。DOM 不是模型，DocNode 才是 Single Source of Truth。历史独立性由快照深拷贝保证（见 [07 · Undo/Redo](./07-history.md)），不依赖不可变更新
- **ID 稳定**：节点 ID 在编辑过程中不变，用于 DOM diff 和选区锚定
- **序列化友好**：树结构可直接 JSON 序列化存储，也可转换为 FreeMarker 模板字符串（见 [06 · 序列化](./06-serialization.md)）

### 文档树示例

```
root
├── block (type: "header", attrs: {textAlign: "center"})
│   └── text ("尊敬的 ")
│   └── variable ({name: "user_name", label: "用户名"})
│   └── text ("：")
├── block (type: "paragraph")
│   └── text ("您的订单 ")
│   └── variable ({name: "order_id", label: "订单号"})
│   └── text (" 已发货。")
└── condition (expression: "is_vip")
    ├── [true] block → text ("感谢您的长期支持！")
    └── [false] block → text ("欢迎再次选购。")
```

> 注意 `condition` / `loop` 这类容器节点自身带 `children`，因此天然支持嵌套（条件里放循环、循环里放条件）。

## 三、编辑器状态（EditorState）

DocNode 树只描述文档内容和结构。编辑器还有大量配置信息（模式、变量列表、纸张尺寸、字号字色等），这些信息**不属于文档树本身**。顶层用一个 **EditorState** 对象统一管理，区分持久化内容和运行时状态：

```typescript
interface EditorState {
  // ---- 持久化（存数据库，跟着模板走）----
  mode: 'email' | 'pdf';                    // 外部通过 Web Component 传入
  variables: VariableRef[];
  settings: EmailSettings | PDFSettings;    // 按模式分组
  content: DocNode;                         // 文档树

  // ---- 运行时（不存数据库，会话级别）----
  readonly: boolean;
  zoom: number;
  activeTool: string;
}

interface EmailSettings {
  width: number;                            // 邮件布局宽度（如 600px）
  compatibility: 'modern' | 'legacy';       // 邮件客户端兼容级别
}

interface PDFSettings {
  pageSize: 'A4' | 'A5' | 'Letter';
  lineHeight: number;
  backgroundColor: string;
  fontSize: number;
  fontColor: string;
  margin: { top: number; right: number; bottom: number; left: number };
}
```

### 分层逻辑

| | 存哪 | 持久化 | 例子 |
|---|---|---|---|
| 文档配置 | `settings` | 是 | 纸张尺寸、字号、背景色、邮件宽度 |
| 文档内容 | `content` | 是 | DocNode 树 |
| 编辑器状态 | 顶层 | 否 | readonly、zoom、当前选中工具 |

存数据库时只序列化 `mode + variables + settings + content`，zoom、readonly 这些运行时状态丢了也无所谓。`mode` 由外部开发者通过 Web Component 属性传入，编辑器内部只读取和使用。

### Command 怎么访问这些状态

CommandContext 按需暴露各层，不把整个 EditorState 一股脑给出去（解耦细节见 [03 · Command 引擎](./03-command-engine.md)）：

```typescript
createContext(): CommandContext {
  return {
    getMode: () => this.state.mode,
    getVariables: () => this.state.variables,
    getSettings: () => this.state.settings,
    getDocument: () => this.state.content,
    // ...
  };
}
```

## 四、选区模型

编辑器自己维护一套**模型坐标**的选区，而不是直接用浏览器 Selection。原因是浏览器坐标在 DOM 重建后会失效，而模型坐标只要节点 ID 稳定就能重新定位。

```typescript
interface Selection {
  anchor: Position;   // 选区起点
  focus: Position;    // 选区终点（光标位置）
}

interface Position {
  nodeId: string;     // 所在节点
  offset: number;     // 节点内偏移（文本节点为字符偏移，容器节点为子节点索引）
}
```

- 光标（collapsed）：`anchor === focus`，两点重合
- 选区（expanded）：`anchor !== focus`，两点组合为范围

### 关键处理

| 场景 | 处理方式 |
|------|---------|
| 变量节点不可部分选中 | 选区进入变量节点时自动扩展为整节点选中 |
| 跨节点选区 | anchor 和 focus 可以在不同节点，渲染时遍历路径高亮 |
| IME 输入法 | `compositionstart` 时冻结选区更新，`compositionend` 后一次性提交 |
| 选区恢复 | Undo/Redo 后根据快照中保存的 selection 恢复光标位置 |

### 选区 → DOM 映射

模型坐标要翻译回浏览器坐标，才能落到真实的 `Range`：

```typescript
// 单点转换：文档 Position → DOM 点（Range 起点）
function positionToDOM(pos: Position, container: HTMLElement): Range {
  const nodeEl = container.querySelector(`[data-node-id="${pos.nodeId}"]`);
  const range = document.createRange();

  if (isTextNode(nodeEl)) {
    range.setStart(nodeEl.firstChild, pos.offset);
  } else {
    range.setStart(nodeEl, pos.offset);
  }
  return range;
}

// 完整选区恢复：组合 anchor + focus 两个点
function restoreSelection(selection: Selection, container: HTMLElement) {
  const anchor = positionToDOM(selection.anchor, container);
  const focus = positionToDOM(selection.focus, container);

  window.getSelection().setBaseAndExtent(
    anchor.startContainer, anchor.startOffset,
    focus.startContainer, focus.startOffset
  );
}
```

这里 `querySelector('[data-node-id="..."]')` 能命中，靠的是渲染时烙在元素上的 `dataset.nodeId`，这个双向桥的机制见 [04 · 渲染引擎](./04-render-engine.md)（「DOM ↔ DocNode 怎么互相定位」一节）。

---

**上一篇**：[01 · 总览与架构](./01-overview.md) ｜ **下一篇**：[03 · Command 引擎](./03-command-engine.md)

# JSX

JSX 是 JavaScript 的语法扩展，用于描述 UI 结构。

---

## 本质

JSX 实质上是 `React.createElement` 函数的语法糖，从描述逻辑出发，扩展 UI 的描述。

```jsx
// JSX
<div className="app">
  <h1>标题</h1>
  <p>内容</p>
</div>

// 编译后
React.createElement("div", { className: "app" },
  React.createElement("h1", null, "标题"),
  React.createElement("p", null, "内容")
);
```

在编译过程通过 Babel 插件转译成 `React.createElement` 函数。v17 以前需要手动 `import React`，否则会报错；v17 以后 Babel 已经自动引入 React 库（使用新的 JSX Transform）。

---

## JSX 转换原理

### 经典转换（v17 以前）

```jsx
import React from 'react';

function App() {
  return <h1>Hello</h1>;
}

// 转换为
import React from 'react';

function App() {
  return React.createElement('h1', null, 'Hello');
}
```

### 新 JSX Transform（v17+）

```jsx
function App() {
  return <h1>Hello</h1>;
}

// 转换为
import { jsx as _jsx } from 'react/jsx-runtime';

function App() {
  return _jsx('h1', { children: 'Hello' });
}
```

新转换的优势：
- 不需要在每个文件中 `import React`
- 性能略有提升（减少函数调用）
- 为未来优化留出空间

---

## 安全性

JSX 是安全的，在转译过程中会将所有显示到 DOM 的字符串或实体进行转义，防止 XSS 攻击。

```jsx
const userContent = '<script>alert("xss")</script>';
return <div>{userContent}</div>; // 安全，会转义显示
```

如果需要渲染原始 HTML，使用 `dangerouslySetInnerHTML`（注意安全风险）：

```jsx
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

---

## Fragment

用于返回多个元素而不需要额外的 DOM 节点。

```jsx
// 使用 Fragment
function List() {
  return (
    <Fragment>
      <li>Item 1</li>
      <li>Item 2</li>
    </Fragment>
  );
}

// 简写语法
function List() {
  return (
    <>
      <li>Item 1</li>
      <li>Item 2</li>
    </>
  );
}

// 带 key 的 Fragment（用于列表）
function Table({ items }) {
  return (
    <table>
      {items.map(item => (
        <Fragment key={item.id}>
          <tr><td>{item.name}</td></tr>
          <tr><td>{item.description}</td></tr>
        </Fragment>
      ))}
    </table>
  );
}
```

---

## Key

Key 帮助 React 识别哪些元素改变了、添加了或删除了。

```jsx
// 正确：使用唯一 ID
{items.map(item => <li key={item.id}>{item.name}</li>)}

// 错误：使用索引（如果列表会重排、过滤或添加）
{items.map((item, index) => <li key={index}>{item.name}</li>)}
```

**Key 的选择原则**：
- 使用稳定、唯一、可预测的标识符（如数据库 ID）
- 避免使用数组索引（除非列表是静态的，不会重排）
- Key 只需要在同级元素中唯一

---

## JSX 与模板语法的对比

| | JSX（React） | 模板（Vue/Angular） |
|---|---|---|
| **语法** | JavaScript 扩展 | 特定语法（`v-if`、`*ngIf`） |
| **灵活性** | 高（完整 JS 能力） | 中（受模板语法限制） |
| **静态分析** | 困难（JS 图灵完备） | 容易（结构固定） |
| **学习成本** | 低（会 JS 就会 JSX） | 中（需要学模板语法） |
| **类型支持** | 好（TypeScript 原生支持） | 中（需要额外配置） |

**React 选择 JSX 的原因**：JavaScript 的表达能力远超任何模板语法，可以处理任意复杂的逻辑。代价是放弃了编译时优化的可能性（直到 React Compiler 出现）。

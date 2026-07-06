# React 新版本特性

本文记录 React 主要版本的核心更新，帮助了解框架的演进方向。

---

## React 18（2022 年 3 月）

### 1. Automatic Batching（自动批量更新）

React 18 之前，只有在 React 事件处理函数中的多个 setState 会批量更新。React 18 开始，**所有场景都默认批量更新**，包括 Promise、setTimeout、原生事件等异步场景。

```jsx
// React 17：异步场景不会批量更新
setTimeout(() => {
  setCount(c => c + 1); // 触发一次渲染
  setFlag(f => !f);     // 又触发一次渲染
}, 1000);

// React 18：所有场景都自动批量更新
setTimeout(() => {
  setCount(c => c + 1); // 批量处理
  setFlag(f => !f);     // 只触发一次渲染
}, 1000);
```

如果需要强制同步更新，使用 `flushSync`：

```jsx
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1); // 立即同步更新 DOM
});
```

### 2. Concurrent Features（并发特性）

并发模式从"全有或全无"变成"按需开启"，通过使用具备并发特性的 API 开启可中断的异步更新。

**useTransition / startTransition**：标记低优先级更新，避免阻塞用户交互。

```jsx
const [isPending, startTransition] = useTransition();

const handleFilterChange = (newFilter) => {
  setInputValue(newFilter); // 高优先级：立即更新输入框

  startTransition(() => {
    setFilter(newFilter); // 低优先级：延迟更新列表
  });
};
```

### 3. 新的客户端和服务端渲染 API

**客户端渲染**：

```jsx
// React 17
ReactDOM.render(<App />, document.getElementById('root'));

// React 18
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

**服务端渲染**：

```jsx
// React 17
ReactDOM.hydrate(<App />, document.getElementById('root'));

// React 18
const root = ReactDOM.hydrateRoot(document.getElementById('root'), <App />);
```

**Node.js 流式渲染**：

```jsx
import { renderToPipeableStream } from 'react-dom/server';

app.get('/', (req, res) => {
  const stream = renderToPipeableStream(<App />, {
    onShellReady() {
      res.setHeader('content-type', 'text/html');
      stream.pipe(res);
    },
  });
});
```

### 4. 新的 Hook

| Hook | 用途 |
|------|------|
| `useId` | 生成全局唯一 ID，避免 ID 冲突，保证 SSR 一致性 |
| `useInsertionEffect` | 在 DOM 变更前同步执行，专门为 CSS-in-JS 库设计 |
| `useDeferredValue` | 延迟值更新，将低优先级值的更新推迟到浏览器空闲时 |
| `useTransition` | 标记低优先级更新，避免阻塞用户交互 |
| `useSyncExternalStore` | 订阅外部数据源，保证并发渲染下的数据一致性 |

---

## React 19（2024 年 12 月）

### 1. Actions 和异步过渡

Actions 是处理表单和用户交互的新范式。通过 `action` 属性，React 自动管理 pending 状态、错误处理、乐观更新和表单重置。

**useActionState**：管理 Action 的状态（pending、error、result）。

```jsx
import { useActionState } from 'react';

async function submitForm(formData) {
  const response = await api.submit(formData);
  if (!response.ok) throw new Error('提交失败');
  return response.data;
}

function Form() {
  const [result, submitAction, isPending] = useActionState(submitForm, null);

  return (
    <form action={submitAction}>
      {result?.error && <p style={{ color: 'red' }}>{result.error}</p>}
      {result?.success && <p style={{ color: 'green' }}>提交成功！</p>}
      <input name="name" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '提交中...' : '提交'}
      </button>
    </form>
  );
}
```

**useOptimistic**：乐观更新，在异步操作完成前立即更新 UI。

```jsx
const [optimisticMessages, addOptimisticMessage] = useOptimistic(
  messages,
  (state, newMessage) => [...state, { text: newMessage, sending: true }]
);

const handleSubmit = async (formData) => {
  const text = formData.get('message');
  addOptimisticMessage(text); // 立即显示（乐观更新）
  await sendMessage(text);    // 后台发送
};
```

**use()**：在 render 中直接读取 Promise 或 Context。

```jsx
// 读取 Promise
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map(c => <div key={c.id}>{c.text}</div>);
}

// 读取 Context
function ThemeButton() {
  const theme = use(ThemeContext);
  return <button style={{ background: theme.bg }}>按钮</button>;
}
```

### 2. React DOM 静态 API

React 19 引入了 `prerender` 和 `prerenderToNodeStream` 两个新的 API，用于改进静态 HTML 生成，支持流环境如 Node.js Streams 和 Web Streams。

```jsx
import { prerender } from 'react-dom/static';

const { prelude } = await prerender(<App />);
```

### 3. 改进与兼容性

**Ref 作为属性**：函数组件现在可以直接通过属性访问 ref，不再需要 `forwardRef`。

```jsx
// v18 及以前
const MyInput = forwardRef((props, ref) => <input ref={ref} {...props} />);

// v19
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

**文档元数据支持**：React 19 原生支持在组件中渲染 `<title>`、`<meta>` 和 `<link>` 标签，自动提升至文档的 `<head>`。

```jsx
function Page() {
  return (
    <>
      <title>我的页面</title>
      <meta name="description" content="页面描述" />
      <link rel="icon" href="/favicon.ico" />
      <h1>你好</h1>
    </>
  );
}
```

**样式表支持**：通过声明优先级管理样式表的插入顺序，确保样式在依赖内容显示前加载完成。

```jsx
function Component() {
  return (
    <>
      <link rel="stylesheet" href="critical.css" precedence="high" />
      <link rel="stylesheet" href="normal.css" precedence="default" />
      <div>内容</div>
    </>
  );
}
```

**异步脚本支持**：支持在组件树中任意位置渲染异步脚本，确保不会重复加载。

```jsx
function Component() {
  return (
    <>
      <script src="analytics.js" async />
      <div>内容</div>
    </>
  );
}
```

### 4. React Compiler（v19.2，2025 年 10 月）

React Compiler 在 v19.2 中正式发布 v1.0，标志着 React 进入**编译时优化**时代：

- **自动记忆化** — 编译器自动为组件和 Hook 添加记忆化，无需手动使用 `React.memo`、`useMemo`、`useCallback`
- **细粒度更新** — 编译器分析组件内部的数据流，只重新渲染真正变化的部分
- **零配置启用** — 通过 Babel/Vite 插件即可启用，无需修改代码

```jsx
// 以前：需要手动优化
const ExpensiveComponent = React.memo(({ data }) => {
  const processed = useMemo(() => heavyProcess(data), [data]);
  const handleClick = useCallback(() => doSomething(data), [data]);
  return <div onClick={handleClick}>{processed}</div>;
});

// React 19.2 + Compiler：编译器自动处理
function ExpensiveComponent({ data }) {
  const processed = heavyProcess(data); // 编译器自动记忆化
  const handleClick = () => doSomething(data); // 编译器自动稳定引用
  return <div onClick={handleClick}>{processed}</div>;
}
```

---

## 版本演进总结

| 版本 | 核心主题 | 关键特性 |
|------|---------|---------|
| **v16** | Fiber 架构 | 时间切片、错误边界、Fragment |
| **v17** | 渐进升级 | 新 JSX Transform、事件委托到根节点 |
| **v18** | 并发渲染 | Automatic Batching、Concurrent Features、SSR 改进 |
| **v19** | 开发体验 | Actions、新 Hooks、Ref as Props、Compiler |

React 的演进方向：
1. **更好的性能** — 从同步到并发，从运行时优化到编译时优化
2. **更好的开发体验** — 简化常见模式（Actions、Ref as Props）
3. **更好的服务端渲染** — 流式渲染、Server Components

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

#### 背景：为什么需要静态 API？

React 18 的 `renderToString` 和 `renderToPipeableStream` 主要用于 **SSR（服务端渲染）**，需要配合客户端 hydration。但有些场景只需要**纯静态 HTML**，不需要 hydration：

- **静态站点生成（SSG）** — 构建时生成 HTML，部署到 CDN
- **邮件模板** — 生成 HTML 邮件内容
- **PDF 生成** — 将 React 组件渲染为 HTML 再转 PDF
- **爬虫友好** — 生成纯 HTML 供搜索引擎抓取

#### `prerender` — 生成完整 HTML

```jsx
import { prerender } from 'react-dom/static';

// 生成完整 HTML（包含 doctype、html、head、body）
const { prelude } = await prerender(<App />);

// prelude 是一个 ReadableStream，可以转换为字符串
const html = await new Response(prelude).text();
console.log(html);
// <!DOCTYPE html><html><head>...</head><body>...</body></html>
```

**使用场景**：SSG 构建时生成静态 HTML 文件

```jsx
// 构建脚本示例
import { prerender } from 'react-dom/static';
import fs from 'fs';

async function build() {
  const { prelude } = await prerender(<App />);
  const html = await new Response(prelude).text();
  fs.writeFileSync('dist/index.html', html);
}

build();
```

#### `prerenderToNodeStream` — Node.js 流式生成

```jsx
import { prerenderToNodeStream } from 'react-dom/static.node';

// 返回 Node.js Readable Stream
const stream = prerenderToNodeStream(<App />);

// 直接写入文件
stream.pipe(fs.createWriteStream('dist/index.html'));

// 或在 Express 中返回
app.get('/', (req, res) => {
  stream.pipe(res);
});
```

**使用场景**：服务端动态生成 HTML 响应

#### 与 SSR API 的区别

| API | 用途 | 是否需要 Hydration |
|---|---|---|
| `renderToString` | SSR，生成 HTML 字符串 | ✅ 需要 |
| `renderToPipeableStream` | SSR，流式渲染 | ✅ 需要 |
| `prerender` | 静态 HTML 生成 | ❌ 不需要 |
| `prerenderToNodeStream` | 静态 HTML 流式生成 |  不需要 |

**核心区别**：静态 API 生成的 HTML 是"死"的，没有 React 运行时，不能交互；SSR API 生成的 HTML 需要客户端 hydration 才能交互。

#### 完整示例：SSG 构建脚本

```jsx
import { prerender } from 'react-dom/static';
import fs from 'fs';
import path from 'path';

const routes = ['/', '/about', '/contact'];

async function build() {
  for (const route of routes) {
    const { prelude } = await prerender(<App route={route} />);
    const html = await new Response(prelude).text();
    const filePath = path.join('dist', route === '/' ? 'index.html' : `${route}.html`);
    fs.writeFileSync(filePath, html);
    console.log(`Generated: ${filePath}`);
  }
}

build();
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

**文档元数据支持**：React 19 原生支持在组件中渲染 `title`、`meta` 和 `link` 标签，自动提升至文档的 `head`。

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

### 4. React Compiler（v1.0，2025 年 10 月 7 日）

React Compiler 在 2025 年 10 月 7 日正式发布 v1.0，标志着 React 进入**编译时优化**时代。

#### 发布时间线

| 阶段 | 时间 | 状态 |
|---|---|---|
| **Experimental** | 2024 年 5 月（React Conf） | ✅ 已完成 |
| **Public Beta** | 2024 年 10 月 21 日 | ✅ 已完成 |
| **Release Candidate (RC)** | 2025 年初 | ✅ 已完成 |
| **v1.0 Stable** | 2025 年 10 月 7 日 | ✅ **已发布** |

#### 核心功能

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

// React 19 + Compiler：编译器自动处理
function ExpensiveComponent({ data }) {
  const processed = heavyProcess(data); // 编译器自动记忆化
  const handleClick = () => doSomething(data); // 编译器自动稳定引用
  return <div onClick={handleClick}>{processed}</div>;
}
```

#### 已知限制

1. **需要遵守 React 规则** — 违反 Rules of React 的代码会被跳过编译
2. **TypeScript 严格模式** — 需要开启 `strictNullChecks`
3. **某些模式不支持** — 如动态属性访问、某些闭包模式
4. **调试体验** — 编译后代码难以调试，需要 source map 支持

#### 实际采用情况

- **Next.js** — 已在 Next.js 15+ 中集成支持
- **Meta 内部** — 已在 Facebook/Instagram 生产环境使用
- **社区采用** — 逐步推广中，建议新项目尝试

#### 启用方式

```bash
# 安装
npm install -D babel-plugin-react-compiler@latest

# 或先使用 ESLint 插件检查代码合规性
npm install -D eslint-plugin-react-compiler@latest
```

**建议**：先在非关键路径上试用，确保代码符合 React 规则后再全面启用。

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

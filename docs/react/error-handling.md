# 错误处理

React 提供了错误边界（Error Boundaries）机制来捕获和处理组件树中的错误。

---

## Class 组件的错误处理

### 两个 API

1. **getDerivedStateFromError** — 静态方法，当错误发生后，提供一个机会渲染 fallback UI
2. **componentDidCatch** — 组件实例方法，提供一个机会记录错误信息

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state，下次渲染时显示 fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息到服务
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>出错了：{this.state.error.message}</h1>;
    }
    return this.props.children;
  }
}

// 使用
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

官方更建议使用 `getDerivedStateFromError`，这是类组件的一个静态方法，返回值会合并到组件 state 中，在这个时机渲染错误视图比较靠前，就不需要在 `componentDidCatch` 中再降级 UI。

### 性能建议

**为了最佳性能，官方建议与渲染有关的 error state 优先用 `getDerivedStateFromError` 处理**：

- **Render 阶段错误**：`getDerivedStateFromError` 返回的 state 可在同一次渲染中使用，直接显示 fallback UI，无需额外渲染
- **Commit 阶段错误**：即使使用 `getDerivedStateFromError`，也需要额外触发一次渲染（因为 DOM 已更新），但仍比在 `componentDidCatch` 中 setState 更优

**避免在 `componentDidCatch` 中更新 state**，因为它在 commit 阶段执行，setState 会触发额外的 render → commit 流程，造成性能浪费和可能的 UI 闪烁。

**正确分工**：
- `getDerivedStateFromError` — 负责"怎么显示错误 UI"（更新 state）
- `componentDidCatch` — 负责"错误发生后要做什么"（日志上报、监控等副作用）

### Error Boundaries 的局限

Error Boundaries 作为父组件（Class Component），它的子孙组件渲染发生的错误都会被它的 `componentDidCatch` 方法捕获到。但有四类错误不会被捕获：

1. **事件回调错误** — 事件处理函数中的错误
2. **异步代码错误** — setTimeout、Promise 等异步代码中的错误
3. **SSR 错误** — 服务端渲染时的错误
4. **Error Boundary 本身内部错误** — 错误边界组件自身的错误

---

## 函数组件的错误处理

函数组件没有 `componentDidCatch` 和 `getDerivedStateFromError`，但可以通过以下方式处理错误：

### 1. 使用第三方库

```jsx
import { ErrorBoundary } from 'react-error-boundary';

function FallbackComponent({ error, resetErrorBoundary }) {
  return (
    <div>
      <p>出错了：{error.message}</p>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={FallbackComponent}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### 2. 错误状态管理

```jsx
function MyComponent() {
  const [error, setError] = useState(null);

  const handleClick = async () => {
    try {
      await fetchData();
    } catch (err) {
      setError(err);
    }
  };

  if (error) {
    return <div>加载失败：{error.message}</div>;
  }

  return <button onClick={handleClick}>加载数据</button>;
}
```

### 3. useEffect 中的错误处理

```jsx
function DataFetcher({ url }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setData(data);
      })
      .catch(err => {
        if (!cancelled) setError(err);
      });

    return () => { cancelled = true; };
  }, [url]);

  if (error) return <div>加载失败</div>;
  if (!data) return <div>加载中...</div>;
  return <div>{data.name}</div>;
}
```

---

## 实现原理

### 如何捕获

基本上通过 `try...catch` 中 catch 去捕获：

- **render 阶段**：`handleError` 处理
- **commit 阶段**：`captureCommitPhaseError` 处理

### 捕获后的处理

捕获错误之后会构建 callback 函数，从捕获错误的 FiberNode 逐层向上遍历，找到最近的 Error Boundary：

**找到 Error Boundary**：执行 `createClassErrorUpdate` 方法构造两个 callback
1. 用于**执行 Error Boundary API** 的 callback（`getDerivedStateFromError`）
2. 用于**抛出 React 提示信息** 的 callback（`componentDidCatch`）

**未找到 Error Boundary**：同样也会构建一个用于**抛出 React 提示信息**和**抛出未捕获错误** 的 callback

### 何时执行 callback

**找到 Error Boundary**：通过 `this.setState` 执行

```jsx
this.setState(
  () => {
    // 用于执行 getDerivedStateFromError 的 callback
  },
  () => {
    // 执行抛出 React提示信息 callback
    // 执行 componentDidCatch 的 callback
  }
);
```

**未找到 Error Boundary**：通过 `ReactDOM.render` 的回调执行

```jsx
ReactDOM.render(el, container, () => {
  // 执行抛出 React 提示信息和抛出未捕获错误的 callback
});
```

---

## 最佳实践

采用**五层防护**策略，覆盖前端所有错误场景：

### 第一层：try-catch 处理可预期的异步错误

异步操作（API 请求、文件读取等）的错误**不会被 Error Boundary 捕获**，必须手动处理：

```jsx
function DataFetcher({ url }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => setError(err));  // 手动捕获异步错误
  }, [url]);

  if (error) return <div>加载失败：{error.message}</div>;
  if (!data) return <div>加载中...</div>;
  return <div>{data.name}</div>;
}
```

**适用场景**：API 请求、setTimeout、Promise 等异步操作

---

### 第二层：Error Boundary 处理渲染阶段的未预期错误

#### 全局错误边界

在应用最外层包裹，兜底所有未预期的渲染错误：

```jsx
function App() {
  return (
    <ErrorBoundary fallback={<GlobalError />}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

#### 局部错误边界

对关键组件单独包裹，避免一个组件错误影响整个应用：

```jsx
function Dashboard() {
  return (
    <div>
      <Header />
      <ErrorBoundary fallback={<WidgetError />}>
        <AnalyticsWidget />
      </ErrorBoundary>
      <ErrorBoundary fallback={<WidgetError />}>
        <RecentActivityWidget />
      </ErrorBoundary>
    </div>
  );
}
```

**适用场景**：组件渲染报错、生命周期方法报错、useLayoutEffect 报错

---

### 第三层：window.onerror 兜底全局未捕获错误

作为最后的安全网，捕获所有未被处理的错误：

```jsx
useEffect(() => {
  const handler = (event) => {
    reportError({
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  };
  window.addEventListener('error', handler);
  return () => window.removeEventListener('error', handler);
}, []);
```

**适用场景**：资源加载失败、Web Worker 错误、其他未捕获的全局错误

---

### 第四层：unhandledrejection 捕获未处理的 Promise Rejection

`window.onerror` **无法捕获** Promise rejection，需要单独监听：

```jsx
useEffect(() => {
  const handler = (event) => {
    reportError({
      message: event.reason?.message || event.reason,
      stack: event.reason?.stack,
      context: 'unhandledrejection',
    });
  };
  window.addEventListener('unhandledrejection', handler);
  return () => window.removeEventListener('unhandledrejection', handler);
}, []);
```

**典型场景**：
```jsx
//  这三层都拿不到
Promise.reject(new Error('未捕获的 rejection'));
fetch('/api').then(res => res.json());  // 没有 catch

// ✅ 会被 unhandledrejection 捕获
```

---

### 第五层：crossorigin 配置获取跨域脚本错误详情

加载跨域 JS 报错时，`window.onerror` 只能拿到 `"Script error."`，无法获取错误详情：

```jsx
// ❌ 只能拿到 "Script error."
window.onerror = (msg) => console.log(msg);  // "Script error."

// ✅ 需要两步配置
// 1. HTML 中添加 crossorigin 属性
<script src="https://cdn.example.com/app.js" crossorigin></script>

// 2. CDN 服务端返回 CORS 头
Access-Control-Allow-Origin: *
```

**适用场景**：使用 CDN 加载 JS、第三方脚本错误监控

---

### 错误上报

在每一层都上报错误到监控服务（Sentry、自建监控等）：

```jsx
// Error Boundary 中
componentDidCatch(error, errorInfo) {
  reportError({
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,  // React 组件堆栈
    timestamp: Date.now(),
  });
}

// try-catch 中
try {
  await fetchData();
} catch (err) {
  reportError({ error: err.message, context: 'fetchData' });
  setError(err);
}
```

---

### 用户友好的降级 UI

提供清晰的重试机制，帮助用户恢复：

```jsx
function FallbackComponent({ error, resetErrorBoundary }) {
  return (
    <div>
      <h2>加载失败</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}
```

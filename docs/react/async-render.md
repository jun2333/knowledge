# 异步渲染

React 通过 Suspense 和 React.lazy 实现组件的异步加载和渲染。

---

## Suspense & React.lazy

### 原理

Suspense 是一种异步组件，其原理是在调和过程中捕获到 Promise 错误就会从发生错误的 Fiber 向上遍历并重置状态（unwind）直至找到最近的 Suspense 组件。

当 Promise 到 resolve 状态的时候会触发一次 update，组件重新 render。

**完整工作流程**：

```
1. beginWork 进入 Suspense → 返回 Offscreen（mode: visible）
2. 继续子组件 beginWork → render 过程中捕获到 Promise（Promise 会被当作错误抛出）
3. 为最近的 Suspense 组件标记 ShouldCapture flag（界定 unwind 流程终止位置）
4. Unwind 流程（向上遍历重置状态）→ 直到遇到符合条件的 Suspense 组件终止
5. 从终止 unwind 的 FiberNode 继续 beginWork → commit 阶段渲染 fallback UI
6. Promise 请求成功后 → 回调自动触发一次 update → Suspense 组件再次进入 render 阶段
7. 第三次 beginWork → 返回 Offscreen（mode: visible），渲染真实内容
```

### React.lazy 实现原理

React.lazy 内部模拟 Promise A 规范，默认执行 init 方法，当 Promise 是 pending 状态的时候会 throw 这个 Promise 实例。

```javascript
function lazy(ctor) {
  return {
    $$typeof: REACT_LAZY_TYPE,
    _payload: {
      _status: -1,  // 初始化状态
      _result: ctor,
    },
    _init: function(payload) {
      if (payload._status === -1) { /* 第一次执行会走这里 */
        const ctor = payload._result;
        const thenable = ctor();
        payload._status = Pending;
        payload._result = thenable;
        thenable.then((moduleObject) => {
          const defaultExport = moduleObject.default;
          resolved._status = Resolved; // 1 成功状态
          resolved._result = defaultExport; /* defaultExport 为我们动态加载的组件本身 */
        });
      }
      if (payload._status === Resolved) { // 成功状态
        return payload._result;
      } else { // 第一次会抛出 Promise 异常给 Suspense
        throw payload._result;
      }
    }
  };
}
```

### 应用：懒加载组件

Suspense 结合 React.lazy 完成懒加载组件：

```jsx
const LazyComponent = React.lazy(() => import('./test.js'));

export default function Index() {
  return (
    <Suspense fallback={<div>loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### 路由级别的懒加载

配合 React Router 实现路由级别的代码分割：

```jsx
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Users = lazy(() => import('./pages/Users'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>加载中...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/users" element={<Users />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 嵌套 Suspense

Suspense 可以嵌套使用，实现更精细的加载控制：

```jsx
function App() {
  return (
    <Suspense fallback={<div>加载应用中...</div>}>
      <Header />
      <Suspense fallback={<div>加载内容...</div>}>
        <MainContent />
      </Suspense>
      <Footer />
    </Suspense>
  );
}
```

---

## use() API（React 19）

React 19 引入了 `use()` API，可以在 render 中直接读取 Promise：

```jsx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise); // 直接在 render 中读取
  return comments.map(c => <div key={c.id}>{c.text}</div>);
}

// 使用
function App() {
  const commentsPromise = fetch('/api/comments').then(res => res.json());

  return (
    <Suspense fallback={<div>加载评论...</div>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}
```

---

## Server Components（React 19）

React Server Components（RSC）在 v19 正式稳定，组件可以在服务端执行：

```jsx
// 这个组件只在服务端执行
async function BlogPost({ id }) {
  const post = await db.posts.find(id); // 直接访问数据库
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

**优势**：
- **零 bundle 大小** — 服务端组件代码不会发送到客户端
- **直接访问后端资源** — 数据库、文件系统等
- **自动代码分割** — 按需加载客户端组件

---

## Selective Hydration（选择性注水）

采用 SSR 时，服务端输出 HTML 字符串，浏览器接收后进行初始工作（创建 Fiber Tree、绑定事件等），这个过程称为 **Hydration（注水）**。

传统 Hydration 的问题：
- 页面不同部分优先级有差异，但 Hydration 对所有部分一视同仁
- 整个应用完成 Hydration 之后才能进行交互

**Suspense 的解决方案**：被 Suspense 包裹的组件在 Hydration 过程中优先级较低，但如果用户与之**产生交互**，则会被提高优先级优先注水。

```jsx
function App() {
  return (
    <>
      <Header /> {/* 优先注水 */}
      <Suspense fallback={<div>加载中...</div>}>
        <HeavyComponent /> {/* 延迟注水，用户交互时优先 */}
      </Suspense>
      <Footer /> {/* 优先注水 */}
    </>
  );
}
```

---

## 总结

React 异步渲染的核心思想：

1. **Suspense** — 统一的异步边界，处理加载状态
2. **React.lazy** — 组件级别的代码分割
3. **use()** — 在 render 中直接读取 Promise
4. **Server Components** — 服务端执行，零 bundle 大小
5. **Selective Hydration** — 按需注水，提升交互体验

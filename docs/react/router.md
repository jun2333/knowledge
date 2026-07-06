# React Router 原理

React Router 是 React 生态中最常用的路由解决方案，基于 history 库实现。

---

## 基本原理

### 核心架构

React Router 分为三层：

1. **history** — 路由核心，包括两种路由模式下改变路由的方法、监听路由变化等
2. **react-router** — 在 history 基础上，增加 Router、Routes、Route 等组件处理视图渲染
3. **react-router-dom** — 在 react-router 基础上，增加 Link、NavLink 等 UI 组件，以及 BrowserRouter、HashRouter 两种模式的根部路由

### 前端路由原理

前端路由分两种模式：**history** 和 **hash**。

无论是哪种模式，基本原理都是利用了二者改变不会触发浏览器刷新的原理：

- **Hash 模式** — 利用 `window.location.hash`，改变 hash 不会触发页面刷新
- **History 模式** — 利用 HTML5 History API（`pushState`、`replaceState`），改变 URL 不会触发页面刷新

React Router 通过统一 history 和 hash 两种模式的行为，将特定模式下的 history 对象注入到 Router 组件，由 Router 组件统一负责管理和传递路由状态。传递通过 Context API 进行隔代透传，然后通过 Routes 组件匹配路由决定渲染哪个 Route。

---

## React Router v6/v7 核心 API

### Router 组件

```jsx
import { BrowserRouter, HashRouter } from 'react-router-dom';

// History 模式（推荐）
<BrowserRouter>
  <App />
</BrowserRouter>

// Hash 模式
<HashRouter>
  <App />
</HashRouter>
```

### Routes 和 Route

v6 用 `Routes` 替代了 v5 的 `Switch`，路由匹配算法改进为**最佳匹配**而非**顺序匹配**。

```jsx
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/users/:id" element={<UserProfile />} />
      <Route path="*" element={<NotFound />} /> {/* 404 */}
    </Routes>
  );
}
```

**v5 vs v6 对比**：

```jsx
// v5
<Switch>
  <Route path="/about" component={About} />
  <Route path="/users/:id" children={<UserProfile />} />
</Switch>

// v6
<Routes>
  <Route path="/about" element={<About />} />
  <Route path="/users/:id" element={<UserProfile />} />
</Routes>
```

### Link 和 NavLink

```jsx
import { Link, NavLink } from 'react-router-dom';

// 普通链接
<Link to="/about">关于</Link>

// 带状态的链接
<Link to="/dashboard" state={{ from: 'home' }}>仪表盘</Link>

// 激活状态链接
<NavLink
  to="/users"
  className={({ isActive }) => isActive ? 'active' : ''}
>
  用户
</NavLink>
```

### useNavigate（替代 history.push）

```jsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  const handleClick = () => {
    // 基本跳转
    navigate('/home');

    // 带状态
    navigate('/home', { state: { name: 'alien', mes: 'let us learn React!' } });

    // 返回上一页
    navigate(-1);

    // 替换当前记录
    navigate('/home', { replace: true });
  };

  return <button onClick={handleClick}>跳转</button>;
}
```

### useParams（获取动态路由参数）

```jsx
import { useParams } from 'react-router-dom';

function UserProfile() {
  const { id } = useParams();
  return <div>用户 ID: {id}</div>;
}

// 路由配置
<Route path="/users/:id" element={<UserProfile />} />
```

### useSearchParams（获取查询参数）

```jsx
import { useSearchParams } from 'react-router-dom';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q');

  const handleSearch = (newQuery) => {
    setSearchParams({ q: newQuery });
  };

  return <div>搜索：{query}</div>;
}
```

### useLocation（获取当前路由信息）

```jsx
import { useLocation } from 'react-router-dom';

function MyComponent() {
  const location = useLocation();

  console.log(location.pathname); // /users/123
  console.log(location.search);   // ?q=react
  console.log(location.state);    // { from: 'home' }

  return <div>当前路径：{location.pathname}</div>;
}
```

### Outlet（嵌套路由）

v6 引入 `Outlet` 组件用于嵌套路由，替代了 v5 的 `props.children`。

```jsx
import { Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      <header>头部</header>
      <main>
        <Outlet /> {/* 子路由渲染在这里 */}
      </main>
      <footer>底部</footer>
    </div>
  );
}

// 路由配置
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Home />} />
    <Route path="about" element={<About />} />
    <Route path="users" element={<Users />} />
  </Route>
</Routes>
```

---

## v5 迁移到 v6/v7

### 主要变化

| v5 | v6/v7 | 说明 |
|----|-------|------|
| `Switch` | `Routes` | 最佳匹配算法 |
| `component` / `render` / `children` | `element` | 统一使用 JSX 元素 |
| `exact` | 默认精确匹配 | 不再需要 `exact` 属性 |
| `useHistory` | `useNavigate` | 新的导航 API |
| `withRouter` | 移除 | 使用 Hooks 替代 |
| `Redirect` | `Navigate` | 新的重定向组件 |
| `match.params` | `useParams()` | Hooks 获取参数 |
| `location.query` | `useSearchParams()` | 新的查询参数 API |

### 迁移示例

```jsx
// v5
import { Switch, Route, useHistory } from 'react-router-dom';

function App() {
  const history = useHistory();

  return (
    <Switch>
      <Route exact path="/" component={Home} />
      <Route path="/users/:id" render={props => <User {...props} />} />
      <Redirect to="/" />
    </Switch>
  );
}

// v6/v7
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/users/:id" element={<User />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

---

## 路由守卫

React Router v6 没有内置的路由守卫，可以通过以下方式实现：

```jsx
import { Navigate, useLocation } from 'react-router-dom';

function PrivateRoute({ children }) {
  const isAuthenticated = useAuth(); // 自定义 Hook 判断是否登录
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// 使用
<Routes>
  <Route path="/dashboard" element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  } />
</Routes>
```

---

## 懒加载路由

配合 `React.lazy` 和 `Suspense` 实现路由级别的代码分割：

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

---

## 总结

React Router 的核心思想：

1. **声明式路由** — 使用 JSX 组件配置路由，而非命令式配置
2. **嵌套路由** — 通过 `Outlet` 组件实现布局嵌套
3. **最佳匹配** — v6 的路由匹配算法改进为最佳匹配
4. **Hooks API** — 全面支持 Hooks，简化路由信息获取

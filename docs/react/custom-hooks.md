# 自定义 Hook 案例

自定义 Hook 是封装可复用逻辑的函数，必须以 `use` 开头，内部至少调用一个内置 Hook。

---

## useLog — 日志上报

封装 PV/Click 上报逻辑，自动绑定/解绑事件。

```jsx
import React from 'react';

export const LogContext = React.createContext({});

export default function useLog() {
  const message = React.useContext(LogContext);
  const listenDOM = React.useRef(null);

  const reportMessage = React.useCallback(function(data, type) {
    if (type === 'pv') {
      console.log('组件 pv 上报', message);
    } else if (type === 'click') {
      console.log('组件 click 上报', message, data);
    }
  }, [message]);

  React.useEffect(() => {
    const handleClick = (e) => {
      reportMessage(e.target, 'click');
    };

    if (listenDOM.current) {
      listenDOM.current.addEventListener('click', handleClick);
    }

    return () => {
      listenDOM.current?.removeEventListener('click', handleClick);
    };
  }, [reportMessage]);

  return [listenDOM, reportMessage];
}
```

**使用示例**：

```jsx
function MyComponent() {
  const [logRef, reportLog] = useLog();

  return (
    <LogContext.Provider value={{ page: 'home' }}>
      <div ref={logRef}>
        <button onClick={() => reportLog({ action: 'submit' }, 'click')}>
          提交
        </button>
      </div>
    </LogContext.Provider>
  );
}
```

---

## useForceUpdate — 强制更新

当需要手动触发组件重新渲染时使用（如引用了外部可变对象）。

```jsx
function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick(t => t + 1), []);
}
```

**使用示例**：

```jsx
function Component() {
  const forceUpdate = useForceUpdate();
  const externalObj = useRef(new ExternalStore());

  useEffect(() => {
    const unsubscribe = externalObj.current.subscribe(() => {
      forceUpdate(); // 外部状态变化时强制更新
    });
    return unsubscribe;
  }, [forceUpdate]);

  return <div>{externalObj.current.value}</div>;
}
```

---

## useVisible — 可见性检测

利用 IntersectionObserver 实现懒加载、无限滚动等功能。

```jsx
import { useState, useEffect, useRef } from 'react';

function useVisible(options = {}) {
  const { root = null, rootMargin = '0px', threshold = 0.1 } = options;
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        setIsVisible(entry.isIntersecting);
      });
    }, { root, rootMargin, threshold });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [root, rootMargin, threshold]);

  return { ref, isVisible };
}
```

**使用示例**：

```jsx
// 懒加载图片
function LazyImage({ src, alt }) {
  const { ref, isVisible } = useVisible();

  return (
    <img
      ref={ref}
      src={isVisible ? src : 'placeholder.png'}
      alt={alt}
    />
  );
}

// 无限滚动
function InfiniteList() {
  const { ref, isVisible } = useVisible();

  useEffect(() => {
    if (isVisible) {
      loadMore(); // 底部可见时加载更多
    }
  }, [isVisible]);

  return (
    <div>
      {items.map(item => <Item key={item.id} {...item} />)}
      <div ref={ref}>{loading && '加载中...'}</div>
    </div>
  );
}
```

---

## usePrevious — 保存上一次的值

用于比较当前值和上一次的值，常见于动画、条件渲染等场景。

```jsx
function usePrevious(value) {
  const ref = useRef();
  // useEffect 在 render 之后才执行，所以 render 期间 ref.current 还是上一次的值
  // 如果直接在 render 里赋值 ref.current = value，返回的就是当前值而非上一个值
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
```

**使用示例**：

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>当前：{count}</p>
      <p>上一次：{prevCount}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}
```

---

## useDebounce — 防抖

延迟执行函数，适合搜索框输入、窗口 resize 等高频触发场景。

```jsx
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**使用示例**：

```jsx
function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery); // 停止输入 300ms 后才请求
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="搜索..."
    />
  );
}
```

**Tips**：React 18+ 的 `useDeferredValue` 可以替代大部分防抖场景，由 React 调度器自动处理优先级，无需手动设置延迟时间：

```jsx
// 以前：手动防抖
const debouncedQuery = useDebounce(query, 300);

// React 18+：React 自动延迟低优先级更新
const deferredQuery = useDeferredValue(query);
```

`useDeferredValue` 的优势是 React 会根据浏览器空闲时间动态调整延迟，比固定 300ms 更灵活。如果只需要延迟渲染（如搜索结果列表），优先用 `useDeferredValue`；如果需要延迟执行副作用（如 API 请求），`useDebounce` 仍然适用。

---

## useLocalStorage — 本地存储

将状态同步到 localStorage，刷新后数据不丢失。

```jsx
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue];
}
```

**使用示例**：

```jsx
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  return (
    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      当前主题：{theme}
    </button>
  );
}
```

---

## useFetch — 数据请求

封装数据请求逻辑，自动管理 loading、error 状态。

```jsx
function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetch(url, options)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
```

**使用示例**：

```jsx
function UserProfile({ userId }) {
  const { data, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>加载失败</div>;
  if (!data) return null;

  return <div>{data.name}</div>;
}
```

---

## 设计自定义 Hook 的原则

1. **单一职责** — 每个 Hook 只负责一个功能
2. **组合优于继承** — 复杂逻辑通过组合多个简单 Hook 实现
3. **返回值清晰** — 返回数组（按顺序解构）或对象（按名称解构）
4. **依赖管理** — 内部 useEffect 的依赖数组要完整，避免闭包陷阱
5. **清理副作用** — 订阅、定时器、事件监听等要在 cleanup 中清理

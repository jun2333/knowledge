# Hook 设计原则

Custom Hook 是 React 逻辑复用的基本单元。好的 Hook 设计能让逻辑清晰、易测试、易组合。

---

## 核心原则：单一职责

每个 Hook 应该只处理一个关注点。

```jsx
//  职责过重：既处理用户数据，又处理表单，还处理埋点
function useUserPage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });

  useEffect(() => {
    fetchUser().then(setUser);
  }, []);

  useEffect(() => {
    track('page_view', { userId: user?.id });
  }, [user?.id]);

  return { user, form, setForm };
}

// ✅ 职责分离
function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetchUser().then(setUser);
  }, []);
  return user;
}

function useUserForm(initialValues) {
  const [form, setForm] = useState(initialValues);
  return { form, setForm };
}

function usePageView(event, deps) {
  useEffect(() => {
    track('page_view', event);
  }, deps);
}
```

---

## Hook 的边界

### 一个 Hook 应该做什么

- 封装**一个**可复用的逻辑单元
- 返回清晰的数据和方法
- 内部处理副作用的清理

### 一个 Hook 不应该做什么

- 不要在一个 Hook 里处理多个无关的关注点
- 不要让 Hook 的返回值过于复杂（超过 5 个字段考虑拆分）
- 不要让 Hook 依赖外部的隐式状态（除了全局 Context）

---

## Hook 组合 vs Hook 嵌套

### Hook 组合（推荐）

多个独立的 Hook 在组件中并列调用，各自负责一个关注点。

```jsx
function UserPage() {
  const user = useUser();           // 获取用户数据
  const form = useUserForm();       // 管理表单状态
  usePageView({ userId: user?.id }, [user?.id]); // 埋点

  return <div>...</div>;
}
```

优势：
- 每个 Hook 独立，易于理解和测试
- 可以按需组合，灵活复用
- 依赖关系清晰

### Hook 嵌套（谨慎使用）

一个 Hook 内部调用另一个 Hook。

```jsx
function useUserWithForm() {
  const user = useUser();
  const form = useUserForm({ name: user?.name });
  return { user, form };
}
```

适用场景：
- 两个 Hook 有强依赖关系，总是一起使用
- 需要封装一个更高层的抽象

风险：
- 嵌套过深时难以追踪数据来源
- 复用性降低（只能整体复用）

### 选择建议

| 场景 | 推荐方式 |
|------|---------|
| 逻辑独立，可能单独使用 | Hook 组合 |
| 逻辑强相关，总是成对出现 | Hook 嵌套 |
| 不确定时 | 先组合，需要时再嵌套 |

---

## 状态逻辑与副作用分离

### 纯状态 Hook

只管理状态，不包含副作用。易于测试和预测。

```jsx
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}

function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  return { count, increment, decrement };
}
```

### 副作用 Hook

处理副作用（数据获取、订阅、DOM 操作等）。

```jsx
function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
```

### 混合 Hook

既有状态又有副作用，常见于数据获取场景。

```jsx
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url)
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

---

## Hook 的返回值设计

### 返回数组

适合返回值有固定顺序、数量少的场景（如 `useState`）。

```jsx
const [value, setValue] = useToggle();
```

### 返回对象

适合返回值较多、需要按名访问的场景。

```jsx
const { count, increment, decrement } = useCounter();
```

### 选择建议

| 场景 | 推荐方式 |
|------|---------|
| 返回值 ≤ 2 个，顺序固定 | 数组 |
| 返回值 ≥ 3 个，或可能增加 | 对象 |
| 需要解构时重命名 | 对象 |

---

## 避免的陷阱

### 1. Hook 内部条件调用

```jsx
//  错误：Hook 不能在条件语句中调用
function useConditionalHook(flag) {
  if (flag) {
    const [value, setValue] = useState(0); // 违反 Rules of Hooks
  }
}
```

### 2. Hook 返回值包含不稳定引用

```jsx
//  每次渲染都返回新对象，导致依赖这个 Hook 的组件无效重渲染
function useConfig() {
  return { theme: 'dark', lang: 'zh' }; // 每次都是新对象
}

// ✅ 使用 useMemo 稳定引用
function useConfig() {
  return useMemo(() => ({ theme: 'dark', lang: 'zh' }), []);
}
```

### 3. Hook 过度封装

```jsx
//  过度封装：只是简单包装了 useState，没有增加任何价值
function useName(initial) {
  const [name, setName] = useState(initial);
  return [name, setName];
}

// ✅ 直接用 useState，或者封装有意义的逻辑
function useUserName(userId) {
  const [name, setName] = useState(null);
  useEffect(() => {
    fetchUserName(userId).then(setName);
  }, [userId]);
  return name;
}
```

> Hook 的性能优化（如 `useCallback`、`useMemo` 的使用）参见 [性能优化清单](./performance-checklist)。

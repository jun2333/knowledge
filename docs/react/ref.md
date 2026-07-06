# Ref

Ref 用于访问 DOM 元素或保存可变引用，更新不会触发组件重新渲染。

---

## 基本用法

### 类组件

三种方法注册 ref：

```jsx
class MyComponent extends React.Component {
  // 1. 字符串 ref（已不推荐）
  render() {
    return <input ref="inputRef" />;
  }
  componentDidMount() {
    this.refs.inputRef.focus();
  }

  // 2. 回调 ref
  render() {
    return <input ref={el => this.inputRef = el} />;
  }
  componentDidMount() {
    this.inputRef.focus();
  }

  // 3. createRef（推荐）
  constructor() {
    super();
    this.inputRef = React.createRef();
  }
  render() {
    return <input ref={this.inputRef} />;
  }
  componentDidMount() {
    this.inputRef.current.focus();
  }
}
```

### 函数组件

使用 `useRef`：

```jsx
function MyComponent() {
  const inputRef = useRef(null);

  const focusInput = () => {
    inputRef.current.focus();
  };

  return (
    <>
      <input ref={inputRef} />
      <button onClick={focusInput}>聚焦</button>
    </>
  );
}
```

---

## 常见用途

### 1. 访问 DOM 元素

```jsx
const inputRef = useRef(null);
inputRef.current.focus();
inputRef.current.value = 'hello';
```

### 2. 保存定时器 ID

```jsx
const timerRef = useRef(null);

useEffect(() => {
  timerRef.current = setInterval(() => {
    console.log('tick');
  }, 1000);

  return () => clearInterval(timerRef.current);
}, []);
```

### 3. 保存上一次的值

```jsx
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>当前：{count}</p>
      <p>上一次：{prevCount}</p>
    </div>
  );
}
```

### 4. 保存外部可变对象

```jsx
function Component() {
  const storeRef = useRef(null);

  if (!storeRef.current) {
    storeRef.current = new ExternalStore();
  }

  // storeRef.current 不会触发重新渲染
}
```

---

## 原理

配置了 ref 属性的组件会在**初次渲染**和**ref 的值发生变化**的时候打上 Ref tag。

> 如果 ref 属性的值是一个函数，那每次渲染都会被打上 Ref tag，因为行内函数每次指向内存不一样，除非提取出来。

打上 Ref tag 的组件会在 commit 阶段进行重置和赋值操作：

1. **Mutation 阶段**：`commitDetachRef` — 移除旧的 ref
2. **Layout 阶段**：`commitAttachRef` — 重新赋值 ref

---

## useRef vs useState

| | useRef | useState |
|---|---|---|
| **更新触发渲染** | 否 | 是 |
| **适用场景** | 不需要反映到 UI 的值 | 需要反映到 UI 的状态 |
| **值的持久性** | 跨 render 保持 | 跨 render 保持 |
| **典型用途** | DOM 引用、定时器 ID、外部对象 | 表单输入、计数器、开关 |

```jsx
// useRef：更新不触发渲染
const countRef = useRef(0);
countRef.current++; // 不会重新渲染

// useState：更新触发渲染
const [count, setCount] = useState(0);
setCount(c => c + 1); // 会重新渲染
```

---

## React 19 更新：Ref as Props

v19 开始，ref 可以直接作为 props 传递，不再需要 `forwardRef`：

```jsx
// v18 及以前：需要 forwardRef
const MyInput = forwardRef((props, ref) => <input ref={ref} {...props} />);

// v19：ref 直接作为 prop
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

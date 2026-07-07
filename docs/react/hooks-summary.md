# Hooks 用法总结

本文档总结 React 常用 Hook 的用法、使用场景和注意事项。

---

## 状态管理

### useState

管理组件内部状态，状态变化会触发组件重新渲染。

```jsx
const [count, setCount] = useState(0);

// 函数式更新（基于前一个状态计算）
setCount(prev => prev + 1);
```

**使用场景**：简单的视图状态（计数器、表单输入、开关等）

**注意事项**：
- setState 是异步的，连续调用会合并（batching）
- 对象/数组类型的 state 需要返回新引用才能触发更新

---

### useReducer

用于复杂的状态管理，适合状态逻辑较多或下一个状态依赖前一个状态的场景。

```jsx
const initialState = { count: 0 };

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      throw new Error();
  }
}

const [state, dispatch] = useReducer(reducer, initialState);

// 使用
dispatch({ type: 'increment' });
```

**useState vs useReducer**：
- useState：简单状态，逻辑简单
- useReducer：复杂状态，逻辑集中，便于测试和维护
- useState 底层就是 useReducer（使用 `basicStateReducer`）

---

## 副作用

### useEffect

处理副作用（数据请求、订阅、DOM 操作等），在浏览器绘制后异步执行，不阻塞渲染。

```jsx
useEffect(() => {
  // 副作用逻辑
  const subscription = api.subscribe(data);

  // 清理函数
  return () => {
    subscription.unsubscribe();
  };
}, [data]); // 依赖数组
```

**依赖数组规则**：
| 依赖数组 | 执行时机 |
|---------|---------|
| 不传 | 每次 render 后都执行 |
| `[]` | 只在 mount 时执行一次 |
| `[a, b]` | a 或 b 变化时执行 |

**常见陷阱**：
- 闭包陷阱：effect 内部引用的变量如果没有加入依赖数组，会拿到旧值
- 无限循环：effect 内部 setState，且依赖数组包含该 state

---

### useLayoutEffect

与 useEffect 类似，但在 DOM 变更后**同步**执行，会阻塞浏览器绘制。

```jsx
useLayoutEffect(() => {
  // 在浏览器绘制前同步执行
  // 适合需要读取 DOM 布局并同步修改的场景
  const rect = ref.current.getBoundingClientRect();
  if (rect.width < 100) {
    ref.current.style.width = '100px';
  }
}, []);
```

**useEffect vs useLayoutEffect**：
- useEffect：异步执行，不阻塞渲染，适合大多数副作用
- useLayoutEffect：同步执行，阻塞渲染，适合需要测量 DOM 并同步修改的场景

---

### useInsertionEffect

在 **Mutation 阶段**同步执行，**无法访问组件自身的 DOM 节点**（通过 ref 获取），专门为 CSS-in-JS 库设计。

```jsx
useInsertionEffect(() => {
  // 注入样式
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  return () => {
    document.head.removeChild(style);
  };
}, [css]);
```

**为什么无法访问 ref？**

Commit 阶段的执行顺序：
1. **Before Mutation 阶段** — 准备工作
2. **Mutation 阶段** — `safelyDetachRef`（ref.current = null）→ DOM 操作 → **useInsertionEffect 执行**
3. **Layout 阶段** — `safelyAttachRef`（ref.current = 新 DOM 节点）→ useLayoutEffect 执行

useInsertionEffect 执行时，ref 已经被 detach（`ref.current = null`），但新的 DOM 节点还没有被 attach，所以无法通过 ref 访问组件的 DOM 节点。

**可以访问 `document` 全局对象**，因为 `document` 不依赖 ref，始终存在。

**执行顺序**：useInsertionEffect → DOM 变更完成 → useLayoutEffect → 浏览器绘制 → useEffect

**为什么 React 要这样设计？**

1. **CSS-in-JS 需要在 DOM 变更前注入样式** — 这样浏览器在绘制时就能使用新样式，避免闪烁
2. **不允许访问 ref 是为了保证一致性** — Mutation 阶段 ref 已经被重置为 `null`，如果允许访问，只能得到 `null`，无法获取有效的 DOM 节点
3. **强制分离关注点** — CSS-in-JS 只负责注入样式（操作 document.head），不应该依赖组件的 DOM 结构

---

## 缓存与优化

### useCallback

缓存函数引用，避免子组件不必要的重新渲染。

```jsx
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// 传给子组件
<Child onClick={handleClick} />
```

**使用场景**：
- 传给 `React.memo` 包裹的子组件的回调函数
- 作为 useEffect 的依赖

**不要滥用**：对于简单组件或不频繁渲染的场景，直接传函数即可。

---

### useMemo

缓存计算结果，避免每次 render 都重新计算。

```jsx
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);
```

**使用场景**：
- 昂贵的计算（大数据处理、复杂算法）
- 创建对象/数组作为 props 传给子组件

**useCallback vs useMemo**：
- `useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`
- useCallback 缓存函数，useMemo 缓存值

---

## 引用

### useRef

存储可变引用，更新不会触发组件重新渲染。

```jsx
const inputRef = useRef(null);

// 1. 访问 DOM 元素
<input ref={inputRef} />
inputRef.current.focus();

// 2. 保存可变值（不触发渲染）
const timerRef = useRef(null);
timerRef.current = setInterval(() => {}, 1000);

// 3. 保存上一次的值
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;
}
```

**useRef vs useState**：
- useRef：更新不触发渲染，适合存储不需要反映到 UI 的值
- useState：更新触发渲染，适合需要反映到 UI 的状态

---

### useImperativeHandle

配合 `forwardRef` 使用，自定义暴露给父组件的 ref 方法。

```jsx
const FancyInput = forwardRef((props, ref) => {
  const inputRef = useRef();

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => inputRef.current.value = ''
  }));

  return <input ref={inputRef} />;
});

// 父组件使用
const inputRef = useRef();
<FancyInput ref={inputRef} />
inputRef.current.focus();
```

---

## 并发特性

### useTransition

标记低优先级更新，避免阻塞用户交互。

```jsx
const [isPending, startTransition] = useTransition();

const handleFilterChange = (newFilter) => {
  setInputValue(newFilter); // 高优先级：立即更新输入框

  startTransition(() => {
    setFilter(newFilter); // 低优先级：延迟更新列表
  });
};
```

**使用场景**：搜索框输入、筛选器切换等需要立即响应用户操作，但后续更新可以延迟的场景。

---

### useDeferredValue

延迟值更新，将低优先级值的更新推迟到浏览器空闲时。

```jsx
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);

// 输入框立即响应
<input value={query} onChange={e => setQuery(e.target.value)} />

// 列表延迟更新，不阻塞输入
<SearchResults query={deferredQuery} />
```

**实现原理**：当值变化时，保持使用旧值，并通过 `requestDeferredLane()` 调度一个**低优先级的 Transition 更新**（TransitionLane11-14），让 Scheduler 在空闲时再渲染新值。

**useTransition vs useDeferredValue**：
- useTransition：主动标记哪些更新是低优先级
- useDeferredValue：被动延迟某个值的更新

---

## 其他

### useContext

跨层级传递数据，避免 prop drilling。

```jsx
const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  const theme = useContext(ThemeContext);
  return <div>Theme: {theme}</div>;
}
```

**注意事项**：Context 值变化会导致所有消费者重新渲染，可以考虑拆分 Context 或使用 `useMemo` 稳定 value。

---

### useId

生成全局唯一 ID，避免 ID 冲突，保证 SSR 一致性。

```jsx
function FormField() {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Name</label>
      <input id={id} name="name" />
    </>
  );
}
```

**实现原理**：

- **SSR/Hydration**：使用 `treeId`（组件在树中的位置）+ `localId`（组件内调用顺序）生成 id，格式为 `_R{treeId}{localId}_`
- **纯 CSR**：使用全局计数器生成 id，格式为 `_r{counter}_`

**为什么 SSR 和 CSR Hydration 能保持一致的 id？**

SSR 和 Hydration 使用**相同的规则**（treeId + localId），组件的渲染顺序是确定的，所以生成相同的 id。纯 CSR 的规则不同，但跟 SSR 无关，不需要考虑一致性问题。

---

### useSyncExternalStore

订阅外部数据源（如 Redux store、URL 参数），保证并发渲染下的数据一致性。

```jsx
const state = useSyncExternalStore(
  store.subscribe,  // 订阅函数
  store.getState    // 获取当前值
);
```

**实现原理**：每次渲染时直接调用 `getSnapshot()` 获取最新值，通过 `useEffect` 订阅 store 变化。当 store 变化时，检查 snapshot 是否变化，如果变化则用同步优先级强制重新渲染，保证并发渲染下的数据一致性。

**设计初衷**：让 React 能够跟踪外部数据源的变化，并在并发渲染模式下保证数据一致性。

**使用场景**：集成外部状态管理库（Redux、Zustand 等）时推荐使用。

---

## React 19 新增 Hook

### useActionState

管理 Action 的状态（pending、error、result），配合表单 action 使用。

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

**参数**：
- `action` — 异步函数 `(formData) => result`，处理表单提交
- `initialState` — 初始状态（如 `null`）
- `permalink` — 可选，用于服务端行动的永久链接

**返回值**：`[state, action, isPending]`
- `state`：Action 的返回值或初始值
- `action`：绑定到表单 action 的函数
- `isPending`：Action 是否正在执行

---

### useOptimistic

乐观更新，在异步操作完成前立即更新 UI，提升用户体验。

```jsx
import { useOptimistic } from 'react';

function MessageList({ messages, sendMessage }) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [...state, { text: newMessage, sending: true }]
  );

  const handleSubmit = async (formData) => {
    const text = formData.get('message');
    addOptimisticMessage(text); // 立即显示（乐观更新）
    await sendMessage(text);    // 后台发送
  };

  return (
    <div>
      {optimisticMessages.map((msg, i) => (
        <div key={i} style={{ opacity: msg.sending ? 0.5 : 1 }}>
          {msg.text} {msg.sending && '(发送中...)'}
        </div>
      ))}
      <form action={handleSubmit}>
        <input name="message" />
        <button>发送</button>
      </form>
    </div>
  );
}
```

**参数**：
- `currentState` — 当前真实状态（如 `messages`）
- `reducer` — `(state, optimisticValue) => newState`，定义如何合并乐观更新

**返回值**：`[optimisticState, addOptimistic]`
- `optimisticState` — 包含乐观更新的状态
- `addOptimistic` — 触发乐观更新的函数，异步操作完成后自动恢复为真实状态

**失败处理**：如果异步操作失败，乐观更新会自动回滚到真实状态（因为真实状态未改变）。

**使用场景**：点赞、评论、消息发送等需要即时反馈的场景。

---

### use()

在 render 中直接读取 Promise 或 Context，无需 useEffect 或 useContext。

```jsx
// 读取 Promise
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise); // 直接在 render 中读取
  return comments.map(c => <div key={c.id}>{c.text}</div>);
}

// 读取 Context
function ThemeButton() {
  const theme = use(ThemeContext); // 等价于 useContext(ThemeContext)
  return <button style={{ background: theme.bg }}>按钮</button>;
}
```

**注意事项**：
- `use()` 必须在组件或自定义 Hook 的顶层调用
- 读取 Promise 时，组件必须被 Suspense 包裹
- 不能用在条件语句或循环中
- **Promise 引用必须稳定** — 如果每次渲染创建新 Promise 会导致无限循环，需要用 `useMemo` 缓存或直接导出 Promise 实例

```jsx
// ❌ 每次渲染创建新 Promise，无限循环
const data = use(fetchData());

// ✅ 用 useMemo 缓存
const promise = useMemo(() => fetchData(), []);
const data = use(promise);

// ✅ 直接导出 Promise 实例（模块级别单例）
import { dataPromise } from './api';
const data = use(dataPromise);
```

---

### useHostTransitionStatus（Server Components）

在 Server Components 中检测客户端组件的 Transition 状态，用于条件渲染。

```jsx
// 仅在 Server Components 中可用
import { useHostTransitionStatus } from 'react';

function LoadingIndicator() {
  const status = useHostTransitionStatus();
  if (status === 'pending') {
    return <Skeleton />;
  }
  return null;
}
```

**使用场景**：客户端组件通过 `startTransition` 触发低优先级更新，服务端组件需要感知这个状态来决定渲染什么内容。

```jsx
// 客户端组件 — 触发 Transition
'use client';
function SearchButton({ onSearch }) {
  const [startTransition] = useTransition();
  return <button onClick={() => startTransition(() => onSearch())}>搜索</button>;
}

// 服务端组件 — 感知 Transition 状态
function SearchResult() {
  const status = useHostTransitionStatus();
  if (status === 'pending') {
    return <Skeleton />;  // Transition 进行中，显示骨架
  }
  return <ActualResults />;  // 完成，显示真实结果
}
```

**为什么需要它？** 服务端组件没有 `useTransition`（不在浏览器运行，没有交互），但又需要知道客户端组件的 Transition 状态来做条件渲染。这个 Hook 就是给服务端组件开的一个"窗口"，让它能感知到客户端的 Transition 状态。

**简单说**：客户端触发 Transition，服务端感知并响应。

---

## Hook 规则

1. **只在最顶层使用 Hook** — 不要在循环、条件或嵌套函数中调用 Hook
2. **只在 React 函数中调用 Hook** — 不要在普通 JS 函数中调用

违反规则会导致 Hook 状态匹配错乱，引发难以排查的 bug。

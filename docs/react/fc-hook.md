# Function Component 与 Hook

FC（Function Component）和 Hook 的出现解决了 Class Component 时代的两大痛点：

1. **业务逻辑分散** — Class 组件中，相关逻辑往往分散在 `componentDidMount`、`componentDidUpdate`、`componentWillUnmount` 等多个生命周期中
2. **有状态的逻辑复用困难** — HOC 和 Render Props 模式会导致组件嵌套过深（"嵌套地狱"），且逻辑复用不够直观

---

## Hooks 为什么不能用在条件语句中

### 根本原因

Hook 的底层实现依赖**调用顺序**。React 通过链表结构存储每个 Hook 的状态，每次渲染时按顺序匹配：

```
第1次渲染：  useState → useEffect → useState
              ↓          ↓          ↓
Hook链表：   Hook1  →  Hook2  →  Hook3

第2次渲染：  useState → useEffect → useState  ✅ 顺序一致，正确匹配
```

如果在条件语句中使用：

```jsx
// 第1次渲染：showEffect = true
useState('a')        // → Hook1
if (showEffect) {
  useEffect(...)     // → Hook2
}
useState('b')        // → Hook3

// 第2次渲染：showEffect = false
useState('a')        // → Hook1 ✅
// useEffect 被跳过
useState('b')        // → 期望匹配 Hook3，实际匹配到 Hook2 ❌ 顺序错乱！
```

**结论**：条件语句会破坏 Hook 的调用顺序，导致状态匹配错乱，引发难以排查的 bug。

---

## Hooks 与 Update 以及 FiberNode 的关系

### 数据结构

```
FiberNode
  └── memoizedState → Hook1 → Hook2 → Hook3 → null（单向链表）
                          ↓
                        queue → update1 → update2 → null（循环链表）
```

- **FiberNode.memoizedState**：存储该组件的 Hook 链表头节点
- **Hook.memoizedState**：存储 Hook 自身的状态（如 useState 的值、useEffect 的 destroy 函数）
- **Hook.queue**：存储该 Hook 待处理的 Update 链表

### useState 简易实现

```javascript
// Mount 阶段
function mountState(initialState) {
  const hook = {
    memoizedState: initialState,  // 当前状态值
    queue: { pending: null },     // 待处理的 update 队列
    next: null                    // 指向下一个 hook
  };
  // 将 hook 追加到 fiberNode.memoizedState 链表尾部
  appendHookToChain(hook);
  return [hook.memoizedState, dispatchState.bind(null, hook)];
}

// Update 阶段
function updateState() {
  // 1. 从 fiberNode 中按顺序取出对应的 hook
  const hook = getCurrentHook();
  // 2. 处理 queue.pending 中的 update，计算新 state
  const newState = processUpdateQueue(hook.queue);
  // 3. 更新 memoizedState
  hook.memoizedState = newState;
  return [newState, dispatchState.bind(null, hook)];
}
```

---

## Suspense 组件

### 应用场景

1. **React.lazy** — 配合懒加载组件，在组件加载期间显示 fallback
2. **配合 startTransition / useTransition** — Transition 可以降低组件优先级，使 Suspense 的 fallback 不被渲染
3. **Server Component** — 服务端组件获取数据后返回序列化的 JSX，Suspense 处理中间状态
4. **Selective Hydration（选择性注水）**

### Selective Hydration（选择性注水）

采用 SSR 时，服务端输出 HTML 字符串，浏览器接收后进行初始工作（创建 Fiber Tree、绑定事件等），这个过程称为 **Hydration（注水）**。

传统 Hydration 的问题：
- 页面不同部分优先级有差异，但 Hydration 对所有部分一视同仁
- 整个应用完成 Hydration 之后才能进行交互

**Suspense 的解决方案**：被 Suspense 包裹的组件在 Hydration 过程中优先级较低，但如果用户与之**产生交互**，则会被提高优先级优先注水。

### 工作流程

Suspense 有两种状态：**suspend（挂起）** 和 **非 suspend**。

1. **suspend 状态**：beginWork 返回 fallback 对应的 FiberNode，Offscreen 对应的 FiberNode mode 为 hidden
2. **非 suspend 状态**：beginWork 返回 Offscreen 对应的 FiberNode，mode 为 visible

**完整渲染流程**（以数据请求为例）：

```
第1次 beginWork：
  └─ 进入 Suspense → 返回 Offscreen（mode: visible）
  └─ 继续子组件 beginWork → render 过程中捕获到 Promise（Promise 会被当作错误抛出）
  ─ 为最近的 Suspense 组件标记 ShouldCapture flag（界定 unwind 流程终止位置）

Unwind 流程（向上遍历重置状态）：
  └─ 直到遇到符合条件的 Suspense 组件或 ErrorBoundary 终止

第2次 beginWork：
  └─ 从终止 unwind 的 FiberNode 继续 beginWork
  ─ commit 阶段渲染挂起状态应该展示的 UI（fallback）

Promise 请求成功后：
  └─ 回调自动触发一次 update
  └─ Suspense 组件再次进入 render 阶段

第3次 beginWork：
  └─ 返回 Offscreen（mode: visible），渲染真实内容
```

---

## Hook 底层实现

### Dispatcher 机制

Hook 的调用都是由 Dispatcher 统一分发。React 内部维护一个 `ReactCurrentDispatcher.current`，根据执行上下文设置为不同的 Dispatcher：

- `HookDispatcherOnMount` — mount 阶段使用
- `HookDispatcherOnUpdate` — update 阶段使用
- `ContextOnlyDispatcher` — 嵌套调用时抛出错误提示

这样设计的好处是，当在条件语句或循环中调用 Hook 时，可以切换到报错 Dispatcher，不需要在每个 Hook 内部耦合错误检查逻辑。

### Hook 数据结构

```javascript
{
  memoizedState: any,      // Hook 的状态值（不同 Hook 结构不同）
  baseState: any,          // 上次计算的结果
  baseQueue: Update | null, // 上次 render 后的 update 链表
  queue: UpdateQueue | null, // 待处理的 update 链表
  next: Hook | null        // 指向下一个 Hook
}
```

不同 Hook 的 `memoizedState` 结构：
- `useState`：存储当前 state 值
- `useEffect`：存储 `{ tag, create, destroy, deps, next }`
- `useRef`：存储 `{ current: value }`

### useEffect 工作流程

**声明阶段**：比较 deps 是否变化（浅比较），无论是否变化都调用 `pushEffect` 创建 effect 并建立环形链表。deps 变化时传入 `HasEffect` tag，标记该 effect 需要执行。

**调度阶段**（仅 useEffect）：在 commit 阶段之前调度，保证此次更新能执行完所有 useEffect。

**执行阶段**：
1. 遍历 effect 链表，执行标记了 `HasEffect` 的 effect 的销毁函数
2. 遍历 effect 链表，执行标记了 `HasEffect` 的 effect 的回调函数

### useState 与 useReducer 的关系

`useState` 是内部预置了 reducer 的 `useReducer`：

```javascript
function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action;
}
```

- mount 阶段：`useState` 在 `hook.queue.lastRenderReducer` 存 `basicStateReducer`，`useReducer` 存用户传入的 reducer
- update 阶段：两者都调用 `updateReducer`，接收 reducer 参数进行计算

### useRef 的工作流程

1. **render 阶段**标记 ref flag：mount 时 ref props 存在，update 时 ref props 发生变化
2. **commit 阶段**针对有 ref 标记的 FiberNode：移除旧的 ref → Layout 阶段重新赋值 ref

---

## 闭包陷阱

### 产生原理

闭包陷阱的本质是：**Hook 回调函数捕获的是创建时的变量值，而非最新值**。

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count); // 永远是 0，不是最新值！
    }, 1000);
    return () => clearInterval(timer);
  }, []); // deps 为空，effect 只执行一次

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**原因分析**：

1. 第 1 次渲染：`count = 0`，`useEffect` 创建闭包，捕获 `count = 0`
2. 点击按钮：`count = 1`，触发重新渲染
3. 第 2 次渲染：`count = 1`，但 `deps = []`，`useEffect` 不重新执行
4. `setInterval` 回调仍然引用第 1 次渲染的闭包，`count` 永远是 `0`

**根本原因**：JavaScript 的闭包机制 + React 的不可变数据模型（每次渲染创建新的变量）

### 解决方案

#### 方案 1：正确设置 deps

```jsx
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count); // 每次 count 变化都会重新创建 effect
  }, 1000);
  return () => clearInterval(timer);
}, [count]); // ✅ 添加 count 到 deps
```

**问题**：每次 `count` 变化都会清除并重新创建定时器，可能不符合预期。

#### 方案 2：使用函数式更新

```jsx
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1); // ✅ 函数式更新，不依赖外部 count
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

**适用场景**：新状态依赖旧状态时（如计数器）。

#### 方案 3：使用 useRef 保存最新值

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);

  // 每次渲染后同步最新值
  useEffect(() => {
    countRef.current = count;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(countRef.current); // ✅ 通过 ref 访问最新值
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**原理**：`useRef` 返回的对象在整个组件生命周期内保持不变，`current` 属性可变，闭包捕获的是 ref 对象本身（不变），而非 `count` 值。

#### 方案 4：使用 useReducer

```jsx
function Counter() {
  const [count, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case 'increment': return state + 1;
      default: return state;
    }
  }, 0);

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: 'increment' }); // ✅ dispatch 是稳定引用
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <button onClick={() => dispatch({ type: 'increment' })}>{count}</button>;
}
```

**原理**：`dispatch` 是稳定引用，不会随渲染变化，闭包捕获的 `dispatch` 始终有效。

### 常见场景总结

| 场景 | 推荐方案 |
|------|---------|
| 新状态依赖旧状态 | 函数式更新 `setState(prev => prev + 1)` |
| 需要在回调中读取最新状态 | `useRef` 保存最新值 |
| 复杂状态逻辑 | `useReducer`（`dispatch` 是稳定引用） |
| 依赖外部变量变化 | 正确设置 `deps` |

### 如何避免闭包陷阱

1. **理解闭包**：回调函数捕获的是创建时的变量值，不是最新值
2. **lint 规则**：启用 `eslint-plugin-react-hooks` 的 `exhaustive-deps` 规则
3. **优先使用函数式更新**：当新状态依赖旧状态时
4. **谨慎使用空 deps**：确保回调中不依赖会变化的变量
5. **必要时用 ref**：当需要在稳定回调中访问最新值时

# React 设计理念

React 是构建**快速响应**大型应用的首选框架。其核心设计理念围绕两个瓶颈展开：**CPU 瓶颈**和**I/O 瓶颈**。

---

## CPU 瓶颈

Svelte 和 Vue 的方向是在 AOT（Ahead-of-Time）编译过程中尽可能优化运行时代码，减少代码量。

React 则选择在**运行时**上下功夫，具体做法是：将 VDOM 的工作过程分成多个**不会导致掉帧**的宏任务，这一技术被称之为 **Time Slice（时间切片）**。

---

## I/O 瓶颈

对于前端应用来说，最大的 I/O 瓶颈是**网络延时**。

为给用户更好的体验，除了提高网络性能之外，React 最大程度降低由于网络延时带来的人机交互卡顿现象。具体做法是：

1. 为不同操作造成的自变量变化赋予**优先级**
2. 所有优先级统一调度，优先处理最高的
3. 如果有任务正在进行（如处理 VDOM 相关工作），遇到高优任务进来能够**中断**当前任务去执行高优任务

React 底层需要实现：

1. 用于调度优先级的**调度器**（Scheduler）
2. 用于调度器的**调度算法**
3. 支持**可中断**的 VDOM 实现

---

## 新旧架构介绍

### V15（旧架构）

- **Reconciler** — VDOM 实现，计算 UI 变化（**递归方式**遍历）
- **Renderer** — 负责渲染 UI 变化到宿主环境

### V16+（新架构）

- **Scheduler** — 调度器，用于调度优先级任务
- **Reconciler（新）** — 计算 UI 变化（**手动递归**遍历，基于 Fiber）
- **Renderer** — 负责将 UI 渲染到宿主环境

在新架构中，更新流程的递归变成**可中断的循环过程**，每次循环都会判断当前 Time Slice 是否还有剩余时间，没有剩余时间则将主线程交出给渲染流水线，等待下一次宏任务继续。

### 特性迭代

React 的并发能力通过渐进方式开启：

| 版本 | 模式 | 说明 |
|------|------|------|
| v15 及以前 | Sync | 旧架构，同步更新 |
| v16、v17 | Async（默认未开启并发） | 新架构，启用 automatic batching 等新功能 |
| v18 | Concurrent Features | 以**是否使用并发特性**作为是否开启并发更新的依据 |

> v18 之前提供三种开发模式：Legacy Mode（`ReactDOM.render`）、Blocking Mode（`createBlockingRoot`）、Concurrent Mode（`createRoot`）。v18 之后不再提供这三种模式，统一使用 `createRoot`，并发更新按需开启。

### 并发特性（v18）

- `startTransition` / `useTransition` — 标记非紧急更新
- `useDeferredValue` — 延迟更新低优先级值

---

## React 19 新特性（2024-2026）

React 19 于 2024 年 12 月发布，后续持续更新（最新 v19.2.7，2026 年 6 月）。带来了多项重要更新，进一步简化开发体验并提升性能：

### 1. Actions

Actions 是处理表单和用户交互的新范式。通过 `action` 属性，React 自动管理：

- **pending 状态** — 自动追踪异步操作是否完成
- **错误处理** — 自动捕获并暴露错误
- **乐观更新** — 配合 `useOptimistic` 实现即时反馈
- **表单重置** — 操作完成后自动重置表单

```jsx
// 传统方式
function Form() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setPending(true);
    setError(null);
    try {
      await submitForm(formData);
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// React 19 Actions
function Form() {
  const [error, submitAction, isPending] = useActionState(submitForm, null);

  return (
    <form action={submitAction}>
      {error && <p>{error}</p>}
      <button disabled={isPending}>
        {isPending ? '提交中...' : '提交'}
      </button>
    </form>
  );
}
```

### 2. 新 Hooks

| Hook | 用途 |
|------|------|
| `useActionState` | 管理 Action 的状态（pending、error、result） |
| `useOptimistic` | 乐观更新，在异步操作完成前立即更新 UI |
| `use()` | 读取 Promise 和 Context 的新 API，可在 render 中直接使用 |

```jsx
// use() 读取 Promise
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise); // 直接在 render 中读取
  return comments.map(c => <div key={c.id}>{c.text}</div>);
}

// useOptimistic 乐观更新
function SendMessage({ messages, sendMessage }) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [...state, { text: newMessage, sending: true }]
  );

  const handleSubmit = async (formData) => {
    const text = formData.get('message');
    addOptimisticMessage(text); // 立即显示
    await sendMessage(text);    // 后台发送
  };

  return <form action={handleSubmit}>...</form>;
}
```

### 3. Server Components 稳定

React Server Components（RSC）在 v19 正式稳定。核心优势：

- **零 bundle 大小** — 服务端组件代码不会发送到客户端
- **直接访问后端资源** — 数据库、文件系统等
- **自动代码分割** — 按需加载客户端组件

### 4. ref 作为 Props

不再需要 `forwardRef`，ref 可以直接作为 prop 传递：

```jsx
// v18 及以前
const MyInput = forwardRef((props, ref) => <input ref={ref} {...props} />);

// v19
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

### 5. Document Metadata 支持

可以直接在组件中渲染 `title`、`meta` 等文档元数据，无需借助 `react-helmet` 等第三方库：

```jsx
function Page() {
  return (
    <>
      <title>我的页面</title>
      <meta name="description" content="页面描述" />
      <h1>你好</h1>
    </>
  );
}
```

### 6. 依赖项优化

React Compiler 可以自动推断 `useMemo` 和 `useCallback` 的依赖项，开发者不再需要手动维护依赖数组：

```jsx
// 以前：需要手动管理依赖
const result = useMemo(() => compute(a, b), [a, b]);

// React 19 + Compiler：自动推断
const result = useMemo(() => compute(a, b)); // 编译器自动添加依赖
```

### 7. React Compiler 正式版（v19.2，2025 年 10 月）

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

> **注意**：React Compiler 仍处于持续优化中，某些场景可能需要手动干预。建议渐进式采用，先在非关键路径上试用。

---

## Fiber 架构

Fiber 是一个基于**优先级策略**和**帧间回调的循环任务调度算法**的架构方案，目的是解决大型任务卡顿问题。

核心思想是**任务拆分和协同**，主动把执行权交给主线程，使得主线程有时间处理高优先级任务。

### 主要特性

1. **增量渲染** — 把渲染任务分割成块，均匀分布到多帧
2. **可暂停、终止、复用** — 渲染任务可以随时中断和恢复
3. **优先级调度** — 给不同类型的更新赋予优先级
4. **并发能力** — 支持同时处理多个更新任务

### 浏览器的帧生命周期（Life of a Frame）

React 的调度器需要与浏览器的帧生命周期协同工作：

1. **用户交互输入事件**（Input Events）
2. **JS Timers**（setTimeout、setInterval）
3. **Begin Frame** — 每一帧事件，如 window resize、scroll 或 media query change
4. **帧回调**（rAF，requestAnimationFrame）
5. **Layout** — 计算元素几何信息
6. **Paint** — 绘制像素到屏幕
7. **Idle**（rIC，requestIdleCallback）— 空闲时间，React 利用这个时间片执行低优先级任务

React 的 Time Slice 就是在步骤 7 的空闲时间中执行，如果时间用完或高优任务到来，就交出控制权。

### v15 版本前的痛点

1. 递归调用，执行栈越来越深
2. 同步更新虚拟 DOM，**不可中断**，中断后也**不可恢复**
3. JS 执行时间长，长时间占用主线程，造成页面卡顿

---

## FiberNode 详解

### FiberNode 的三重含义

1. **作为架构** — 旧架构 Reconciler 通过递归方式执行，新架构 Reconciler 基于 FiberNode 实现手动递归，也被称为 **Fiber Reconciler**
2. **作为静态数据结构** — 存储元素类型、DOM 元素等信息
3. **作为动态数据单元** — 存储变化的数据和要执行的工作（数据增删改查、ref 更新、副作用）

### FiberNode 数据结构

FiberNode 是 Fiber 架构的核心，包含以下关键属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `key` | string \| null | 节点唯一值，用于 diff 复用 |
| `type` | function \| string | 节点类型（组件函数或 HTML 标签） |
| `tag` | number | Fiber 类型标记（FunctionComponent、ClassComponent、HostComponent 等） |
| `return` | Fiber \| null | 指向父节点 |
| `sibling` | Fiber \| null | 右边的兄弟节点 |
| `child` | Fiber \| null | 第一个子节点 |
| `stateNode` | any | DOM 节点引用（HostComponent）或组件实例（ClassComponent） |
| `pendingProps` | any | 新的 props |
| `memoizedProps` | any | 上次渲染使用的 props |
| `memoizedState` | any | 上次渲染的 state（函数组件中是 Hook 链表） |
| `updateQueue` | object \| null | 待处理的更新队列（state 更新、回调等） |
| `flags` | number | 副作用标记（Placement、Update、Deletion 等） |
| `subtreeFlags` | number | 子树的副作用标记 |
| `lanes` | number | 当前节点的优先级 |
| `childLanes` | number | 子节点的优先级 |
| `alternate` | Fiber \| null | 指向另一棵树中对应的 FiberNode（双缓存） |

### 双缓存机制（Double Buffering）

双缓存机制的核心目的是**隔离 Render 阶段的变更**，保证 `current` 树的完整性，并支持**中断恢复**。

**Mount 时构建 Fiber Tree：**

1. `current` 最开始指向 `FiberRootNode`
2. 按照 DFS 顺序依次生成 `workInProgress` FiberNode 并连接它们的关系
3. 完成渲染之后，`current` 指向 `workInProgress` FiberNode，完成双缓存切换

**Update 时更新 Fiber Tree：**

1. 按照 JSX 返回的节点，按照 DFS 顺序依次生成新的 `workInProgress` FiberNode
2. 复用 `current` 树中未变化的节点（bailout 优化）
3. 完成渲染之后，`current` 再次指向新的 `workInProgress` FiberNode

`current` FiberNode 与 `workInProgress` FiberNode 相互通过 `alternate` 属性访问。

```
        current 树                    workInProgress 树
     (屏幕上显示的 UI)              (正在计算的下一帧 UI)

           Root                          Root
          /    \                        /    \
         A      B                      A'     B'
        / \      \                    / \      \
       C   D      E                  C'  D'     E'

渲染完成后：root.current = workInProgress，两棵树角色互换
```

> **为什么需要双缓存？**
>
> 1. **支持中断恢复** — Render 阶段是可中断、可恢复的。`workInProgress` 树提供了独立的计算空间，保证 `current` 树始终完整一致。更新可以被中断，下次继续时从 `workInProgress` 树恢复进度，或者丢弃 `workInProgress` 重新开始，不会影响 `current` 树。
> 2. **复用节点** — 未变化的节点可以直接从 `current` 树复制过来（通过 `alternate` 指针），避免重新创建，提升性能。
> 3. **支持生命周期钩子** — 在 Commit 阶段，React 需要调用 `componentDidUpdate` 等生命周期钩子，这些钩子需要访问更新前的 `props` 和 `state`。有了双缓存树，`current` 树保存了更新前的状态，`workInProgress` 树保存了更新后的状态，可以方便地传递 `prevProps`/`prevState`。
>
> **常见误解澄清**：
> - "避免用户看到不完整的 UI" — 这个说法不够准确。即使没有双缓存，只要分 Render + Commit 两阶段，DOM 操作依然是在 Commit 阶段一次性完成的，用户不会看到中间状态。
> - 双缓存真正解决的是 **React 内部状态的隔离问题**，确保 Render 阶段的可中断性不会破坏 `current` 树的完整性。

---

## 不可变数据模型

### 什么是不可变数据？

**不可变（Immutable）** 意味着数据一旦创建就不能被修改，任何"修改"操作都会返回一个新的数据副本。

```js
// 可变数据（Mutable）— 直接修改原对象
const obj = { count: 0 };
obj.count = 1;  // 原对象被修改了
console.log(obj); // { count: 1 }

// 不可变数据（Immutable）— 返回新对象
const obj = { count: 0 };
const newObj = { ...obj, count: 1 };  // 创建了新对象
console.log(obj);      // { count: 0 } — 原对象没变
console.log(newObj);   // { count: 1 } — 新对象
```

### React 中的表现

React 每次渲染都会创建**全新的变量和函数**：

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  
  // 每次渲染，count 都是一个新的变量
  // 第1次渲染：count = 0（变量 A）
  // 第2次渲染：count = 1（变量 B，不是变量 A 被修改了）
  
  const handleClick = () => {
    console.log(count); // 捕获的是创建时的 count 变量
  };
  
  return <button onClick={handleClick}>{count}</button>;
}
```

**关键点**：
- 第 1 次渲染：`count = 0`，`handleClick` 闭包捕获 `count = 0`
- 第 2 次渲染：`count = 1`（新变量），但 `handleClick` 还是引用第 1 次的 `count = 0`

### 为什么 React 采用不可变数据？

1. **可预测性** — 数据不会在不知情的情况下被修改
2. **易于比较** — 判断数据是否变化只需比较引用（`===`），不需要深度遍历
3. **时间旅行调试** — 每次状态都是独立的快照，可以回溯
4. **并发安全** — 多个任务可以安全地访问不同版本的数据

### 与闭包陷阱的关系

正是因为 React 每次渲染创建新变量，闭包捕获的永远是**创建时的那个变量**，而不是"最新的值"：

```jsx
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count); // 捕获的是第1次渲染的 count 变量
  }, 1000);
}, []); // effect 只执行一次，闭包永远引用第1次渲染的变量
```

### 对比 Vue

Vue 采用**可变数据模型**：

```js
// Vue
const state = reactive({ count: 0 });

// 直接修改原对象
state.count = 1;  // 原对象被修改了

// 闭包中访问的始终是同一个响应式对象
setTimeout(() => {
  console.log(state.count); // 始终是最新值 1
}, 1000);
```

**差异**：
- **React**：每次渲染创建新变量 → 闭包捕获旧值 → 需要 useRef/函数式更新
- **Vue**：响应式对象始终不变 → 闭包访问的是同一个对象 → 自动获取最新值

### 总结

| | React | Vue |
|---|---|---|
| **数据模型** | 不可变（Immutable） | 可变（Mutable） |
| **每次渲染** | 创建新变量 | 修改原对象 |
| **闭包行为** | 捕获创建时的值 | 访问同一个响应式对象 |
| **优势** | 可预测、易比较、时间旅行 | 直观、自动追踪最新值 |
| **代价** | 闭包陷阱、需要手动处理 | 响应式系统复杂度 |

React 的不可变数据模型是其设计哲学的核心，带来了可预测性和并发能力，但也导致了闭包陷阱等问题。理解这一点，就能理解为什么需要 `useRef`、函数式更新、`useReducer` 等解决方案。

---

## 总结

React 的设计理念可以概括为：

1. **用户优先** — 高优先级更新（用户交互）可以打断低优先级更新（数据加载）
2. **渐进式并发** — 并发能力按需开启，不强制所有应用使用
3. **可中断渲染** — 通过 Fiber 架构实现时间切片，避免长时间占用主线程
4. **开发者体验** — React 19 的 Actions、新 Hooks 等特性进一步简化了常见模式的实现

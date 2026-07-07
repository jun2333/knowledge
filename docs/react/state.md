# State

State 是 React 组件的核心概念，用于存储组件内部数据。State 的变化会触发组件重新渲染。

---

## 模式演进

React 的状态更新机制经历了多个模式的演进：

| 版本 | 模式 | 说明 |
|------|------|------|
| v15 及以前 | Sync | 同步更新，不可中断 |
| v16、v17 | Async（默认未开启并发） | 新架构，启用 automatic batching 等新功能 |
| v18+ | Concurrent | 并发模式，automatic batching 默认开启 |

> v18 之前提供三种开发模式：Legacy Mode（`ReactDOM.render`）、Blocking Mode（`createBlockingRoot`）、Concurrent Mode（`createRoot`）。v18 之后不再提供这三种模式，统一使用 `createRoot`，并发更新按需开启。

---

## Legacy 模式下的 State 更新

> 这部分记录历史机制，帮助理解当前设计的演进。

### setState 工作流程

```
1. 生成一个 update 对象，并赋予优先级 expirationTime
2. render 阶段调和找到更新的 Fiber，合并 state 并触发 render 方法更新视图
3. commit 阶段更新实际的 DOM
4. 执行 setState 的 callback
```

### 批量更新

合成事件配合"批量更新锁"控制批量更新。

**缺陷**：JS 异步回调中的 setState 会逃脱 React 的管控，导致无法批量更新：

- **React 能管控的上下文**（事件处理、生命周期）→ 批量更新，多次 setState 合并为一次渲染
- **React 管控不到的上下文**（setTimeout、Promise 回调）→ 非批量，每次 setState 立即触发渲染

```jsx
// 事件处理中 — 批量更新
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);  // 两次更新合并，只渲染一次
}

// setTimeout 中 — 非批量（React 17 及以前）
setTimeout(() => {
  setCount(c => c + 1);  // 立即渲染
  setFlag(f => !f);      // 又渲染一次
}, 1000);
```

React 提供了 `batchedUpdates` API 解决异步场景下无法批量更新的问题：

```jsx
import { unstable_batchedUpdates } from 'react-dom';

setTimeout(() => {
  unstable_batchedUpdates(() => {
    setCount(c => c + 1);
    setFlag(f => !f); // 两次更新会批量处理
  });
}, 1000);
```

### flushSync

将更新的优先级提到最高，强制同步更新：

```jsx
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1); // 立即同步更新 DOM
});
```

优先级：`flushSync 中的 setState` > `正常执行上下文中的 setState` > `setTimeout/Promise 中的 setState`

---

## React 18+ 的 State 更新

### Automatic Batching

React 18 开始，**所有场景都默认批量更新**，不再需要 `unstable_batchedUpdates`：

```jsx
// React 18+：所有场景都自动批量更新
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f); // 批量处理，只触发一次渲染
});

fetch('/api').then(() => {
  setCount(c => c + 1);
  setFlag(f => !f); // 批量处理
});
```

如果需要强制同步更新，使用 `flushSync`：

```jsx
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1); // 立即同步更新
});
```

### useState

按传值分两种情况：

**1. 非函数（直接传值）**

与批量处理机制一致，多次 setState 会合并。

**2. 函数（reducer 形式）**

与直接传值的行为一致，仍然是批量更新。区别在于计算方式：函数式更新基于前一个状态计算，多次调用会累积效果。

```jsx
// 批量更新，只渲染一次
setCount(c => c + 1);
setCount(c => c + 1);
setCount(c => c + 1);
// 最终 count +3（每次基于前一个状态累加）

// 对比：直接传值会被覆盖
setCount(1);
setCount(2);
setCount(3);
// 最终 count = 3（最后一次覆盖前面的）
```

---

## useState 与 setState 的区别

| | setState（Class） | useState（Function） |
|---|---|---|
| **更新方式** | 倾向于将新值与旧值合并（对象浅合并） | 主张重新赋值（完全替换） |
| **回调函数** | 有专门的回调函数监听数据变化 | 只能依赖 useEffect 监听状态变化 |
| **执行时机** | 回调函数在 commit 的 Layout 阶段执行 | useEffect 回调在 commit 的 Layout 阶段之后异步执行 |

---

## 状态设计原则

### 1. 能推导的状态不要单独存储

```jsx
// ❌ 不好：fullName 可以通过 firstName 和 lastName 推导
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [fullName, setFullName] = useState('');

// ✅ 更好：fullName 通过计算得出
const fullName = `${firstName} ${lastName}`;
```

### 2. 保证数据源唯一

同一个数据只存储在一个地方，避免多处存储导致不一致：

```jsx
// ❌ 不好：数据既存在 Redux 中，又存在组件 state 中
const [user, setUser] = useState(null); // 组件内
const reduxUser = useSelector(state => state.user); // Redux 中

// ✅ 更好：单一数据源
const user = useSelector(state => state.user);
```

### 3. 状态最小化

只存储必要的状态，减少状态之间的依赖和同步：

```jsx
// ❌ 不好：存储了所有表单字段
const [formData, setFormData] = useState({ name: '', email: '', age: '' });

// ✅ 更好：使用 useReducer 或表单库管理复杂表单
const [state, dispatch] = useReducer(formReducer, initialState);
```

### 4. 使用 useReducer 管理复杂状态

当状态逻辑复杂、下一个状态依赖前一个状态、或需要集中管理时，使用 `useReducer`：

```jsx
const initialState = { count: 0, step: 1 };

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'setStep':
      return { ...state, step: action.payload };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, initialState);
```

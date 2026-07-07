# Context

Context 用于跨层级传递数据，避免 prop drilling（逐层传递 props）。

---

## Legacy API（已废弃）

> 这部分记录 Context 的演进历史，帮助理解新 API 的设计动机。

Legacy API 需要父子组件都声明静态属性，父组件定义 `getChildContext` 方法：

```jsx
class Parent extends React.Component {
  getChildContext() {
    return { value: this.state.value };
  }
  render() { return <Child />; }
}
Parent.childContextTypes = { value: PropTypes.string };

class Child extends React.Component {
  render() { return <p>{this.context.value}</p>; }
}
Child.contextTypes = { value: PropTypes.string };
```

### Context 中断问题

**现象**：如果组件提供的 Context 发生了变化，但中间父组件的 `shouldComponentUpdate` 返回 `false`，那么使用到该值的后代组件不会更新。

**原因**：旧的 Context 值存在栈里，通过 beginWork 过程入栈，completeWork 过程出栈来获取。当命中 bailout 策略跳过整棵树时，不会有入栈、出栈操作，因此 Context 值变化后，子树也不会被更新。

**结论**：使用旧 Context API 时，如果 Context 值发生变化，子树必然不能命中 bailout 策略。

**解决方案**：官方不建议使用 Legacy Context API。如果硬要用，可以采取发布订阅的方式，当 Context 值变化时通知消费子组件调用 `forceUpdate` 强行更新。

---

## 新 API

新 API 围绕 `React.createContext` 生成的 Provider/Consumer 使用。

```jsx
const ThemeContext = React.createContext(null); // 上下文对象
const ThemeProvider = ThemeContext.Provider;    // 提供者
const ThemeConsumer = ThemeContext.Consumer;    // 订阅消费者
```

**新 API 的优势**：从 Provider 到 Consumer 的传播不受 `shouldComponentUpdate` 限制，即使祖先组件 bailout，Consumer 也能正确更新。

### Provider

Provider 组件传值 `value`，value 变化会导致消费 value 的组件重新渲染。

```jsx
const ThemeContext = React.createContext(null);

function App() {
  const [theme, setTheme] = useState({ color: '#ccc', background: 'pink' });
  return (
    <ThemeContext.Provider value={theme}>
      <Child />
    </ThemeContext.Provider>
  );
}
```

### Consumer

有三种消费方式：

**1. 类组件 — contextType**

```jsx
class ThemedButton extends React.Component {
  render() {
    const { color, background } = this.context;
    return <button style={{ color, background }}>按钮</button>;
  }
}
ThemedButton.contextType = ThemeContext;
```

**2. 函数组件 — useContext**

```jsx
function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button style={theme}>按钮</button>;
}
```

**3. Consumer 组件 — 订阅方式**

```jsx
function ThemedButton({ color, background }) {
  return <button style={{ color, background }}>按钮</button>;
}

function Child() {
  return (
    <ThemeContext.Consumer>
      {theme => <ThemedButton {...theme} />}
    </ThemeContext.Consumer>
  );
}
```

### 高阶用法

**嵌套 Provider**：多个 Provider 嵌套时，分别使用 Consumer 消费各自的信息。

**Provider 覆盖**：同一 Context 的 Provider 逐层传递，下层 Provider 会覆盖上层的，Consumer 只能消费到最近的 Provider 的信息。

```jsx
<ThemeContext.Provider value="light">
  <ThemeContext.Provider value="dark">
    <Child /> {/* 消费到 "dark" */}
  </ThemeContext.Provider>
</ThemeContext.Provider>
```

---

## 实现原理

### Provider

Provider 本质上是一个特殊的 React Element，会被转换成 FiberNode 存在于 Fiber 树中，参与调和（beginWork 阶段）。

**更新流程**：

```
1. pushProvider：将 value 更新到 context 实例的 currentValue 属性上
2. 判断新旧 value 相等且不是 legacy context → 停止更新
3. 否则继续向下调和，找到消费组件（通过对比 fiber.dependencies 是否包含当前 context）
4. 对消费组件 Fiber 标记高优渲染
5. 归的过程 lane 冒泡
```

### Consumer

无论使用哪种方式消费 Context，实质上都是调用 `readContext`：

```
1. 生成一个 contextItem 加入到 fiber.dependencies 链表中
2. 返回 context.currentValue
```

### 新 API 如何解决 Context 中断问题

Provider 和 Consumer 都是特殊的 FiberNode 存在于 Fiber 树中。命中 bailout 后，如果 Context 值变了，则深度遍历子树找到 Context Consumer，为其附加 `renderLanes`，然后 lanes 冒泡到 root，这样子树的 beginWork 流程就不会被跳过。

---

## 常见问题

### Context 与 Props、React-Redux 的对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Props** | 简单直接 | 需要逐层传递（prop drilling） |
| **Context** | 跨层级传递 | 值变化时所有 Consumer 重新渲染 |
| **React-Redux** | 精确订阅，性能更好 | 需要引入额外库 |

### 如何避免 Context 引起的重复渲染

Context 值变化会导致所有 Consumer 重新渲染。解决方案：

**1. 拆分 Context** — 将频繁变化的值和稳定值分开存储

```jsx
const ThemeContext = createContext(null);      // 稳定值
const UserContext = createContext(null);       // 频繁变化
```

**2. 使用 useMemo 稳定 value** — 避免每次 render 都创建新对象

```jsx
const value = useMemo(() => ({ theme, user }), [theme, user]);
```

**3. 使用 use-context-selector** — 可以从 Context value 中选择需要的状态，只有被选择的状态更新时才重新渲染。

```jsx
import { createContext } from 'react';
import { useContextSelector } from 'use-context-selector';

const Context = createContext({ theme: 'light', user: { name: 'Alice' } });

function ThemeDisplay() {
  // 只订阅 theme，user 变化时不会重新渲染
  const theme = useContextSelector(Context, v => v.theme);
  return <div>Theme: {theme}</div>;
}

function UserDisplay() {
  // 只订阅 user.name，theme 变化时不会重新渲染
  const name = useContextSelector(Context, v => v.user.name);
  return <div>User: {name}</div>;
}
```

**原理**：`useContextSelector` 内部对 selector 的返回值做浅比较，只有选中的值变化时才触发重新渲染，避免整个 Context value 变化导致所有 Consumer 更新。

---

## 常见状态管理库

### Redux

**核心概念**：单一 Store、Action、Reducer，状态变更必须通过 dispatch action 触发。

```jsx
// 定义
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: state => { state.value += 1; }
  }
});

// 使用
const dispatch = useDispatch();
const count = useSelector(state => state.counter.value);
dispatch(increment());
```

**优势**：
- 单一数据源，状态可预测
- 时间旅行调试（Redux DevTools）
- 中间件机制（thunk、saga）处理副作用
- 生态成熟，社区庞大

**劣势**：
- 样板代码多（虽然 RTK 已大幅改善）
- 学习曲线陡峭
- 所有组件共享一个 Store，细粒度更新需要额外配置

**实现原理**：
- 基于发布订阅模式，Store 保存状态树
- dispatch action 后，Reducer 纯函数计算新状态
- 通过 `useSelector` 订阅状态，内部使用 `useSyncExternalStore` 保证并发安全
- 默认浅比较，避免不必要的渲染

---

### Zustand

**核心概念**：轻量级 Hook 式状态管理，无需 Provider 包裹。

```jsx
// 定义
const useStore = create((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}));

// 使用
const count = useStore(state => state.count);
const increment = useStore(state => state.increment);
```

**优势**：
- 极简 API，无需 boilerplate
- 不需要 Provider 包裹（基于全局单例）
- 支持 selector 细粒度订阅
- TypeScript 友好

**劣势**：
- 没有内置的副作用处理（需配合中间件）
- 调试工具不如 Redux 完善
- 大规模应用的状态组织需要自行规划

**实现原理**：
- 内部维护一个全局 Store 实例
- 基于 `useSyncExternalStore` 实现订阅
- selector 函数用于提取状态片段，支持浅比较优化
- `set` 方法触发状态更新，通知所有订阅者

---

### Jotai

**核心概念**：原子化状态管理，每个 atom 是独立的状态单元。

```jsx
// 定义
const countAtom = atom(0);
const doubleCountAtom = atom(get => get(countAtom) * 2);

// 使用
const [count, setCount] = useAtom(countAtom);
const doubleCount = useAtomValue(doubleCountAtom);
```

**优势**：
- 原子化组合，避免全局 Store 的耦合
- 派生状态（derived atom）自动追踪依赖
- 支持异步 atom（Suspense 集成）
- 细粒度更新，性能优秀

**劣势**：
- 原子过多时管理成本增加
- 复杂业务逻辑的抽象不如 Redux 清晰
- 学习成本（需要理解 atom 的读写模式）

**实现原理**：
- 每个 atom 是独立的状态节点，存储在 Store 中
- 派生 atom 通过 `get` 函数追踪依赖，形成依赖图
- 状态变更时，只更新受影响的 atom 及其依赖
- 基于 React 的 Concurrent Mode 优化渲染

---

### MobX

**核心概念**：响应式状态管理，通过 observable 自动追踪依赖。

```jsx
// 定义
class CounterStore {
  count = 0;
  increment() { this.count += 1; }
  get doubleCount() { return this.count * 2; }
}

// 使用
const store = useLocalObservable(() => new CounterStore());
observer(() => <div>{store.count}</div>);
```

**优势**：
- 响应式编程，自动追踪依赖
- 代码简洁，无需手动订阅
- 支持计算属性（computed）和动作（action）
- 适合复杂对象和嵌套状态

**劣势**：
- 魔法感强，调试困难（依赖追踪是隐式的）
- 与 React 的函数式理念不完全契合
- 包体积较大

**实现原理**：
- 基于 ES6 Proxy 或 Object.defineProperty 实现 observable
- 运行时自动收集依赖（哪些组件用了哪些属性）
- 状态变更时，只重新渲染依赖该属性的组件
- 计算属性惰性求值，带缓存

---

### Valtio

**核心概念**：基于 Proxy 的响应式状态管理，直接修改对象即可触发更新。

```jsx
// 定义
const state = proxy({ count: 0 });

// 使用
const snap = useSnapshot(state);
state.count += 1;  // 直接修改，自动触发渲染
```

**优势**：
- 极简 API，直接修改对象
- 基于 Proxy，性能优秀
- 支持嵌套对象的细粒度更新
- 与 Immer 集成，支持不可变更新

**劣势**：
- Proxy 有浏览器兼容性要求（IE 不支持）
- 直接修改可能违反不可变数据原则
- 调试时状态变化追踪不如 Redux 直观

**实现原理**：
- 使用 Proxy 包装状态对象，拦截 get/set 操作
- `useSnapshot` 创建快照，渲染时读取快照
- 状态变更时，Proxy 拦截器通知订阅者
- 基于 `useSyncExternalStore` 保证并发安全

---

### 对比总结

| 库 | 核心思想 | 学习曲线 | 性能 | 适用场景 |
|---|---|---|---|---|
| **Redux** | 单一 Store + Reducer | 高 | 中（需配置优化） | 大型应用、复杂状态逻辑 |
| **Zustand** | Hook 式全局 Store | 低 | 高 | 中小型应用、快速开发 |
| **Jotai** | 原子化组合 | 中 | 高 | 细粒度状态、复杂依赖关系 |
| **MobX** | 响应式自动追踪 | 中 | 高 | 复杂对象、嵌套状态 |
| **Valtio** | Proxy 直接修改 | 低 | 高 | 简单状态、偏好可变风格 |

**选择建议**：
- 追求简单快速 → Zustand
- 需要细粒度控制 → Jotai
- 复杂业务逻辑 → Redux
- 偏好响应式 → MobX / Valtio

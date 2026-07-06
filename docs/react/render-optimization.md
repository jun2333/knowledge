# 渲染优化实践

React 提供了多种方式来控制组件的渲染行为，避免不必要的重新渲染。

---

## shouldComponentUpdate & PureComponent

### shouldComponentUpdate

一个配置更新策略的钩子，优先级高于 PureComponent。类组件会调用 `checkShouldComponentUpdate` 函数判断是否需要更新。

```javascript
function checkShouldComponentUpdate() {
  if (typeof instance.shouldComponentUpdate === 'function') {
    return instance.shouldComponentUpdate(newProps, newState, nextContext);
  }
  if (ctor.prototype && ctor.prototype.isPureReactComponent) {
    return !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState);
  }
  return true;
}
```

```jsx
class ExpensiveComponent extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    // 只有 value 变化才更新
    return nextProps.value !== this.props.value;
  }

  render() {
    return <div>{this.props.value}</div>;
  }
}
```

### PureComponent

PureComponent 组件会按照**浅比较**方式去对比 state 和 props 判断是否需要更新。

```jsx
class PureChild extends React.PureComponent {
  render() {
    return <div>{this.props.value}</div>;
  }
}
```

**shallowEqual 浅比较的步骤**：

1. 对比新老 props 和新老 state 是否相等（`===`），相等则不更新组件，不相等进入下一步判断
2. 判断新老 props 和新老 state 是否有存在不是对象或者为 null 的，存在则返回 false
3. 对比新老 props 和新老 state 的 `Object.keys()` 返回的 key 数组长度是否相等
4. 遍历新老 props 和新老 state 的 key 判断值是否变化，这里对比值也是浅比较

**PureComponent 注意事项**：

1. props 的回调函数避免使用箭头函数，因为每次执行 render 都会返回新的回调函数，导致浅比较失效
2. 父组件为函数组件时，避免 props 的回调函数被定义在父组件内，得用 `useCallback` 缓存下（这也是 useCallback 最开始的目的）

```jsx
// ❌ 错误：每次 render 都创建新函数，PureComponent 失效
<PureChild onClick={() => handleClick()} />

// ✅ 正确：使用 useCallback 缓存函数
const handleClickMemo = useCallback(() => handleClick(), []);
<PureChild onClick={handleClickMemo} />
```

---

## React.memo

可以理解成一个高阶组件，包了一层用于决定是否阻断 React 更新。

### 用法

第一个参数：组件（类/函数）
第二个参数（选填）：函数，返回布尔类型决定是否需要重新渲染；当不填的时候按照**浅比较**方式对比 props，相当于**仅比较 props**版本的 PureComponent

```jsx
// 基础用法（浅比较 props）
const MemoChild = React.memo(function Child({ value }) {
  return <div>{value}</div>;
});

// 自定义比较函数
const MemoChild = React.memo(
  function Child({ value, onChange }) {
    return <div onClick={() => onChange(value)}>{value}</div>;
  },
  (prevProps, nextProps) => {
    // 返回 true 表示 props 相等，不需要重新渲染
    return prevProps.value === nextProps.value;
  }
);
```

---

## useMemo 和 useCallback

### useMemo

缓存计算结果，避免每次 render 都重新计算。

```jsx
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);
```

### useCallback

缓存函数引用，避免子组件不必要的重新渲染。

```jsx
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

**使用场景**：
- 传给 `React.memo` 包裹的子组件的回调函数
- 作为 `useEffect` 的依赖

**不要滥用**：对于简单组件或不频繁渲染的场景，直接传函数即可。

---

## 打破渲染限制

`context` / `forceUpdate`：可以穿透以上的阻断方案，包括 PureComponent、React.memo 以及 shouldComponentUpdate。

```jsx
// Context 值变化会导致所有 Consumer 重新渲染，即使使用了 React.memo
const ThemeContext = createContext('light');

const MemoChild = React.memo(function Child() {
  const theme = useContext(ThemeContext); // Context 变化时会重新渲染
  return <div>{theme}</div>;
});
```

---

## 对渲染优化的思考

1. **不用太在意组件是否渲染** — JS 运行速度远大于浏览器渲染 DOM
2. **对于比较耗时的逻辑和大数据才需要进行渲染节流优化** — 如长列表、复杂计算
3. **注意靠近顶层的节点发生没有必要的渲染** — 顶层组件重新渲染会导致整棵子树重新渲染

### 优化策略

| 场景 | 推荐方案 |
|------|---------|
| 简单组件 | 不需要优化，直接渲染 |
| 频繁渲染的列表项 | `React.memo` |
| 昂贵的计算 | `useMemo` |
| 传给子组件的回调 | `useCallback` + `React.memo` |
| 复杂状态逻辑 | `useReducer` |
| 长列表 | 虚拟列表（react-window） |
| 大数据渲染 | 分页、懒加载 |

---

## React Compiler（v19.2+）

React Compiler 可以自动为组件和 Hook 添加记忆化，无需手动使用 `React.memo`、`useMemo`、`useCallback`：

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

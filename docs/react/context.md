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

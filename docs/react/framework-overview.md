# 前端框架概览

本文从设计哲学的角度对比主流前端框架，帮助理解 React 的设计选择及其在框架生态中的定位。

---

## 声明式 vs 命令式

前端框架的核心价值是将开发者从**命令式 DOM 操作**中解放出来，转而使用**声明式**的方式描述 UI。

```jsx
// 命令式（原生 JS）：告诉浏览器"怎么做"
const btn = document.createElement('button');
btn.textContent = '点击';
btn.addEventListener('click', () => {
  count++;
  span.textContent = count;
});
container.appendChild(btn);

// 声明式（React）：告诉浏览器"要什么"
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>点击 {count}</button>;
}
```

声明式的核心思想是：**UI 是状态的函数**（`UI = f(state)`）。开发者只关心状态是什么，框架负责将状态变化同步到 DOM。

---

## 模板语法 vs JSX

框架在描述 UI 时有两种主流方案：

| | 模板语法 | JSX |
|---|---|---|
| **代表框架** | Vue、Angular、Svelte | React |
| **设计思路** | 从 UI 出发，扩展逻辑 | 从逻辑出发，扩展 UI 描述 |
| **语法限制** | 有特定语法（`v-if`、`*ngIf`） | 就是 JavaScript，无额外语法 |
| **静态分析** | 容易（结构固定） | 困难（JS 图灵完备） |

```html
<!-- Vue 模板：UI 结构清晰，但需要学习模板语法 -->
<div v-if="isLoggedIn">
  <span>{{ userName }}</span>
</div>
```

```jsx
// React JSX：就是 JS，灵活但难以静态分析
{isLoggedIn && <span>{userName}</span>}
```

**React 选择 JSX 的原因**：JavaScript 的表达能力远超任何模板语法，可以处理任意复杂的逻辑。代价是放弃了编译时优化的可能性（直到 React Compiler 出现）。

---

## UI 与状态的关系

前端应用本质上是建立**状态（自变量）**与**视图（因变量）**之间的映射关系：

```
状态变化 → 视图更新
```

### 纯函数组件

React 要求组件在给定相同 props 时返回相同的 JSX，这本质上是**纯函数**的要求：

1. **相同输入始终获得相同输出** — 相同的 props 渲染相同的 UI
2. **不产生副作用** — 渲染过程中不修改外部状态

副作用（数据请求、DOM 操作、订阅等）应该放在 `useEffect` 中，在渲染完成后执行。

---

## Virtual DOM

### 为什么需要 VDOM？

React 选择 VDOM 而非模板，主要基于以下考虑：

1. **跨平台能力** — VDOM 是平台无关的 UI 描述，可以渲染到 DOM、Canvas、原生移动端（React Native）、服务端等
2. **表达能力** — JSX 的灵活性远超模板，可以描述任意复杂的 UI 逻辑
3. **开发体验** — 开发者不需要学习额外的模板语法，直接用 JavaScript

### VDOM 的工作原理

```
1. JSX → VDOM 对象（JavaScript 对象描述 UI）
2. 状态变化 → 生成新的 VDOM
3. Diff 算法 → 对比前后 VDOM，计算最小变化
4. 提交到 Renderer → 将变化应用到真实 DOM
```

### VDOM 的性能真相

VDOM **不是**为了"比直接操作 DOM 快"，而是为了：

- **减少频繁的 DOM 操作** — 批量更新，避免布局抖动
- **提供抽象层** — 让框架有机会做优化（如 bailout、并发渲染）
- **跨平台** — 同一套 VDOM 可以渲染到不同环境

> **注意**：VDOM 本身有内存和计算开销。对于简单应用，直接操作 DOM 可能更快。VDOM 的价值在于**可预测的性能**和**开发体验**，而非绝对性能。

---

## 更新策略：AOT vs JIT vs 运行时

框架在"如何找出需要更新的 UI"这个问题上有三种策略：

### AOT（Ahead of Time，预编译）

在构建时分析代码，生成优化的更新逻辑。

```svelte
<!-- Svelte 编译前 -->
<script>
  let count = 0;
</script>
<button on:click={() => count++}>{count}</button>

<!-- Svelte 编译后 -->
// 编译器知道只有 count 变了才需要更新文本节点
if (changed.count) {
  text.nodeValue = count;
}
```

**优势**：运行时开销极小，更新逻辑精确到节点级别。
**劣势**：依赖静态分析，无法处理动态逻辑。

### JIT（Just in Time，即时编译）

在运行时动态编译更新逻辑。Angular 早期使用这种方式，现在已转向 AOT。

### 运行时（Runtime）

在运行时通过 VDOM Diff 计算变化。React 采用这种方式。

**优势**：表达能力最强，可以处理任意动态逻辑。
**劣势**：运行时开销较大，需要 VDOM 树遍历和 Diff 计算。

### 框架定位对比

| 框架 | 策略 | 更新粒度 |
|------|------|---------|
| **Svelte** | AOT 为主 | 元素级（编译时精确到节点） |
| **Vue** | AOT + VDOM 混合 | 组件级 + 元素级（模板编译 + VDOM） |
| **React** | 运行时 VDOM | 组件级（bailout 优化） |

> **更新（2025）**：
> - **Svelte 5** 引入了 Signals 运行时，不再是纯粹的编译时框架
> - **React Compiler**（v19.2）让 React 具备了编译时优化能力，可以自动推断依赖并跳过不必要的重新渲染
> - 框架之间的边界正在模糊，趋向于**编译时 + 运行时混合**的架构

---

## 响应式原理：发布订阅模式

框架需要建立**状态**与**视图**之间的响应式关系。核心是发布订阅模式：

```
状态（发布者）←→ 副作用/视图（订阅者）
```

### 建立订阅关系

```javascript
function subscribe(effect, subs) {
  subs.add(effect);      // 状态记录订阅者
  effect.deps.add(subs); // 订阅者记录依赖的状态
}
```

### 通知更新

当状态变化时，遍历所有订阅者并执行更新：

```javascript
function notify(subs) {
  subs.forEach(effect => effect.update());
}
```

**不同框架的实现差异**：

- **Vue** — 通过 `Proxy` 拦截属性访问，在 getter 中收集依赖，setter 中触发更新
- **React** — 通过 `setState` 显式触发更新，框架内部通过 Fiber 架构调度
- **Svelte** — 编译器在赋值语句处插入更新调用

---

## 前端框架分类

### 按更新粒度

| 粒度 | 说明 | 代表 |
|------|------|------|
| **应用级** | 状态变化触发整个应用重新渲染 | 早期框架 |
| **组件级** | 状态变化触发对应组件重新渲染 | React、Vue |
| **元素级** | 状态变化只更新受影响的 DOM 节点 | Svelte、Solid |

### 按优化时机

| 策略 | 说明 | 代表 |
|------|------|------|
| **编译时优化** | 构建时生成精确更新逻辑 | Svelte、Vue（模板部分） |
| **运行时优化** | 运行时通过算法减少不必要工作 | React |
| **混合** | 编译时 + 运行时结合 | Vue、React（Compiler） |

### 技术选型建议

| 场景 | 推荐 | 原因 |
|------|------|------|
| 大型复杂应用 | React | 生态成熟，并发特性，类型支持好 |
| 中小型项目 | Vue | 上手简单，文档友好，性能均衡 |
| 极致性能 | Svelte/Solid | 编译时优化，运行时开销最小 |
| 跨平台 | React | React Native 生态成熟 |

---

## 总结

前端框架的演进围绕一个核心问题：**如何高效地将状态变化同步到视图**。

- **模板 + AOT**（Vue、Svelte）— 牺牲灵活性换取性能
- **JSX + 运行时**（React）— 牺牲性能换取灵活性
- **混合方案**（Vue 3、React Compiler）— 试图兼顾两者

没有银弹，只有权衡。理解各框架的设计哲学，才能根据项目需求做出合适的选择。

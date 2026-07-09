# 性能优化清单

React 性能优化的核心是**减少不必要的渲染**和**减少渲染的工作量**。

---

## React 的渲染机制回顾

React 渲染是**自顶向下**的：父组件渲染 → 所有子组件渲染 → Diff → 更新 DOM。

性能优化的目标：
1. **减少渲染次数**：避免不必要的重渲染
2. **减少渲染范围**：限制重渲染影响的组件数量
3. **减少渲染成本**：降低单次渲染的计算量

---

## 优化手段

### 1. React.memo

包裹组件，props 浅比较相同时跳过渲染。

```jsx
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* 复杂渲染 */}</div>;
});
```

**适用场景**：
- 组件渲染成本高
- Props 变化频率低

**注意事项**：
- 浅比较本身有成本，简单组件不需要
- Props 包含对象/函数时，需要配合 `useMemo`/`useCallback` 稳定引用

```jsx
//  无效：每次渲染都创建新对象，memo 永远不命中
<ExpensiveComponent config={{ theme: 'dark' }} />

// ✅ 稳定引用
const config = useMemo(() => ({ theme: 'dark' }), []);
<ExpensiveComponent config={config} />
```

### 2. useMemo

缓存计算结果，依赖不变时返回缓存值。

```jsx
const filteredList = useMemo(() => {
  return list.filter(item => item.name.includes(query));
}, [list, query]);
```

**适用场景**：
- 计算成本高（过滤、排序、复杂转换）
- 返回值作为 props 传给 memo 组件

**不适用**：
- 简单计算（加法、字符串拼接）
- 只使用一次的变量

### 3. useCallback

缓存函数引用，依赖不变时返回同一函数。

```jsx
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

**适用场景**：
- 函数作为 props 传给 memo 组件
- 函数作为 useEffect 的依赖

**不适用**：
- 函数只在当前组件使用
- 函数没有传给子组件

### 4. 组件拆分

将频繁变化的部分拆成独立组件，限制渲染范围。

```jsx
// ❌ count 变化导致整个页面重渲染
function Page() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveList /> {/* 无关但被连带渲染 */}
    </div>
  );
}

// ✅ 频繁变化的部分独立
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

function Page() {
  return (
    <div>
      <Counter />
      <ExpensiveList /> {/* 不受 count 影响 */}
    </div>
  );
}
```

> 组件拆分原则参见 [组件设计原则](./component-design)。

### 5. 虚拟列表

长列表只渲染可见区域的元素。

```jsx
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  return (
    <FixedSizeList height={600} itemCount={items.length} itemSize={35}>
      {({ index, style }) => (
        <div style={style}>{items[index]}</div>
      )}
    </FixedSizeList>
  );
}
```

**适用场景**：
- 列表项 > 100 条
- 列表项渲染成本高

### 6. 懒加载

路由级或组件级代码分割，减少首屏加载量。

```jsx
// 路由级
const Dashboard = lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}

// 组件级
const HeavyChart = lazy(() => import('./HeavyChart'));

function Page() {
  const [showChart, setShowChart] = useState(false);
  return (
    <div>
      <button onClick={() => setShowChart(true)}>显示图表</button>
      {showChart && (
        <Suspense fallback={<Loading />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}
```

### 7. 并发特性（React 18+）

#### useTransition

将非紧急更新标记为过渡，避免阻塞用户交互。

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value); // 紧急更新：输入框立即响应

    startTransition(() => {
      // 非紧急更新：搜索结果可以延迟
      const filtered = filterList(value);
      setResults(filtered);
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultList results={results} />
    </div>
  );
}
```

#### useDeferredValue

延迟获取某个值，让紧急更新优先处理。

```jsx
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => filterList(deferredQuery), [deferredQuery]);
  return <ResultList results={results} />;
}
```

---

## 优化决策树

```
组件渲染频繁吗？
├── 否 → 不需要优化
└── 是 → Props 变化频繁吗？
    ├── 否 → React.memo
    └── 是 → 能拆分组件吗？
        ├── 能 → 拆分（让变化部分独立）
        └── 不能 → 优化 Props 引用（useMemo/useCallback）

列表项很多吗？
├── 是 → 虚拟列表
└── 否 → 正常渲染

首屏加载慢吗？
├── 是 → 懒加载（路由/组件）
└── 否 → 不需要

有非紧急更新阻塞交互吗？
── 是 → useTransition / useDeferredValue
└── 否 → 不需要
```

---

## 常见误区

### 1. 过度使用 useMemo/useCallback

```jsx
//  不必要的缓存：简单计算，缓存成本高于计算成本
const doubled = useMemo(() => count * 2, [count]);

// ✅ 直接计算
const doubled = count * 2;
```

### 2. memo 配合不稳定的 Props

```jsx
//  无效：onClick 每次都是新函数
<MemoizedButton onClick={() => handleClick(id)} />

// ✅ 稳定引用
const onClick = useCallback(() => handleClick(id), [id]);
<MemoizedButton onClick={onClick} />
```

### 3. 忽略状态位置的影响

状态放得太高会导致大范围重渲染，优化前先看状态位置是否合理。

> 状态放置原则参见 [状态管理实践](./state-management)。

---

## 性能分析工具

### React DevTools Profiler

- 记录渲染过程，查看每个组件的渲染耗时
- 识别不必要的重渲染
- 查看 props 变化原因

### why-did-you-render

自动检测导致不必要重渲染的组件。

```jsx
import whyDidYouRender from '@welldone-software/why-did-you-render';
whyDidYouRender(React, { trackAllPureComponents: true });
```

### 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| FCP | < 1.8s | 首次内容绘制 |
| LCP | < 2.5s | 最大内容绘制 |
| INP | < 200ms | 交互到下次绘制 |
| CLS | < 0.1 | 布局偏移 |

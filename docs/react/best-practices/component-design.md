# 组件设计原则

组件是 React 应用的基本构建单元。好的组件设计能同时提升**性能**、**可复用性**和**可维护性**。

---

## 核心原则：单一职责

每个组件应该只做一件事。判断标准：

- 能否用一句话清晰描述这个组件的用途？
- 如果 props 超过 5 个，是否职责过重？
- 组件内部的 state 变化是否只影响一个关注点？

```jsx
//  职责过重：既负责数据获取，又负责展示，还负责表单逻辑
function UserPage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });

  useEffect(() => {
    fetchUser().then(setUser);
  }, []);

  return (
    <div>
      <h1>{user?.name}</h1>
      <input value={form.name} onChange={...} />
      <input value={form.email} onChange={...} />
      <button onClick={handleSubmit}>提交</button>
    </div>
  );
}

// ✅ 职责分离
function UserPage() {
  const { user } = useUser();
  return (
    <div>
      <UserProfile user={user} />
      <UserForm />
    </div>
  );
}
```

---

## 组件拆分的思考维度

### 1. 按渲染频率拆分

React 的渲染是**自顶向下**的，父组件渲染会带动所有子组件渲染。将频繁变化的部分拆成独立组件，可以限制渲染范围。

```jsx
// ❌ 整个组件随 count 频繁重渲染
function Page() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <ExpensiveComponent /> {/* 无关但被连带渲染 */}
    </div>
  );
}

// ✅ 频繁变化的部分独立
function Page() {
  return (
    <div>
      <Counter /> {/* 内部管理 count，渲染不影响外部 */}
      <ExpensiveComponent />
    </div>
  );
}
```

> 好的拆分能让 React 命中 **bailout** 策略（props 和 state 都没变时跳过渲染），参见 [性能优化清单](./performance-checklist)。

### 2. 按复用性拆分

问自己：这个 UI 片段会在其他地方出现吗？

- 会 → 抽成独立组件，通过 props 配置差异
- 不会 → 保持现状，避免过度抽象

### 3. 按关注点拆分

- **容器组件**：负责数据获取、状态管理、业务逻辑
- **展示组件**：只负责 UI 渲染，通过 props 接收数据

```jsx
// 容器组件
function UserListContainer() {
  const { users, loading } = useUsers();
  return <UserList users={users} loading={loading} />;
}

// 展示组件（纯函数，易测试，易复用）
function UserList({ users, loading }) {
  if (loading) return <Spinner />;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

## 组合模式 vs 配置模式

### 配置模式（Props）

通过 props 传递配置项，适合简单的组件定制。

```jsx
<Button variant="primary" size="large" disabled />
```

问题：props 过多时难以理解和维护。

### 组合模式（Children）

通过 `children` 或具名插槽组合子组件，适合复杂的布局定制。

```jsx
<Card>
  <Card.Header>标题</Card.Header>
  <Card.Body>内容</Card.Body>
  <Card.Footer>操作</Card.Footer>
</Card>
```

优势：
- 父组件不需要知道子组件的所有细节
- 子组件可以独立演进
- 避免 props drilling

### 选择建议

| 场景 | 推荐模式 |
|------|---------|
| 简单的样式/行为定制 | 配置模式 |
| 复杂的布局/内容定制 | 组合模式 |
| 两者结合 | 复合组件（Compound Components） |

---

## 复合组件模式

复合组件是一组协同工作的组件，共享隐式状态，同时保持灵活的组合能力。

```jsx
// 使用方式
<Select defaultValue="apple">
  <Select.Option value="apple">Apple</Select.Option>
  <Select.Option value="banana">Banana</Select.Option>
</Select>

// 实现
function Select({ children, defaultValue }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <SelectContext.Provider value={{ value, setValue }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  );
}

function Option({ value, children }) {
  const { value: selectedValue, setValue } = useContext(SelectContext);
  const isSelected = selectedValue === value;
  return (
    <div
      className={`option ${isSelected ? 'selected' : ''}`}
      onClick={() => setValue(value)}
    >
      {children}
    </div>
  );
}

Select.Option = Option;
```

---

## 避免过度拆分

拆分不是越多越好。过度拆分的代价：

- **性能**：fiber 节点增多，遍历成本增加；props 传递增加
- **可维护性**：文件过多，跳转成本高；组件间依赖关系复杂
- **可读性**：简单逻辑被分散到多个文件，理解成本增加

### 判断标准

- 组件只在一个地方使用，且逻辑简单 → 不需要拆
- 拆分后组件的 props 比内部逻辑还复杂 → 可能不需要拆
- 为了"纯粹"而拆，但实际没有复用需求 → 不需要拆

> 参见 [性能优化清单](./performance-checklist) 了解拆分对性能的具体影响。

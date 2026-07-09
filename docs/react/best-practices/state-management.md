# 状态管理实践

状态管理是 React 应用的核心挑战。状态放错位置会导致不必要的重渲染、props drilling、或逻辑混乱。

---

## 状态分类

按生命周期和共享范围，状态可以分为：

| 类型 | 生命周期 | 共享范围 | 示例 |
|------|---------|---------|------|
| **本地状态** | 组件挂载期间 | 单个组件 | 表单输入、展开/收起 |
| **提升状态** | 父组件挂载期间 | 兄弟组件 | 列表筛选条件 |
| **Context 状态** | Provider 挂载期间 | 组件树 | 主题、语言、认证信息 |
| **外部状态** | 应用生命周期 | 全局 | 用户信息、缓存数据 |

---

## 状态放置原则

### 1. 能放本地就放本地

状态只在单个组件内使用 → `useState`

```jsx
function SearchInput() {
  const [query, setQuery] = useState('');
  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

### 2. 兄弟组件共享 → 提升到最近的共同父组件

```jsx
//  两个组件各自维护，无法同步
function FilterA() { const [filter, setFilter] = useState(''); ... }
function FilterB() { const [filter, setFilter] = useState(''); ... }

// ✅ 提升到共同父组件
function FilterPage() {
  const [filter, setFilter] = useState('');
  return (
    <>
      <FilterInput value={filter} onChange={setFilter} />
      <FilterList filter={filter} />
    </>
  );
}
```

### 3. 多层传递 → Context 或组件组合

Props drilling 超过 3 层 → 考虑 Context 或组合模式。

```jsx
// ❌ Props drilling
<Page user={user}>
  <Header user={user}>
    <Avatar user={user} />
  </Header>
</Page>

// ✅ Context
const UserContext = createContext(null);
function Page({ user }) {
  return (
    <UserContext.Provider value={user}>
      <Header />
    </UserContext.Provider>
  );
}
function Avatar() {
  const user = useContext(UserContext);
  return <img src={user.avatar} />;
}

// ✅ 组合模式（更推荐，避免 Context 的渲染问题）
function Page({ user }) {
  return <Header avatar={<Avatar user={user} />} />;
}
```

### 4. 全局共享 → 外部状态管理库

跨多个页面、需要持久化或复杂逻辑 → Zustand、Redux、Jotai 等。

```jsx
// Zustand 示例
const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

function UserProfile() {
  const user = useUserStore(s => s.user);
  return <div>{user?.name}</div>;
}
```

---

## 状态粒度

### 细粒度状态

每个字段独立管理，更新范围小，但代码量大。

```jsx
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [age, setAge] = useState(0);
```

### 粗粒度状态

合并成对象，代码简洁，但更新时可能连带无关字段。

```jsx
const [form, setForm] = useState({ name: '', email: '', age: 0 });
// 更新 name 时，email 和 age 也在对象里
```

### 选择建议

| 场景 | 推荐方式 |
|------|---------|
| 字段独立变化，更新频繁 | 细粒度 |
| 字段总是一起更新（如表单提交） | 粗粒度 |
| 不确定时 | 先细粒度，需要时合并 |

> 状态粒度影响渲染范围，参见 [组件设计原则](./component-design) 和 [性能优化清单](./performance-checklist)。

---

## 派生状态

派生状态是从其他状态计算得出的值，**不应该**单独存储。

```jsx
//  冗余存储：fullName 可以从 firstName 和 lastName 计算
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [fullName, setFullName] = useState(''); // 不需要

// ✅ 计算得出
const fullName = `${firstName} ${lastName}`;
```

### 复杂计算用 useMemo

```jsx
const filteredList = useMemo(() => {
  return list.filter(item => item.name.includes(query));
}, [list, query]);
```

---

## 服务端状态 vs 客户端状态

### 服务端状态

来自 API 的数据，特点：
- 需要缓存
- 需要重新验证
- 需要处理加载/错误状态

推荐使用 React Query、SWR 等专用库：

```jsx
function UserProfile({ userId }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <div>{user.name}</div>;
}
```

### 客户端状态

UI 交互产生的数据，特点：
- 不需要缓存
- 不需要重新验证
- 生命周期跟随组件

使用 `useState`、`useReducer` 即可。

### 分离的好处

- 服务端状态由专用库处理缓存、重试、去重
- 客户端状态保持简单，易于理解
- 避免把 API 数据存到全局状态导致同步问题

---

## 状态管理决策树

```
状态需要共享吗？
── 否 → useState（本地状态）
└── 是 → 共享范围多大？
    ├── 兄弟组件 → 提升到共同父组件
    ├── 多层组件 → Context 或组合模式
    └── 全局/跨页面 → 外部状态管理库

状态来自 API 吗？
├── 是 → React Query / SWR
└── 否 → useState / useReducer / 外部库
```

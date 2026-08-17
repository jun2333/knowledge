# Java 集合源码

> **优先级：P0（面试必考）** — HashMap 原理是 Java 面试出镜率最高的题，没有之一。

::: tip 背景
JS 开发者用 `{}`/`Map` 从不关心底层。Java 面试却要你把 HashMap 的数组、链表、红黑树、扩容讲清楚。本文用 JS 对照 + 面试考点组织。
:::

## 总览：集合体系

```
Collection（单列）
├── List（有序可重复）: ArrayList / LinkedList / Vector
├── Set（无序不可重复）: HashSet（底层 HashMap）/ LinkedHashSet / TreeSet
└── Queue: ArrayBlockingQueue / LinkedBlockingQueue

Map（键值对）
├── HashMap（无序，最常用）
├── LinkedHashMap（插入序）
├── TreeMap（按 key 排序）
├── ConcurrentHashMap（线程安全）
└── Hashtable（线程安全，已过时）
```

| JS | Java |
|----|------|
| `[]` | `ArrayList` |
| `{}` 字面量 | `HashMap` |
| `Set` | `HashSet` |
| `Object` 键 | `HashMap`（任意对象可作 key） |

## HashMap 原理（面试核心）

### 数据结构：数组 + 链表 + 红黑树

```
数组 table[]（初始容量 16，2 的幂）
│
├─[0] → null
├─[1] → Node(key, value, hash) → Node → Node    // 链表（hash 冲突）
├─[2] → null
├─[3] → TreeNode ← TreeNode                     // 红黑树（链表 > 8 且容量 ≥ 64）
```

- **put 流程**：`hash(key)` → 定位数组下标（`(n-1) & hash`）→ 空则直接放 → 冲突则挂链表 → 链表长度 > 8 且数组 ≥ 64 转红黑树
- **get 流程**：定位下标 → 遍历链表/树找 key 相同（`equals`）
- **为什么用 2 的幂**：`(n-1) & hash` 等价取模，位运算比 `%` 快；扩容时位置要么不变要么 +oldCap

### 扩容（resize）

- 触发条件：`size > 阈值`（阈值 = 容量 × 0.75 加载因子）
- 新容量 = 旧容量 × 2，**重新计算所有元素位置**（rehash，成本高）
- 为什么加载因子是 0.75：空间与时间折中——太高（如 1）链表长查询慢，太低（如 0.5）浪费空间

### JDK 1.7 vs 1.8 对比（必考）

| 差异 | 1.7 | 1.8 |
|------|-----|-----|
| 数据结构 | 数组 + 链表 | 数组 + 链表 + 红黑树 |
| 插入方式 | **头插法** | **尾插法** |
| 扩容后 rehash | 全部重算 | 优化：位置不变或 +oldCap |
| 并发安全 | 扩容时**可能死循环**（头插法环链） | 无死循环，但仍有数据丢失问题 |

**1.7 头插法为什么死循环**：多线程扩容时链表反转形成环。1.8 改尾插法修复，但 **HashMap 仍然线程不安全**，并发场景必须用 `ConcurrentHashMap`。

## ConcurrentHashMap（线程安全）

| 版本 | 并发控制 |
|------|---------|
| 1.7 | **分段锁**：数组分 16 段，每段一把锁，锁粒度粗 |
| 1.8 | **CAS + synchronized**：只锁链表头节点，粒度更细 |

1.8 核心：插入时对目标桶的**头节点**加 `synchronized`（桶与桶之间并发），统计 size 用 CAS。读操作完全无锁（volatile 保证可见性）。

**面试题**：ConcurrentHashMap 和 Hashtable 区别？——Hashtable 整表一把锁，所有操作串行，已淘汰；ConcurrentHashMap 锁粒度细 + CAS，并发性能高得多。

## ArrayList vs LinkedList（高频）

| 维度 | ArrayList | LinkedList |
|------|-----------|------------|
| 底层 | 动态数组 | 双向链表 |
| 随机访问 `get(i)` | **O(1)** | O(n) |
| 尾部插入 | O(1)（均摊，扩容时 O(n)） | O(1) |
| 中间插入/删除 | O(n)（移动元素） | O(1)（找到节点后） |
| 内存 | 连续，省内存 | 每个节点有前后指针，费内存 |
| 实际使用 | **绝大多数场景用这个** | 队列场景（Deque） |

**注意**：`ArrayList` 扩容 = 新数组 = 1.5 倍旧容量 + 拷贝。`Arrays.asList()` 返回定长视图，不能 add/remove。

**高频题**：ArrayList 和 LinkedList 什么时候用哪个？——随机访问多、尾部追加多用 ArrayList；频繁头尾操作（队列）用 LinkedList。实际业务 95% 用 ArrayList。

## 常见面试陷阱

| 题 | 答案 |
|----|------|
| HashMap 初始容量为什么是 16 | 2 的幂，`(n-1) & hash` 位运算定位 |
| 为什么负载因子 0.75 | 空间与时间折中 |
| 链表什么时候转红黑树 | 长度 > 8 且容量 ≥ 64（先扩容，再转树） |
| 红黑树什么时候退回链表 | 节点数 < 6（防止频繁转换抖动） |
| 自定义对象做 key 要注意什么 | 重写 `equals` 和 `hashCode`（否则同一内容对象查不到） |
| HashMap 允许 null 吗 | key/value 都允许一个 null；ConcurrentHashMap 不允许 |
| HashSet 怎么去重 | 底层是 HashMap，靠 equals + hashCode |

## 延伸阅读

- [Java 并发编程](/service/java-concurrency) - ConcurrentHashMap 的 CAS/synchronized 背景
- [Java 入门（JS 开发者视角）](/service/java-basics) - 集合使用基础
- [Spring 核心原理](/service/spring-principles) - 单例 Bean 容器也是 Map 结构

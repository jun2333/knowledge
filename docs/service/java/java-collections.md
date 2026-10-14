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

## 其他常用容器（面试第二梯队）

### Map 家族

| 容器 | 特点 | 典型场景 |
|------|------|---------|
| `HashMap` | 无序，最快 | 一切默认选择 |
| `LinkedHashMap` | **维护插入顺序**（或访问顺序） | 有序遍历、**实现 LRU**（见下） |
| `TreeMap` | **按 key 排序**（红黑树） | 需要排序/区间查询（`firstKey`/`subMap`） |
| `ConcurrentHashMap` | 线程安全 | 并发缓存 |

```java
// LinkedHashMap：迭代顺序 = 插入顺序
LinkedHashMap<String, Integer> map = new LinkedHashMap<>();
map.put("banana", 2); map.put("apple", 1); map.put("cherry", 3);
map.forEach((k, v) -> System.out.println(k));   // 输出 banana → apple → cherry（不是字母序）

// TreeMap：按 key 自然排序
TreeMap<String, Integer> tree = new TreeMap<>();
tree.put("banana", 2); tree.put("apple", 1);
tree.firstKey();                    // "apple"
tree.subMap("a", "c");              // 区间查询
```

### Set 家族（底层都是 Map）

`HashSet`（快）、`LinkedHashSet`（插入序）、`TreeSet`（排序）。面试常问：**HashSet 怎么去重**——底层就是 HashMap，元素当 key，value 固定是一个 `PRESENT` 常量，靠 `equals`+`hashCode` 判重。

```java
Set<String> set = new HashSet<>();
set.add("a"); set.add("a");        // 第二次加不进去
set.size();                        // 1
```

### fail-fast：迭代时别改集合

```java
List<String> list = new ArrayList<>(List.of("a", "b", "c"));
for (String s : list) {
    list.remove(s);                // ❌ 抛 ConcurrentModificationException
}

// ✅ 用迭代器自己的 remove（或 Java 8+ removeIf）
Iterator<String> it = list.iterator();
while (it.hasNext()) { if (it.next().equals("b")) it.remove(); }
list.removeIf(s -> s.equals("b"));  // ✅ 推荐写法
```

**原理一句话**：集合内部记了个 `modCount`，迭代时一旦发现版本变了就抛异常——这是"快速失败"的保护，不是 bug。**注意：多线程并发改普通集合，fail-fast 不保证一定触发**（它只是尽力而为的检测），并发场景老老实实用并发容器。

### Collections 工具类：集合的瑞士军刀

```java
Collections.sort(list);                       // 排序（List）
Collections.shuffle(list);                    // 打乱（洗牌）
Collections.reverse(list);                    // 反转
Collections.max(list);                        // 最值
List<Integer> sync = Collections.synchronizedList(new ArrayList<>());  // 加锁包装（性能差，了解即可）
Map<String, Integer> empty = Collections.emptyMap();   // 不可变空集合（省内存，常用返回值）
List<Integer> immutable = List.of(1, 2, 3);   // Java 9+ 不可变集合（首选）
```

### 实战：LinkedHashMap 手写 LRU 缓存

面试高频设计题。思路：继承 LinkedHashMap 开启"访问顺序"模式 + 重写淘汰方法：

```java
public class LruCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;

    public LruCache(int capacity) {
        super(capacity, 0.75f, true);    // ① true = 按访问顺序（get 也算一次访问）
        this.capacity = capacity;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;        // ② 超过容量就淘汰最老的（最久未访问的）
    }
}

LruCache<String, String> cache = new LruCache<>(2);
cache.put("a", "1"); cache.put("b", "2");
cache.get("a");                    // 访问过 a，现在 b 变成"最老"
cache.put("c", "3");               // 超容量 → 淘汰 b
cache.keySet();                    // 输出 [a, c]（b 被淘汰）
```

**对应前端**：这就是浏览器缓存淘汰策略的 LRU 算法，`new Map()` 的插入序特性在 JS 里也能玩同样花样。生产环境别手写——直接用 Redis 的 LRU 或 Caffeine 本地缓存。

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
| LinkedHashMap 和 HashMap 区别 | 多一条双向链表维护插入顺序（可切访问顺序），性能略低 |
| TreeMap 按什么排序 | 按 key 自然序或自定义 Comparator，红黑树实现 |
| 迭代中 remove 元素会怎样 | 抛 ConcurrentModificationException（fail-fast）；用迭代器 remove 或 removeIf |
| 怎么实现 LRU | 继承 LinkedHashMap（accessOrder=true）+ 重写 removeEldestEntry |
| `List.of()` 和 `new ArrayList<>()` 区别 | `List.of` 返回不可变集合，add/remove 抛 UnsupportedOperationException |

## 延伸阅读

- [Java 并发编程](/service/java/java-concurrency) - ConcurrentHashMap 的 CAS/synchronized 背景、并发容器全景
- [Java 入门（JS 开发者视角）](/service/java/java-basics) - 集合使用基础
- [Java 语言进阶](/service/java/java-language-advanced) - equals/hashCode 契约、泛型擦除
- [Spring 核心原理](/service/java/spring-principles) - 单例 Bean 容器也是 Map 结构

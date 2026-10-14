# Java 并发编程（JS 开发者视角）

> **优先级：P0（面试必考）** — Java 岗位面试并发几乎必问，且是 JS 开发者最大的知识盲区（JS 单线程，Java 多线程）。

::: tip 背景
JS 里你从不需要考虑线程安全：单线程 + 事件循环，代码一次只跑一处。Java 默认多线程：一个进程内多个线程同时跑，共享内存，因此需要一套机制保证"并发下的正确性"。本文用 JS 心智做锚点，覆盖面试核心考点。
:::

## 心智转换：事件循环 vs 多线程

| 维度 | JS（Node） | Java |
|------|-----------|------|
| 并发单位 | 单线程 + 事件循环 | 多线程（默认一请求一线程） |
| 代码同时执行？ | 否，任何时刻只有一段代码在跑 | 是，多线程可真正并行（多核） |
| 共享数据 | 天然安全 | 需要同步机制 |
| 阻塞代价 | 阻塞 = 卡死整个进程 | 阻塞只卡当前线程 |

**第一个认知**：JS 的 `await` 是"让出事件循环"；Java 的同步调用是"线程等着"。Java 不需要 async/await 是因为线程池里有几百个线程在替它等着。

## JMM：Java 内存模型

JMM 定义了线程间共享变量的可见性规则。核心概念（面试必答）：

- **主内存**：所有线程共享
- **工作内存**：每个线程私有（缓存副本）

```
线程 A ──写──> 工作内存 ──同步──> 主内存 ──同步──> 工作内存 <──读── 线程 B
```

没有同步机制时，线程 A 的修改**可能不被线程 B 看到**（CPU 缓存一致性 + 指令重排序导致）。JMM 通过三个特性解决：

| 特性 | 含义 | 出问题场景 |
|------|------|-----------|
| **原子性** | 操作不可分割 | `count++` 非原子（读-改-写三步） |
| **可见性** | 一个线程修改，其他线程立刻可见 | 无 volatile 时可能读到旧值 |
| **有序性** | 指令不随意重排 | CPU/编译器会重排指令 |

```java
// 经典例子：没有 volatile，线程 B 可能永远循环
static boolean flag = false;   // 加 volatile 修复

// 线程 A
flag = true;
// 线程 B
while (!flag) { /* 可能死循环：B 的缓存里 flag 一直是 false */ }
```

## 三个同步工具

### volatile：轻量级可见性保证

- 保证**可见性 + 有序性**（禁止重排序），**不保证原子性**
- 适用：单写多读的标记位（如上面的 flag）
- `volatile int count++` 依然不安全（不是原子操作）

### synchronized：内置锁（重量级起步，锁升级）

```java
public synchronized void add() { count++; }        // 同步方法：锁 this
public void add() { synchronized (this) { count++; } }  // 同步代码块：粒度更细
```

- 可重入（同一线程可重复拿锁）
- 锁升级过程（JDK 1.6 优化后）：**无锁 → 偏向锁 → 轻量级锁 → 重量级锁**，锁只升不降
  - 偏向锁：无竞争时，记录线程 ID，避免 CAS
  - 轻量级锁：少量竞争时，自旋 CAS 抢锁
  - 重量级锁：竞争激烈时，升级为 OS 互斥量（线程阻塞，上下文切换成本高）

### ReentrantLock：API 级锁（比 synchronized 灵活）

```java
Lock lock = new ReentrantLock();
lock.lock();
try {
    // 临界区
} finally {
    lock.unlock();   // 必须手动释放！
}
```

| | synchronized | ReentrantLock |
|--|-------------|---------------|
| 释放方式 | 自动 | 手动（finally） |
| 可中断 | 否 | `lockInterruptibly()` |
| 公平锁 | 否 | `new ReentrantLock(true)` |
| 超时获取 | 否 | `tryLock(1, TimeUnit.SECONDS)` |
| 底层 | 锁升级（偏向→轻量→重量） | AQS + CAS |

## CAS：无锁并发（compare and swap）

乐观锁思想：先比较后交换，失败就重试：

```java
// 逻辑：只有值还是 expected 时才更新为 update，否则失败
// AtomicInteger 内部就是 CAS
AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet();   // 线程安全，无锁
```

- **优点**：无锁、无阻塞，高并发下比 synchronized 轻量
- **缺点**：ABA 问题（值 A 变 B 又变回 A，CAS 误判未修改）→ `AtomicStampedReference` 带版本号解决；自旋消耗 CPU；只能保证单个变量原子

**面试高频题**：CAS 与 synchronized 怎么选？——竞争不激烈用 CAS（乐观），竞争激烈用 synchronized（避免自旋浪费 CPU）。

### 原子类：把 CAS 包好的工具箱

CAS 太底层，JDK 用 `java.util.concurrent.atomic` 包把它包装成开箱即用的原子类：

```java
AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet();          // 原子自增（count++ 的安全版）
count.getAndAdd(10);              // 原子加 10
count.compareAndSet(5, 10);       // CAS：期望 5 才改成 10

AtomicBoolean flag = new AtomicBoolean(false);
flag.compareAndSet(false, true);  // 一次性开关的经典写法

AtomicReference<User> ref = new AtomicReference<>();
ref.compareAndSet(oldUser, newUser);   // 对象引用原子替换
```

**家族成员**：

| 类 | 用途 |
|----|------|
| `AtomicInteger` / `AtomicLong` / `AtomicBoolean` | 基本类型原子操作（最常用） |
| `AtomicReference<V>` | 对象引用原子替换 |
| `AtomicStampedReference` | 带版本号，解决 ABA 问题 |
| `LongAdder` / `DoubleAdder` | **高并发计数优化版**（见下） |

**LongAdder 是什么场景**：`AtomicInteger` 在高并发下所有线程 CAS 抢同一个变量，自旋浪费 CPU。`LongAdder` 内部把值分散到多个单元格（类似分段的 ConcurrentHashMap 思路），各线程改自己的段，最后 `sum()` 汇总——**统计类场景（QPS、点赞数）优先 LongAdder**。

```java
// 统计接口调用次数：AtomicLong 改 LongAdder
LongAdder qpsCounter = new LongAdder();
qpsCounter.increment();       // 并发写入不打架
long total = qpsCounter.sum(); // 读时汇总（实时性略差）
```

## 线程池：必考 7 参数

`ThreadPoolExecutor` 的 7 个参数，面试必背：

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    2,                        // 1. corePoolSize：核心线程数（常驻）
    8,                        // 2. maximumPoolSize：最大线程数
    60L, TimeUnit.SECONDS,    // 3-4. 空闲存活时间：超过核心数时回收
    new LinkedBlockingQueue<>(100),  // 5. 工作队列：存等待任务
    Executors.defaultThreadFactory(), // 6. 线程工厂
    new ThreadPoolExecutor.AbortPolicy() // 7. 拒绝策略
);
```

**任务提交流程**（画图题，必考）：

```
提交任务
  ├─ 核心线程未满 → 创建核心线程执行
  ├─ 核心线程已满 → 放入工作队列
  ├─ 队列已满 → 创建非核心线程执行（最大线程数内）
  └─ 线程数达上限 → 执行拒绝策略
```

**四种拒绝策略**：
| 策略 | 行为 |
|------|------|
| `AbortPolicy`（默认） | 抛 `RejectedExecutionException` |
| `CallerRunsPolicy` | 提交任务的线程自己执行（降速） |
| `DiscardPolicy` | 静默丢弃 |
| `DiscardOldestPolicy` | 丢弃队列最老任务 |

**为什么不建议用 `Executors.newFixedThreadPool()`**：默认 `LinkedBlockingQueue` 无界，任务堆积可能 OOM。用 `ThreadPoolExecutor` 显式声明队列大小。

## JUC 工具类：线程间协作的四件套

`java.util.concurrent`（JUC）包里除了锁和线程池，还有一组"线程间协调"的工具类——解决"一个线程等另外几个线程干完活"这类问题。**JS 单线程永远遇不到这类问题**（`await Promise.all` 就完事），是 Java 并发的新知识区。

### CountDownLatch：倒计时门闩

初始化一个计数 N，线程调 `countDown()` 减 1，调 `await()` 的线程**等到计数归零才继续**：

```java
// 场景：主线程等 3 个子任务全部完成才汇总（类似 Promise.all）
CountDownLatch latch = new CountDownLatch(3);
for (int i = 0; i < 3; i++) {
    pool.execute(() -> {
        try { fetchData(); } finally { latch.countDown(); }   // 干完活减一
    });
}
latch.await();                    // 阻塞到这里，直到计数=0
aggregate();                      // 三个都完了，才汇总
```

**要点**：计数**一次性**，归零后不能重置。对应 JS 的 `Promise.all` 阻塞等待语义。

### CyclicBarrier：可循环的屏障

N 个线程互相等，**到齐了再一起放行**——和 Latch 的区别是**可重复用**：

```java
// 场景：4 个线程各自算一页，每轮都要等 4 页齐了才拼成完整报表
CyclicBarrier barrier = new CyclicBarrier(4, () -> assembleReport());  // 到齐后先干这个

for (int i = 0; i < 4; i++) {
    pool.execute(() -> {
        while (hasNextBatch()) {
            computePage();
            barrier.await();      // 等其他 3 个线程到齐，一起进入下一轮
        }
    });
}
```

| | CountDownLatch | CyclicBarrier |
|--|----------------|---------------|
| 等谁 | 一个/多个线程等 N 个事件 | N 个线程**互相**等到齐 |
| 计数 | 一次性，递减到 0 | 可循环，到齐后重置 |
| 典型场景 | 主线程等子任务（Promise.all） | 多线程分阶段同步（每轮对齐） |

### Semaphore：信号量（限流器）

只有 N 个"许可证"，`acquire()` 拿不到就阻塞——**控制同时访问某资源的线程数**：

```java
// 场景：数据库连接池只有 10 个连接，最多 10 个线程同时查库
Semaphore permits = new Semaphore(10);
permits.acquire();          // 拿许可证（拿不到就等）
try { queryDatabase(); }
finally { permits.release(); }   // 必须还！
```

限流算法里的"计数信号量"就是它。**注意 finally release**，否则泄漏。

### 面试题速查（JUC）

| 问题 | 一句话答案 |
|------|-----------|
| CountDownLatch 和 CyclicBarrier 区别 | Latch 一次性倒计时（一等多）；Barrier 可循环（多等互等到齐） |
| Semaphore 干什么用 | 控制并发访问数量的信号量，acquire/release 成对出现 |
| 为什么 finally 里 release/ countDown | 异常路径也要归还，否则其他线程永远等不到 |

## CompletableFuture：对应 JS Promise

```java
// JS: await fetch(...).then(r => r.json())
CompletableFuture.supplyAsync(() -> fetchData())      // 异步执行（用 ForkJoinPool）
    .thenApply(data -> process(data))                  // 对应 .then
    .exceptionally(ex -> fallback(ex))                 // 对应 .catch
    .join();                                           // 对应 await（阻塞等待）
```

多个任务并行（对应 `Promise.all`）：

```java
CompletableFuture.allOf(f1, f2, f3).join();
```

**JDK 21+ 虚拟线程**：`Thread.ofVirtual().start(() -> ...)`——轻量级线程，百万级线程成为可能，是应对"一请求一线程"高并发的新方案，面试加分项。

## 并发容器：线程安全的集合

普通集合（`ArrayList`/`HashMap`）多线程同时改会数据错乱甚至死循环（见《Java 集合》1.7 扩容环链）。JUC 提供了一批线程安全容器，**按读多写少/读写都多选**：

| 容器 | 适用场景 | 原理 |
|------|---------|------|
| `ConcurrentHashMap` | 并发 KV 存储（最常用） | CAS + synchronized 锁桶头 |
| `CopyOnWriteArrayList` | **读多写极少**（配置列表、监听器列表） | 写时复制整个数组，读不加锁 |
| `ConcurrentLinkedQueue` | 高并发非阻塞队列 | CAS 链表 |
| `BlockingQueue` 家族 | 生产者-消费者（线程池工作队列） | 有界 + 阻塞 put/take |
| `ConcurrentSkipListMap` | 并发有序 KV（跳表实现） | 无锁读 + CAS 写 |

```java
// CopyOnWriteArrayList：监听器列表的经典用法
CopyOnWriteArrayList<Listener> listeners = new CopyOnWriteArrayList<>();
listeners.forEach(Listener::onEvent);      // 遍历不加锁，绝不 ConcurrentModificationException
listeners.add(newListener);                // 写时复制底层数组（写慢读飞快）

// BlockingQueue：生产者-消费者
BlockingQueue<Task> queue = new ArrayBlockingQueue<>(100);   // 有界！
queue.put(task);        // 队列满则阻塞（生产者让速）
Task t = queue.take();  // 队列空则阻塞（消费者等待）
```

**选型一句话**：读写都多 → `ConcurrentHashMap`；读多写极少 → `CopyOnWriteArrayList`；要阻塞语义的队列 → `BlockingQueue`。

## ThreadLocal：每个线程的独立储物柜

`ThreadLocal` 给**每个线程**一份独立的变量副本——线程 A set 的值，线程 B 看不到，互不干扰：

```java
private static final ThreadLocal<SimpleDateFormat> dateFormat =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

// 每个线程拿到的是自己的 SimpleDateFormat 实例
dateFormat.get().format(new Date());       // 线程安全（因为不共享）
```

### 三大使用场景

| 场景 | 例子 |
|------|------|
| **线程不安全的工具类加锁替代** | `SimpleDateFormat` 是线程不安全的，与其加锁不如每人一份 |
| 跨层传参（避免层层传参） | 用户登录信息塞 ThreadLocal，Controller/Service/DAO 直接取 |
| 事务/上下文传递 | Spring 的事务连接、`SecurityContextHolder` 的登录态，底层都是 ThreadLocal |

Spring 里 `SecurityContextHolder.getContext().getAuthentication()` 拿当前登录用户，底层就是 ThreadLocal——你在 mall 的 Controller 里 `Principal principal` 参数，也是框架提前从 ThreadLocal 取好塞进来的。

### ⚠️ 内存泄漏：用完必须 remove

线程池的线程是**复用**的！线程 A 处理完请求回到池里，ThreadLocal 里的值还在。如果值是 request/response 这种大对象，就泄漏了：

```java
// ✅ 铁律：finally 里清理
try {
    userContext.set(currentUser);
    doBusiness();
} finally {
    userContext.remove();      // 必须！线程复用场景下不清 = 内存泄漏 + 数据串号
}
```

**数据串号**是比泄漏更隐蔽的坑：线程 A 的值残留，线程 B 复用时读到了 A 的用户信息。**Web 项目的过滤器/拦截器里 set 了 ThreadLocal，filter 出口必须 remove**。

## 死锁专题

死锁的四个**必要条件**（面试必背）：**互斥**（资源独占）、**持有并等待**（拿着 A 等 B 不放）、**不可剥夺**（不能强行抢走）、**循环等待**（A→B→C→A 成环）。四个同时满足才死锁——**破掉任意一个就能预防**：

```java
// 经典死锁：线程 1 锁 A 等 B，线程 2 锁 B 等 A
synchronized (lockA) {          // 线程 1
    synchronized (lockB) { }
}
synchronized (lockB) {          // 线程 2
    synchronized (lockA) { }
}
```

**预防四招**（对应破四个条件）：

| 招数 | 做法 |
|------|------|
| 固定加锁顺序（最实用） | 全局规定：先锁 A 再锁 B，所有人都按这个顺序 → 破循环等待 |
| 限时获取 | `tryLock(3, TimeUnit.SECONDS)` 拿不到就放弃回退 → 破持有并等待 |
| 一次性拿全 | 开始就把所有要用的锁拿到手，没有就都不拿 |
| 死锁检测 | `jstack <pid>` 找 `BLOCKED` 成环的线程（线上排查必会） |

```bash
# 线上死锁排查（详见《线上问题排查》）
jstack 12345 | grep -A 20 "deadlock"     # JVM 直接报告死锁
jstack 12345 | grep BLOCKED              # 找互相等待的线程栈
```

## 面试题速查

| 问题 | 一句话答案 |
|------|-----------|
| volatile 能保证原子性吗 | 不能，只保证可见性和有序性 |
| synchronized 和 ReentrantLock 区别 | 自动/手动释放、可中断、公平锁、底层不同 |
| 锁升级过程 | 无锁 → 偏向锁 → 轻量级锁（自旋）→ 重量级锁（阻塞） |
| CAS 的缺点 | ABA、自旋耗 CPU、只能单变量 |
| 线程池为什么用有界队列 | 无界队列任务堆积可能 OOM |
| 线程池拒绝策略 | Abort / CallerRuns / Discard / DiscardOldest |
| 死锁的四个条件 | 互斥、持有并等待、不可剥夺、循环等待 |
| ThreadLocal 是什么 | 每个线程独立的变量副本，用完必须 remove（防内存泄漏） |
| 线程池线程复用 + ThreadLocal 不 remove 会怎样 | 内存泄漏 + 数据串号（下一个请求读到上一个用户） |
| LongAdder 和 AtomicInteger 怎么选 | 高并发统计场景用 LongAdder（分段计数），单点操作用 Atomic |
| CountDownLatch 和 CyclicBarrier 区别 | Latch 一次性倒计时（一等多）；Barrier 可循环（多线程互等到齐） |
| CopyOnWriteArrayList 适合什么场景 | 读多写极少（监听器/配置列表），写时复制，读不加锁 |
| 并发 KV 存储用什么 | ConcurrentHashMap（CAS + synchronized 锁桶头） |
| 怎么预防死锁 | 固定加锁顺序、tryLock 超时、一次性拿全锁 |
| 线上死锁怎么查 | `jstack <pid>`，看 deadlock 报告或 BLOCKED 成环线程 |

## 延伸阅读

- [JVM 入门](/service/java/java-jvm) - 内存分区与 GC（并发与 JVM 是 Java 面试两大护城河）
- [Java 集合源码](/service/java/java-collections) - ConcurrentHashMap 等线程安全容器
- [Java 入门（JS 开发者视角）](/service/java/java-basics) - 语言基础
- [Java 语言进阶](/service/java/java-language-advanced) - 泛型/反射/注解/新特性
- [Java IO/NIO 与序列化](/service/java/java-io) - 阻塞 vs 非阻塞的 IO 模型
- [Netty 入门](/service/java/java-netty) - NIO 的工程封装
- [线上问题排查](/service/troubleshooting) - jstack 实战

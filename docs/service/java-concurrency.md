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

## 延伸阅读

- [JVM 入门](/service/java-jvm) - 内存分区与 GC（并发与 JVM 是 Java 面试两大护城河）
- [Java 集合源码](/service/java-collections) - ConcurrentHashMap 等线程安全容器
- [Java 入门（JS 开发者视角）](/service/java-basics) - 语言基础

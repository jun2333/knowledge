# 并发锁应用：每个场景的锁怎么选

> **优先级：P1** — "并发"在单体调试时永远看不见，只有压测/真实流量下才现形。本文不讲锁的底层原理，讲**应用**：什么场景用什么锁，每个场景给能跑的代码。

## 一、为什么需要锁（先建立判断）

"一个请求一个线程"意味着**多个线程天然同时跑**——一旦两个线程交错到"同一份共享数据"上就出问题：

```
库存 = 100
线程A：读 100 → 减1 → 想写 99
线程B：读 100 → 减1 → 想写 99   ← 读到 A 写之前的 100
结果：卖了 2 件只减 1 → 超卖（竞态条件）
```

**需要锁的三个条件（缺一不可）**：

```
共享数据 + 可变 + 并发写 → 需要锁
只读共享 / 各写各的      → 不需要锁
```

**锁在哪用，取决于共享数据在哪**：

| 共享数据在哪 | 用哪层锁 |
|-------------|---------|
| JVM 内存（单实例内） | JVM 锁（synchronized/Lock/并发容器） |
| 数据库行 | DB 行锁 / 乐观锁 |
| 跨多个 JVM（集群） | 分布式锁（Redis） |

---

## 二、场景 1：JVM 内共享内存（单实例）

**场景**：单实例内多个线程改同一块内存数据（计数器、缓存、本地状态）。

### 方案 A：Atomic*（单值计数）

```java
// 业务场景：单实例的"今日访问量"内存计数，多个请求线程并发 +1
// ❌ 错误：count++ 不是原子的（读-加-写三步，两个线程交错会丢一次更新）
private int visitCount;
public void onVisit() { visitCount++; }          // 并发下可能只 +1 一次

// ✅ AtomicInteger：CAS 保证 +1 原子（单值计数用它）
private final AtomicInteger visitCount = new AtomicInteger();
public void onVisit() { visitCount.incrementAndGet(); }   // 线程安全
public int todayVisits() { return visitCount.get(); }
```

### 方案 B：synchronized + 双检锁（缓存回填）

```java
// 业务场景：单实例缓存"热门商品列表"（第一次查到后放内存）
// 问题：多个请求同时首次访问 → 都发现缓存空 → 都去查 DB（重复查库 / 缓存击穿）
// synchronized 双检锁：只让第一个线程查 DB 回填，其他线程等它填好直接读缓存
private volatile List<Product> hotProducts;      // 缓存（volatile 保证其他线程可见）
private final Object cacheLock = new Object();

public List<Product> getHotProducts() {
    if (hotProducts != null) return hotProducts;     // ① 快路径：缓存有，无锁直接返回
    synchronized (cacheLock) {                        // ② 慢路径：只有一个线程能进来
        if (hotProducts == null) {                    // ③ 双检：进来再查一次（可能已被填）
            hotProducts = productDao.selectHotProducts();   // 真正查 DB 的只有第一个线程
        }
        return hotProducts;
    }
}
```

> **为什么双检**：第二个等待的线程拿到锁后，缓存可能已被第一个线程填好——不重复查 DB。synchronized 适合"读-查-写"多步操作整体保护。

### 方案 C：ReentrantLock + tryLock（带超时快速失败）

```java
// 业务场景：单实例限量发优惠券（内存计数 + 已领名单），并发抢券（支持退券回补剩余量）
// 需求：抢不到时"等 100ms 就放弃"，别无限阻塞用户请求（synchronized 会一直等）
private final ReentrantLock lock = new ReentrantLock();
private int couponLeft = 100;                                    // 剩余量（可回退状态：退券会回升）
private final Set<Long> claimed = ConcurrentHashMap.newKeySet(); // 已领用户（单调状态：只增不减，且并发读安全）

public boolean tryClaim(Long userId) {
    // ① 锁外预检：只对"单调状态"做（claimed 只增不减，判断确定，不会误杀）
    if (claimed.contains(userId)) return false;                  // 已领过 → 一定不能领，可放心挡

    boolean acquired;
    try {
        acquired = lock.tryLock(100, TimeUnit.MILLISECONDS);     // 抢不到锁就放弃
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return false;
    }
    if (!acquired) return false;                                 // "太拥挤，请重试"
    try {
        // ② couponLeft 是可回退状态（有人退券会回升）→ 不能锁外预检（会误杀能领的人），锁内拿最新值判断
        if (couponLeft <= 0) return false;                       // 这一刻真的没货
        couponLeft--;
        claimed.add(userId);
        return true;                                             // 领取成功
    } finally {
        lock.unlock();
    }
}
```

> **预检可靠性原则**：只有"**单调状态**"（只增/只减、不会回退）才能安全地做锁外预检——claimed/幂等标记一旦 true 永远 true，不会误杀；"**可回退状态**"（库存扣了可退、剩余量会回升）的判断必须放锁内拿最新值，锁外预检会误杀（挡掉本可领取的人，只是省了锁却误伤用户）。秒杀场景常见组合就是：**"是否已抢"（单调，可预检）+ "还有没有货"（可回退，锁内判）**。

> **对比 synchronized**：synchronized 拿不到锁会**无限阻塞**（请求可能卡住）；`tryLock(超时)` 拿不到就返回，适合"宁可快速失败提示重试，也别让用户干等"的抢购场景。

### 方案 D：ConcurrentHashMap（并发 Map）

```java
// 业务场景：单实例内存"在线用户"（userId → 最近活跃时间）
// HashMap 并发 put 会丢数据甚至死循环 → 用 ConcurrentHashMap（内部细粒度锁）
private final Map<Long, Long> onlineUsers = new ConcurrentHashMap<>();
public void heartbeat(Long userId) { onlineUsers.put(userId, System.currentTimeMillis()); }
public Long lastActive(Long userId) { return onlineUsers.get(userId); }
```

**选择口诀**：单值计数用 `Atomic*`；"读-查-写"多步保护用 `synchronized`（双检锁最典型）；要超时/快速失败用 `Lock.tryLock`；并发 Map 用 `ConcurrentHashMap`。

> **边界**：单实例有效。如果部署了两个实例，JVM 锁就管不住了（每个 JVM 一把锁）——见场景 3。

---

## 三、场景 2：数据库行（单体/集群都有效）

**场景**：扣库存、减余额、订单状态流转——共享数据在 DB 行。**优先用 DB 层锁，别用 Java 锁**（DB 层天然跨实例）。

**先分两大阵营**（判断依据 = 加不加锁）：

```
悲观阵营：先加锁、阻塞别人（假设会冲突）
  └─ FOR UPDATE（方案 C）—— 冲突极频繁 / 需整段强一致才用

乐观阵营：不加锁、假设能成功、失败靠返回 0 检测
  ├─ 条件型（方案 A：原子 SQL / CAS）—— 不读快照，SQL 条件自判，一次闭环
  └─ 版本型（方案 B：version / 时间戳）—— 先读快照，带旧值写，冲突重试
```

**记忆**：乐观/悲观的分界是"**加不加锁、阻不阻塞**"；乐观阵营内部按"要不要先读快照"再分条件型/版本型——教材常把"版本型"特指叫乐观锁，导致"原子 SQL 算不算乐观锁"的口径混乱，其实**它们都是乐观阵营**。

### 乐观阵营 · 条件型：原子 SQL（不读快照，一条闭环）

```java
// ❌ 错：查出来再算再写（读-改-写中间被插队）
Product p = productMapper.selectById(id);
p.setStock(p.getStock() - 1);
productMapper.updateById(p);          // 覆盖式更新，丢失更新

// ✅ 对：一条 SQL 原子减（数据库行锁保证不被打断）
@Update("UPDATE pms_product SET stock = stock - 1 WHERE id = #{id} AND stock > 0")
int deductStock(Long id);             // 返回 0 = 没库存，减失败了
```

**为什么对**：`UPDATE ... SET stock=stock-1` 是**单语句原子操作**（DB 内部对行加锁，执行完释放），天然防超卖。这是**扣库存的首选**。

### 乐观阵营 · 版本型：乐观锁（先读快照，冲突重试）

**本质**：更新时 SQL 的 `WHERE` 带"**期望的旧值**"——不匹配 = 被别的线程改过了 → 更新返回 0 → 冲突处理（重试/提示）。version 只是最常见的实现，下面都是同一思想。

**实现 1：version 字段（最常见）**

```java
// 表加 version 字段，update 时带上并判断 version
@Update("UPDATE pms_product SET stock = #{stock}, version = version + 1 " +
        "WHERE id = #{id} AND version = #{version}")   // ← 版本号对不上 = 别人改过了
int updateWithVersion(Product p);   // 返回 0 = 冲突，重试或提示

// 使用：读 → 业务处理 → 带 version 写 → 冲突则重试
Product p = productMapper.selectById(id);   // version = 3
p.setStock(p.getStock() - 1);
int rows = productMapper.updateWithVersion(p);   // WHERE version = 3
if (rows == 0) {
    // 别人改过了 → 重新读再试（乐观：冲突少才高效）
}
```

**实现 2：CAS 条件式（扣库存最常用，不查旧值直接条件扣）**

```java
// 不先读"当前库存"，SQL 里直接条件判断够不够——WHERE 条件本身就是乐观校验
@Update("UPDATE pms_product SET stock = stock - #{count} " +
        "WHERE id = #{id} AND stock >= #{count}")    // ← 库存不足则不更新（返回 0）
int deductStock(Long id, Integer count);   // 返回 0 = 库存不足
```

**实现 3：时间戳（类似 version，用最后修改时间）**

```java
@Update("UPDATE pms_product SET name = #{name}, update_time = NOW() " +
        "WHERE id = #{id} AND update_time = #{oldUpdateTime}")   // 时间对不上 = 别人改过
int updateWithTime(Product p);
```

**实现 4：状态机校验（防重复流转，如防重复支付）**

```java
// 只允许"待支付 → 已支付"：WHERE 带旧状态 = 校验期望状态
@Update("UPDATE oms_order SET status = '已支付' " +
        "WHERE id = #{id} AND status = '待支付'")    // 返回 0 = 已被改过（可能已支付/已取消）
int markPaid(Long orderId);
```

**实现 5：唯一约束（防重复插入）**

```java
// 表加唯一索引 (user_id, coupon_id)，重复 insert 报唯一键冲突
// 捕获 DuplicateKeyException → 提示"已领取过"
try { couponMapper.insert(...); }
catch (DuplicateKeyException e) { return "已领取过"; }
```

**MyBatis-Plus 自动化 version**：实体字段加 `@Version` + 开启乐观锁插件后，插件自动在 update 拼 version 条件，不用手写 `WHERE version`。

**适用**：读多写少、冲突概率低（如改订单备注）。冲突频繁就选悲观锁/原子 SQL。

### 悲观阵营 · 悲观锁（SELECT ... FOR UPDATE，加锁阻塞）

```java
// 先锁行，再读改写（锁住期间别人动不了这行）
@Select("SELECT * FROM pms_product WHERE id = #{id} FOR UPDATE")   // 对行加锁
Product selectForUpdate(Long id);

// 事务内：锁行 → 检查 → 扣减（整个过程别人排队）
@Transactional
public void deduct(Long id) {
    Product p = productMapper.selectForUpdate(id);   // 锁住该行
    if (p.getStock() <= 0) throw new RuntimeException("无库存");
    p.setStock(p.getStock() - 1);
    productMapper.updateById(p);                      // 释放锁（事务提交时）
}
```

**适用**：冲突频繁（秒杀场景）、后续有多步读改写需要整段保护。

### DB 层怎么选（按阵营和形态）

```
乐观·条件型：能写成条件式的（扣库存 stock>=1）→ 一条原子 SQL，最优先
乐观·版本型：只能"改具体值"（改备注）、冲突少     → version/时间戳乐观锁
悲观阵营：   冲突极频繁 / 多步读改写要整段保护      → FOR UPDATE（事务内）
```

> **排序原则**：能条件式一条别啰嗦（乐观条件型）→ 只能改旧值就乐观版本型 → 前两者搞不定（冲突太密/要整段锁）才上悲观。**多数业务乐观阵营就够了，悲观留最后**。

---

## 四、场景 3：分布式锁（多实例 / 集群）

**场景**：应用部署了多个实例（负载均衡后面 N 台），JVM 锁和普通 DB 更新都管不住的场景：

```
多个实例的定时任务都要执行 → 只需一个实例执行（重复执行会重复扣/重复发）
防重复提交（同一请求打到不同实例）
跨实例的库存预占、活动限量
```

### Redis 分布式锁（最常用）

```java
// 用 Redisson（推荐，封装了看门狗续期、可重入）
@Autowired
private RedissonClient redisson;

public void tryLock(String lockKey, Runnable task) {
    RLock lock = redisson.getLock(lockKey);     // 锁 key 要所有实例共享（同一 Redis）
    try {
        boolean acquired = lock.tryLock(3, 10, TimeUnit.SECONDS);   // 等 3s，持有 10s
        if (!acquired) { throw new RuntimeException("操作太频繁，请稍后"); }
        task.run();
    } finally {
        if (lock.isHeldByCurrentThread()) lock.unlock();
    }
}

// 使用：秒杀 / 防重复提交
String lockKey = "seckill:product:" + productId;    // 锁粒度：按资源 id
tryLock(lockKey, () -> {
    int rows = productMapper.deductStock(productId);   // 加锁后原子扣
    if (rows == 0) throw new RuntimeException("已抢光");
});
```

**Redisson 的过期机制：TTL 兜底 + 看门狗续期**（"必须过期防死锁"对 Redisson 也成立）：

```java
lock.lock();                            // ① 不传 leaseTime → 默认 30 秒 + 看门狗续期
lock.lock(5, TimeUnit.SECONDS);         // ② 显式 leaseTime → 固定 5 秒（此时不用看门狗）
```

```
两层机制，各管一件事：
① 看门狗（watchdog）—— 解决"业务跑得久，锁别提前过期"
   默认 TTL 30s，每 10s 检查：业务还在跑 → 自动续期到 30s；unlock → 停看门狗
   看门狗线程跑在"持锁的 JVM 里"

② TTL 过期兜底 —— 解决"持锁者宕机，锁别永久不释放"
   持锁 JVM 宕机 → 看门狗（在它 JVM 里）也死了 → 没人续期
   → 剩余 TTL（最多 30s）走完 → Redis 自动删锁 → 其他实例才能抢到

结论：正常运行时靠看门狗续（锁不提前丢）；持有者宕机靠 TTL 兜底（不死锁）
     所以"分布式锁必须有过期时间"永远成立——Redisson 默认 30s 就是那个兜底
```

> 注意：显式传了 `leaseTime`（如 `lock(5s)`）就**关掉看门狗**——业务跑超过 5 秒锁会提前释放被别的实例抢走，所以一般别传太短，用默认让看门狗管。

**不用 Redisson 手写的话（SETNX 原理——重点看 value 的作用）**：

```java
// 加锁时 value 必须存"持有者唯一标识"（UUID）——没有它无法分辨锁是谁的
String requestId = UUID.randomUUID().toString();   // 所有权凭证：这把锁"是我"的

// ① 加锁：SET key value NX EX
//    NX = 不存在才设置成功（抢锁）；EX 10 = 10 秒过期（防持锁者宕机变死锁）
String lockKey = "seckill:product:" + productId;   // 锁 key（加锁/释放用同一个）
Boolean ok = redisTemplate.opsForValue().setIfAbsent(
        lockKey, requestId, 10, TimeUnit.SECONDS);
if (Boolean.TRUE.equals(ok)) {
    try {
        // 拿到锁：只有拿到锁的实例能进这里（多实例互斥）
        productMapper.deductStock(productId);
    } finally {
        // ② 释放：Lua 脚本"比对 value 是自己的才删"（原子，两步合成一步）
        String lua = "if redis.call('get', KEYS[1]) == ARGV[1] " +
                     "then return redis.call('del', KEYS[1]) else return 0 end";

        // 执行 Lua：Spring Data Redis 用 DefaultRedisScript + redisTemplate.execute
        DefaultRedisScript<Long> unlockScript = new DefaultRedisScript<>();
        unlockScript.setScriptText(lua);           // 脚本内容
        unlockScript.setResultType(Long.class);    // 返回类型（删成功 1 / 不是我的 0）

        Long result = redisTemplate.execute(
                unlockScript,                        // ① 脚本对象
                Collections.singletonList(lockKey),  // ② KEYS[1] ← 这里（锁 key）
                requestId);                          // ③ ARGV[1] ← 这里（我的持有者标识）
        // result == 1 → 删成功；result == 0 → value 不是我的，没删（说明锁已被别人接管）
    }
}
```

**value 存了什么 & 为什么必须有**：

```bash
# Redis 里的存储形态：
"seckill:product:1" → "550e8400-e29b-41d4-a716-446655440000"   # 锁key → 持有者UUID
# key = 锁什么资源；value = 锁是谁的凭证

# 没有 value 校验会出的事故：
# A 拿锁 → A 执行超时 → 锁 10s 自动过期 → B 抢到锁
# A 终于释放 → 直接 DEL key → 把 B 的锁删了 → C 又能抢 → 两个实例同时执行 → 互斥失效
# 所以释放必须 Lua 比对 value：不是"我设的"就不删（不误删 B 的锁）
```

> 手写有三个坑：**无续期会提前过期**（Redisson 看门狗自动续）、**释放要校验持有者**（上面 Lua）、**可重入要自己实现**（Redisson 用 hash 计数）——所以生产直接用 Redisson。

**要点**：
- 锁 key 要**所有实例共享**（同一 Redis），才能互相排斥
- 必须设**过期时间**（防持锁实例宕机 → 死锁）
- 释放要**校验持有者**（防误删别人的锁）
- 锁粒度尽量细：按 `资源id` 锁（`seckill:product:1`），别锁整表

---

## 五、场景选择总表（先对号入座）

| 场景 | 共享数据位置 | 用什么 | 例子 |
|------|------------|--------|------|
| 单实例内存计数/缓存 | JVM 内 | Atomic / synchronized / ConcurrentHashMap | 本地统计、单机限流 |
| 扣库存/减余额 | DB 行 | **原子 SQL**（`stock=stock-1`） | 下单扣库存 |
| 先读后写、冲突少 | DB 行 | **乐观锁**（version） | 改订单、防覆盖 |
| 冲突多、要整段保护 | DB 行 | **悲观锁**（FOR UPDATE） | 秒杀扣减 |
| 定时任务多实例只跑一个 | 跨实例 | **分布式锁**（Redis） | 每天 0 点对账 |
| 防重复提交 | 跨实例 | **分布式锁** | 重复支付、重复领券 |
| 集群扣库存 | DB 行 | 原子 SQL（DB 行锁天然跨实例）| 集群下单 |

**最关键的一条**：**能用 DB 原子/行锁解决的，别上分布式锁**——DB 行锁是免费的跨实例保护；分布式锁是"DB 解决不了"（如定时任务、防重复）才用。

## 六、最佳实践清单

| 实践 | 说明 |
|------|------|
| 优先原子 SQL | `UPDATE stock=stock-1` 能解决的，别整锁 |
| 锁粒度细 | 锁 `product:1`，别锁"全部商品" |
| 锁内少做事 | 临界区越短越好（只包必要代码） |
| 分布式锁必须过期 | 防持锁者宕机变死锁 |
| 释放校验持有者 | 防误删别人的锁 |
| 乐观锁冲突要处理 | 返回 0 要重试/提示，别忽略 |
| 别在锁里调外部慢服务 | 会拖长持锁时间 |

## 七、mall 里没锁（为什么 + 你要学在哪用）

mall 学习项目**基本没写锁**（数据量小、无并发压测场景）。但你会"用锁"的判断力来自：

```
库存类接口 → 若做秒杀：原子 SQL / 悲观锁
下单防重复 → 分布式锁（key=用户+订单号）
定时任务   → 分布式锁（key=任务名，多实例只跑一个）
```

**锁不是 mall 里能看到的代码，是"并发量上来后"要自己加的保护**——先会判断场景，用到时再选对锁。

## 相关

- [Java 并发编程](/service/java-concurrency) - 锁的底层（synchronized/volatile/AQS）
- [Redis 入门](/service/redis-intro) - 分布式锁的载体
- [分布式基础](/service/distributed-basics) - 集群下的并发问题
- [Java（Spring Boot）高并发与高可用设计](/service/java-high-concurrency) - 架构层视角

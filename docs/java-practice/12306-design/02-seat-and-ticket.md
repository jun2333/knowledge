# 12306 余票与选座（Hash 矩阵 + 令牌桶）

> **定位**：全项目最硬的一块。面试问"怎么防超卖、怎么扛瞬时高并发"，能讲清"余票 Hash 矩阵 + Lua 批量扣区间 + DB 行锁落座"这条真实链路，就足够撑 10 分钟。
>
> **代码位置**：`services/ticket-service`（`TicketAvailabilityTokenBucket`、`SeatServiceImpl`、`TicketServiceImpl`、`handler/ticket/base`）
>
> ⚠️ **重要**：这一篇刻意区分了「代码里真实跑的」和「代码里存在但没接入的」。网上讲这个项目的文章经常混着讲，面试被追问"写在哪个 key"就穿帮。读源码时要自己确认调用链。

## 一、问题本质：这不是普通的"库存 -1"

电商扣库存是 `stock = stock - 1`，一行数据。火车票不是：

```
G1 次：北京南 → 上海虹桥，途经 8 个站
余票不是"一个数"，而是「任意上车站 × 任意下车站」的组合
北京南→济南 和 济南→上海 共用同一批座位，但能卖给不同的人
```

两个独立问题：

1. **区间余票**：某个 OD 组合还剩几张 → 决定"能不能下单"
2. **具体座位**：这一张票坐哪个车厢、哪一排 → 决定"卖给谁、别卖重"

## 二、余票存在哪：Redis Hash（不是单个计数器）

```java
// RedisKeyConstant
TRAIN_STATION_REMAINING_TICKET = "index12306-ticket-service:train_station_remaining_ticket:{trainId}_{start}_{end}";
// field = 座位类型（商务/一等/二等），value = 余量
```

**一个 OD 组合一个 key，座位类型当 field**：

```
HGETALL train_station_remaining_ticket:G1_北京南_上海虹桥
  → { "1": 20, "2": 60, "3": 300 }     // 商务 20、一等 60、二等 300
```

**为什么不用 String 存一个总数**：一次查询要拿"这个 OD 下所有座位类型的余量"（前端要显示"二等座有票/商务座无票"），Hash 一次 `HGETALL` 或按需 `HMGET` 就够；多类型各自独立扣减，也不会互相覆盖。

**批量查询用 pipeline**（`TicketServiceImpl` 里一次查多个 OD）：N 个区间就是 N 次网络往返，pipeline 把它们打包成一次——**这是"多个独立 key 无法用 MGET 时的标准优化"**。

## 三、下单扣减：令牌桶是一个"区间 × 座位类型"的矩阵

余票 Hash 是给人看的（查询），**真正防超卖的是令牌桶**：

```java
TICKET_AVAILABILITY_TOKEN_BUCKET = "index12306-ticket-service:ticket_availability_token_bucket:";
// key  = 上面前缀 + trainId
// field = "始发站_到达站_座位类型"
// value = 该区间该座位类型的可售数量
```

**一个车次的所有区间放在同一个 Hash 里**，所以它能一次性原子地扣减"这次购票影响到的所有区间"。

### 初始化：懒加载 + 分布式锁防击穿

```java
// TicketAvailabilityTokenBucket.takeTokenFromBucket（简化）
if (!hasKey(tokenBucketHashKey)) {
    RLock lock = redissonClient.getLock("...lock:ticket_availability_token_bucket:" + trainId);
    if (!lock.tryLock()) throw new ServiceException("购票异常，请稍候再试");
    try {
        if (!hasKeyAgain) {                       // 双重检查，防并发重复初始化
            for (RouteDTO route : 所有途经区间)    // 北京南→济南、北京南→上海、济南→上海…
                for (座位类型) map.put("始发_到达_类型", 查DB得到的数量);
            redis.opsForHash().putAll(key, map);
        }
    } finally { lock.unlock(); }
}
```

**这个模式值得记住**：`判断 → 加锁 → 再判断 → 加载 → 释放`，就是**缓存击穿的互斥锁解法**的落地版。`tryLock()` 不加等待时间，抢不到直接返回"稍候再试"，避免请求堆积。

### 领令牌：Lua 一次扣多个区间

```java
// KEYS = [令牌桶key, "出发站_到达站"]
// ARGV = [每种座位要几张(JSON), 该单途经的全部区间(JSON)]
String result = redis.execute(luaScript, keys, seatTypeCountJson, takeoutRouteListJson);
```

**为什么必须 Lua**：

- 一次购票跨 N 个区间（北京南→上海，途经的每个小区间都要扣）
- 要扣 M 种座位类型
- **"检查每个区间都够 + 全部扣减"必须原子**，否则并发下互相插队 → 超卖

**返回 `tokenIsNull=true` 就是"某个区间余量不足"**——注意是"某个"，不是"全程"。所以失败提示要能定位到具体区间，这也是产品上"分段放票"的由来。

### 回滚：`rollbackInBucket` / `delTokenInBucket`

```
下单成功但支付超时 → 关单 → rollbackInBucket（加回去）
订单彻底完成/退款    → 按业务规则处理
```

**漏了回滚就是"票凭空消失"**——这是这类系统最典型的事故，必须有对账兜底。

## 四、座位怎么落：DB 行锁，不是 Redis BitMap

**这是最容易讲错的地方。** 项目里座位状态的真实存储是 MySQL：

```java
// SeatServiceImpl
// 查可用座位：按 OD 段 + seat_status = 0
select ... from t_seat where train_id=? and ... and seat_status = 0;

// 锁座 / 解锁：直接 UPDATE
update t_seat set seat_status = 1 where ...;   // 占用
update t_seat set seat_status = 0 where ...;   // 关单释放
```

**为什么座位放 DB 而不是 Redis**：

| | DB（当前实现） | Redis BitMap（看起来更快的方案） |
|--|---------------|------------------------------|
| 座位是"业务实体" | 有 id、车厢、排号、座位号，要能被订单引用、能查、能审计 | 位图只存 0/1，业务字段还得另存一份 |
| 一致性 | 与订单同库同事务（或同库不同表），状态可追溯 | 要额外维护写入链路（谁改、什么时候改、漏了怎么办） |
| 写入成本 | 单行 UPDATE，按主键定位 | 要保证每个写入路径都 `SETBIT`，漏一处就是超卖 |
| 量级 | 单车次座位数有限（几百~上千），按区间过滤后更少 | 优势在"百万级 key 的判存"，不是"单行状态" |

**结论（面试可以讲这个判断）**：BitMap 适合"海量 ID 的存在性判断"（布隆过滤器、签到、活跃用户），不适合"承载业务实体的状态"。**选数据结构要看语义，不是看谁快。**

## 五、缓存怎么和 DB 保持一致：三条路并存

| 路径 | 触发 | 干什么 |
|------|------|--------|
| **XxlJob 全量初始化** | `TrainStationRemainingTicketJobHandler` | 按车次类型把座位数写进余票 Hash（`putAll`） |
| **懒加载** | `SeatMarginCacheLoader.load` | 缓存缺失时用 Redisson 锁 + `count(seat_status=0)` 回源，防止击穿 |
| **Canal binlog** | `CanalCommonSyncBinlogConsumer` → `TicketAvailabilityCacheUpdateHandler` | 监听 DB 变更，对余票 Hash 做 `increment`（+1/−1） |

**Canal 路径默认是关的**：开关 `ticket.availability.cache-update.type=binlog`，配置里默认空 → 走"业务代码直接更新"。这个设计很务实——**binlog 一致性更好，但延迟和排查成本更高，先用直更，需要时再切**。

**三件套的分工**：Job 保证"冷启动有数据"，懒加载保证"漏了能自愈"，Canal 保证"变更不漏"。**任何一层单独存在都不够。**

## 六、BitMap 选座：代码里的"设计原型"

项目里确实有一套 BitMap 判座的代码，但**没接入主链路**（`BitMapCheckSeat.checkSeat` 在仓库里没有调用方，是预留/遗留代码）。**知道它怎么设计，面试可以当加分项讲；但别说成"我们线上就是这么做的"。**

```java
// RedisKeyConstant
TRAIN_CARRIAGE_SEAT_STATUS = "...:train_carriage_seat_status:";

// 位布局：偏移 = 列号 i + 排号 j × 每排座位数
// 商务 3 座/排、一等 4 座/排、二等 5 座/排，各 18 排左右
GETBIT key (i + j*5)      → 1 = 已占，0 = 可售
```

**按车厢类型分实现的抽象工厂**：

```java
BitMapCheckSeatStatusFactory.getInstance(mark)
   TRAIN_BUSINESS → TrainBusinessCheckSeat   // stride 3
   TRAIN_FIRST    → TrainFirstCheckSeat      // stride 4
   TRAIN_SECOND   → TrainSecondCheckSeat     // stride 5
```

**`checkSeat` 的语义**（这段逻辑本身值得学）：

```
convert = { 座位列号 → 需要几张 }      // ChooseSeatUtil.convert 把 ["1A","1C"] 转成 {A:1, C:1}

对每个"列号 → 需求 n"：
    在这一列的 18 排里数 1 的个数
    凑够 n → 这一项满足
所有项都满足 → true
```

两个设计点：

- **只做"存在性判断"，不占座**——判断无副作用、可缓存、可并发；占用另走 DB
- **不满足偏好 ≠ 没票**——可以降级为"随机分配"，这是产品策略，不是技术问题

**为什么省内存**：1000 个座位 = 1000 bit = 125 字节；换成 Hash 存 1000 个 field 是几十 KB。**两个数量级**。

## 七、面试怎么讲（30 秒版）

> 火车票库存有两个维度：区间余票和具体座位，不能 `stock-1`。
> 余票在 Redis 里是 Hash，一个 OD 组合一个 key、座位类型当 field，查询走 pipeline 批量取。
> 真正防超卖的是**令牌桶**：一个车次的所有区间放在同一个 Hash 里，field 是"始发_到达_座位类型"；下单时用 Lua **一次性扣减这单途经的所有区间**，保证"检查 + 扣减"原子，扣不动就返回余票不足。令牌桶是懒加载的，用 Redisson 锁做双重检查防击穿。
> 座位本身落在 MySQL 的 `t_seat` 里，锁座/解锁是带条件的 UPDATE——**座位是业务实体，要能被订单引用、要能审计，所以不放 Redis**。
> 缓存一致性靠三件套：定时任务全量初始化、懒加载回源、Canal 监听 binlog 增量，binlog 模式默认关闭。
> 我们还设计过 BitMap 判座（一个座位一个 bit、GETBIT 常数时间），但没接入主链路——**因为它要额外维护一整套写入链路，漏一处就是超卖**。

## 八、自己动手

1. 用 `redis-cli` 看一个真实车次的令牌桶：`HGETALL index12306-ticket-service:ticket_availability_token_bucket:{trainId}`，观察 field 是不是"始发_到达_类型"的笛卡尔组合
2. 下单一次，观察多少个 field 被扣减（应该等于途经区间数 × 座位类型数）——这就是"为什么必须 Lua"
3. 手工把某个区间扣到 0，再下单，看 `tokenIsNull` 的返回和提示文案
4. 读 `TrainSecondCheckSeat` 并手写一遍偏移公式，回答：为什么 3 个同列座位在 18 排里可能凑不齐？

## 延伸阅读

- [幂等设计](/java-practice/12306-design/01-idempotent) - 下单入口的另一道防线
- [延迟关单](/java-practice/12306-design/04-delayed-close-order) - 令牌回滚的触发者
- [分布式 ID 与分库分表](/java-practice/12306-design/03-distributed-id-sharding) - 订单落库那一步
- [Redis 入门](/service/common/redis-intro) - Lua、Hash、缓存三坑
- [MySQL 进阶](/service/common/mysql-advanced) - 带条件 UPDATE 与行锁

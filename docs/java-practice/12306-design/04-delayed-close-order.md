# 12306 延迟关单（延时消息 + 最终一致）

> **定位**：把"分布式事务"落到一个具体场景的文章。面试问"你们分布式事务怎么做的"，答"我们没用 Seata，用延时消息 + 状态机 + 对账"往往比背 TCC 更让人信服。
>
> **代码位置**：`services/order-service`（发送端）、`services/ticket-service`（消费端）

## 一、场景：为什么需要"延迟关单"

```
用户抢到座位 → 创建订单（状态：待支付）→ 锁座 10 分钟
                                              │
                         ┌────────────────────┴────────────────────┐
                    10 分钟内支付成功                        10 分钟没付
                    → 订单已支付，座位出票              → 关单 + 座位释放 + 令牌回滚
```

**难点在于"10 分钟后"这个定时动作**：

| 方案 | 问题 |
|------|------|
| 定时任务扫表 `WHERE status=待支付 AND create_time < now-10m` | 分库分表后要扫 64 张表；扫表间隔决定延迟精度；订单量大时扫描成本高 |
| `ScheduledExecutorService` / 时间轮（内存） | 单机内存，重启丢失，多实例重复执行 |
| **MQ 延时消息**（本项目） | 到期由 MQ 投递，天然分布式、天然重试；不占业务资源 |

## 二、发送端：下单即埋一颗"定时炸弹"

```java
// DelayCloseOrderSendProduce
.delayLevel(14)     // RocketMQ 4.x 固定 18 级：1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h
                    // 第 14 级 = 10 分钟
.keys(orderSn)      // 业务主键，用于消费端幂等和排查
```

**关键设计：消息里带的是 `orderSn`，不是"关单指令"**。消费时重新查订单状态再决定——因为 10 分钟里状态可能早就变了（已支付/已取消）。**不要相信消息里的快照**，这是分布式消息的基本纪律。

发送端还有一层模板方法（`AbstractCommonSendProduceTemplate`）：

```
buildBaseSendExtendParam()  → topic / tag / keys / 超时 / 延时级别
buildMessage()              → 组装 MessageWrapper（业务体 + keys）
（父类统一负责：发送、日志、异常）
```

## 三、消费端：三件事，顺序不能错

```java
// DelayCloseOrderConsumer（ticket-service）
@RocketMQMessageListener(topic = ORDER_DELAY_CLOSE_TOPIC_KEY, ...)
@Idempotent(                                  // ① 先幂等
        uniqueKeyPrefix = "index12306-ticket:delay_close_order:",
        key = "#msg.getKeys()+'_'+#msg.hashCode()",
        type = SPEL, scene = MQ, keyTimeout = 7200L)
public void onMessage(MessageWrapper<DelayCloseOrderEvent> msg) {
    Result<Boolean> closed = ticketOrderRemoteService.closeTickOrder(orderSn);   // ② 远程关单
    if (closed.getData() == false) return;     // ③ 用户已支付 → 什么都不做
    // ④ 关单成功 → 释放座位 + 回滚令牌（或交给 Canal）
}
```

**为什么幂等要放在最前面**：MQ 至少一次投递，同一条消息可能来两次。如果先关单再判幂等，第二次进来时订单已是"已关闭"，可能触发重复释放座位 → **超卖的反向事故（座位凭空多出来）**。

**`keyTimeout = 7200`（2 小时）的讲究**：要大于消息的最大重试窗口。设太短，重试时 key 已过期 → 幂等失效。

## 四、真正的一致性问题：关单要动四个地方

```
① 订单状态 → CLOSED（order-service 的库，64 个分片之一；用 Redisson 锁 order:canal:order_sn_* 串行化）
② 座位记录 t_seat 的每个 OD 段 status → AVAILABLE（ticket-service 的 MySQL）
③ 该单途经的每个区间，余票 Hash hIncrBy 加回 N 张（Redis）
④ 余票令牌桶 rollbackInBucket（Redis，Lua）
```

**四个存储、两个服务，没有全局事务**。所以只能：

```
先做 ①②（DB 是事实源，先把状态定下来）
成功后做 ③④（缓存投影，失败可重放）
失败 → 让 MQ 重试（at-least-once 兜底）
```

**为什么顺序必须是"先 DB 后缓存"**：缓存是可重建的投影。如果先放座位、关单却失败，座位已经被下一单买走 → 直接超卖。

> **这里有个值得注意的实现细节**（读源码能发现）：Canal 兜底路径（`OrderCloseCacheAndTokenUpdateHandler`）在订单变成 CLOSED 时只做了「解座位 + 回滚令牌」，**没有补余票 Hash**（③）。也就是说 binlog 模式下余票数字要靠 `hIncrBy` 的另一条链路或对账补齐——**这才是真实项目的样子：主链路正确，旁路有洞，靠对账兜**。面试如果讲"我们用 Canal 保证一致"，被追问"那余票怎么补"就露底了。
**为什么顺序是"先 DB 后缓存"**：缓存是可重建的投影，DB 是事实。反过来（先放座位再关单）一旦关单失败，座位已经被别人买走 → 直接超卖。

## 五、两种缓存更新模式（工程取舍）

```yaml
ticket.availability.cache-update.type:   # 空 = 业务代码直接更新；binlog = 交给 Canal
```

| 模式 | 路径 | 优点 | 缺点 |
|------|------|------|------|
| **直接更新** | 消费者里同步改 Redis（余票 Hash + 令牌） | 实时、链路短 | 每条业务路径都要记得改，容易漏 |
| **binlog 模式** | DB 变更 → Canal → MQ → `OrderCloseCacheAndTokenUpdateHandler` | 覆盖所有写入路径（含人工改库） | 有延迟，链路长，排查更难 |

**面试可以讲这个判断**：一致性要求越高、写入路径越多，越该用 binlog 驱动；但对延迟敏感的库存类数据，直接更新更可控。**没有标准答案，只有权衡**——能说出权衡点，比说出"我们用 XX"值钱。

## 六、最容易被追问的：支付与关单的竞态

```
T=19:59  用户点击支付
T=20:00  延时消息到期，开始关单
T=20:00  支付回调到达，开始改「已支付」
```

两个写入者同时改同一张订单——**这就是分布式下的"惊群"**。解决办法不是加锁，是**状态机 + CAS**：

```sql
-- 关单：只有"待支付"才能关（影响行数 = 0 说明已被支付抢先）
UPDATE t_order SET status = 'CLOSED'
WHERE order_sn = ? AND status = 'PENDING_PAYMENT';

-- 支付回调：只有"待支付"才能置为已支付
UPDATE t_order SET status = 'PAID'
WHERE order_sn = ? AND status = 'PENDING_PAYMENT';
```

**谁先成功谁算数**，另一个 `affected rows = 0` 后走"补偿分支"（关单发现已支付 → 什么都不做；支付发现已关闭 → 触发退款）。这套叫**状态机幂等**，比分布式锁可靠得多（锁会过期、会失效）。

## 七、还要有兜底：对账

延时消息可能丢（虽然概率低：Broker 宕机 + 未持久化）。所以生产必须补：

```
① 消息发送失败 → 本地消息表 / 事务消息（发送与建单同一事务）
② 定时对账任务：扫「待支付且已超时」的订单，补一次关单（幂等，重复执行无害）
③ 告警：待支付订单数异常增长 = 关单链路出问题
```

**这就是"最终一致"的完整含义**：不是"有个 MQ 就一致了"，而是 **主链路 + 重试 + 对账** 三层。

## 八、面试怎么讲（30 秒版）

> 锁座 10 分钟到期释放，我们没用定时扫表（分库分表后要扫 64 张表），也没上 Seata——下单时发一条 RocketMQ 延时消息（delayLevel=14 = 10 分钟），消费端做四件事：先幂等占位（防 MQ 重投重复释放座位）、再调订单服务关单（状态机 CAS，已支付则跳过）、然后把座位记录改回可售、最后逐区间加回余票并回滚令牌。顺序必须是"先 DB 后缓存"，因为 DB 是事实源、缓存是可重建投影。
> 最关键的是支付与关单的竞态：我们不用分布式锁，用**状态机 CAS**——`UPDATE ... WHERE status='待支付'`，谁先成功谁算数，另一个影响行数为 0 就走补偿分支。再加上定时对账兜底，保证最终一致。

## 九、自己动手

1. 把 `delayLevel` 改成 `16`（30 分钟），下一单后观察消息何时被消费（RocketMQ 控制台能看到 scheduled time）
2. 手工把订单状态改成 `PAID`，等延时消息到达，验证消费端"已支付则跳过"的分支
3. 并发调用"支付回调"和"关单"各 100 次，验证最终只有一种终态（状态机 CAS 的威力）

## 延伸阅读

- [幂等设计](/java-practice/12306-design/01-idempotent) - 消费端幂等的框架实现
- [分布式 ID 与分库分表](/java-practice/12306-design/03-distributed-id-sharding) - 关单要更新的那 64 个分片
- [选座与余票](/java-practice/12306-design/02-seat-and-ticket) - 令牌回滚的目标
- [消息队列](/service/common/mq-intro) - 不丢/不重/顺序的通用做法
- [分布式基础](/service/common/distributed-basics) - 2PC/TCC/Saga 与本地消息表对比

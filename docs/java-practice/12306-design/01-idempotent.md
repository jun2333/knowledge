# 12306 幂等设计（注解 + AOP + 四种策略）

> **定位**：项目里最有"造轮子"含金量的一块。面试问"你们怎么防止重复下单"，能讲出这套分层设计，比说"加个 Redis 锁"高一个段位。
>
> **代码位置**：`frameworks/idempotent`（公共 starter，各服务依赖）

## 一、先想清楚：重复请求从哪来

| 来源 | 场景 |
|------|------|
| 用户手抖 | 连点两次"提交订单" |
| 网络重试 | 网关超时重试、客户端 failover |
| **MQ 重投** | 消费失败/超时，RocketMQ 按重试策略再投一次（**这是绕不过去的**） |
| 定时任务/补偿 | 对账任务重复触发 |

**关键认知**：MQ 至少一次投递是设计前提，所以"消费端必须幂等"不是可选项。而 HTTP 接口的幂等，是"尽量拦住"，因为前端不可信。

## 二、四道防线（按成本从低到高）

```
① 前端：按钮 loading 置灰（挡 80%，但不可信）
② 网关/过滤器：短时间窗口内相同请求指纹限流（挡刷接口）
③ 业务层：幂等框架（本项目重点）——注解 + 分布式锁/令牌
④ 存储层：唯一索引（最后一道，也是最硬的保证）
```

**为什么最后一定要落到唯一索引**：前面全是"尽力而为"，只有数据库约束是"无论如何只成功一次"。12306 的 `t_order` 上有 `order_sn` 唯一键，这就是兜底。

## 三、框架全貌：注解 → 切面 → 工厂 → 处理器

```
@Idempotent(scene, type, key, message, keyTimeout)
        │
        ▼
IdempotentAspect（@Around 拦截）
        │  IdempotentExecuteHandlerFactory.getInstance(scene, type)
        ▼
IdempotentExecuteHandler（四种实现，模板方法）
        │
        ├─ execute()    → buildWrapper() 造 lockKey → handler() 抢锁/占位
        ├─ proceed()    → 执行真正的业务方法
        ├─ postProcessing()      → 成功后的收尾（解锁/置已完成）
        └─ exceptionProcessing() → 业务抛异常时删占位，**允许 MQ 重投**
```

这里有两个设计值得学：

1. **模板方法**：`AbstractIdempotentExecuteHandler` 把"造参数包装器 → 执行"的骨架固定，子类只实现 `buildWrapper()`（怎么算 key）和 `handler()`（怎么占位）
2. **工厂按二维坐标选实现**：`(scene, type)` —— scene 区分 REST / MQ，type 区分 PARAM / SPEL / TOKEN。
   **但注意一个实现细节**：`RESTAPI` 场景按 type 分三种，`MQ` 场景**直接忽略 type、恒定取 SpEL-ByMQ 实现**——因为 MQ 消息天生需要一个"业务唯一键"，PARAM/TOKEN 那套在消费端没有意义。读源码时这种"看似二维、实际一维退化"的地方，往往就是设计取舍所在

```java
// 注解属性
String key();                 // 幂等 key，支持 SpEL（仅 SPEL 类型用）
IdempotentTypeEnum type();    // PARAM / SPEL / TOKEN（默认 PARAM）
IdempotentSceneEnum scene();  // RESTAPI / MQ（默认 RESTAPI）
String message();             // 重复时的提示，默认"您操作太快"
String uniqueKeyPrefix();     // key 前缀（仅 MQ+SPEL 用）
long keyTimeout();            // key 存活秒数，默认 3600（仅 MQ+SPEL 用）
```

## 四、四种策略，各自解决什么

### ① PARAM：按"用户 + 参数指纹"加锁（REST 场景）

```java
// IdempotentParamExecuteHandler
lockKey = "idempotent:path:" + servletPath
        + ":currentUserId:" + userId
        + ":md5:" + md5(JSON(args))

RLock lock = redissonClient.getLock(lockKey);
if (!lock.tryLock()) throw new ClientException("请勿重复提交");
```

- **key 的三段含义**：哪个接口 + 谁 + 什么参数。三者全同才算"同一请求"
- 用 `tryLock()` **不等待**——第二次请求立刻失败，而不是排队（排队会让用户等，且最终还是会执行）
- 锁在 `postProcessing` 里释放，业务没执行完锁一直持有 → 天然防并发重复

**面试追问"为什么用 MD5 而不是原始参数"**：key 要短、要定长、避免特殊字符；MD5 只用来"判等"，不承担安全职责（碰撞概率在此场景可忽略）。

### ② SPEL + 状态机：MQ 消费幂等（本项目最精彩的一处）

```java
// IdempotentSpELByMQExecuteHandler
String uniqueKey = uniqueKeyPrefix + SpEL解析出的key;   // 例：订单号
// Lua 原子：SETNX 并返回旧值
String old = setIfAbsentAndGet(uniqueKey, "CONSUMING", 600s);
if (old != null) {
    boolean error = IdempotentMQConsumeStatusEnum.isError(old);
    throw new RepeatConsumptionException(error);
}
```

**为什么不用简单的 SETNX**：因为要区分两种"重复"——

| 旧值 | 含义 | 该怎么处理 |
|------|------|-----------|
| `CONSUMING`（处理中） | 上一次还没跑完（可能宕机了） | `error=true` → **抛异常让 MQ 延迟重投** |
| `CONSUME`（已完成） | 上一次真的成功了 | `error=false` → 直接返回，**视为成功** |

切面里对应：

```java
catch (RepeatConsumptionException ex) {
    if (!ex.getError()) return null;   // 已完成 → 幂等返回
    throw ex;                          // 处理中 → 让 MQ 重试
}
```

**这一层是很多项目讲不清的地方**：只说"用 Redis SETNX 去重"，答不出"处理到一半挂了怎么办"。

### ③ TOKEN：先领票再消费（防跨页面重复提交）

```
GET /token                   → 生成 "前缀+UUID" 存 Redis，返回给前端（默认 6 秒有效）
POST /purchase  带 token     → 直接 DEL；DEL 返回 false（不存在/已被用）就拒绝
```

- 适合"表单页"：进页面领 token，提交时消耗
- 一次一用，**天然不可重放**；缺点是前端要改造两处
- **实现细节值得注意**：它**没有用 Lua 做"原子占用"**，就是 `DEL` —— 靠 Redis 单命令的原子性，"先删到的那个请求赢"。并发下两个请求同时 `DEL`，只有一个返回 1，所以仍然只有一次能通过。这个细节如果被问"怎么保证原子"，答"DEL 本身就是原子的"比硬说"用了 Lua"更准确。

### ④ REST + SPEL：key 由业务字段决定

和 ② 同源，只是 `scene` 是 REST：按 `#orderSn` 这类业务主键占位，适合"按单号幂等"的接口。

## 五、异常路径才是重点

```
正常：execute 占位 → 业务成功 → postProcessing 置"已完成"
异常：业务抛错 → exceptionProcessing **删除占位** → 异常继续上抛
```

**为什么要删**：MQ 会重投，如果占位还留着（还是 CONSUMING），下次消费会被判成"处理中"而一直重试、永远不成功。**"失败必须让位"，这条规则比抢锁本身更重要。**

## 六、面试怎么讲（30 秒版）

> 我们的幂等不是单点方案，是分层的：前端置灰 → 网关限流 → 幂等框架 → 数据库唯一键兜底。
> 框架是注解 + AOP，按 `(scene, type)` 二维工厂选处理器：REST 用"用户+路径+参数 MD5"做 Redisson 分布式锁，MQ 用 SpEL 取业务单号做 Redis 占位 + 状态机——**关键是区分"处理中"和"已完成"**，前者抛异常让 MQ 重投，后者直接幂等返回；业务异常时会删占位，避免消息永久卡死。最后一条防线是 `order_sn` 唯一索引，保证绝对只落一单。

## 七、自己动手验证

1. 在 mall 里给 `createOrder` 加 `@Idempotent`，用 Postman 并发发 10 次，看是否只有一次成功
2. 把 MQ handler 的 `keyTimeout` 改成 5 秒，模拟"处理超时后重投"，观察 `RepeatConsumptionException` 的 error 分支
3. 故意在业务方法里抛异常，确认 Key 被删（`redis-cli get`），消息能重投成功

## 延伸阅读

- [选座与余票](/java-practice/12306-design/02-seat-and-ticket) - 幂等的下游：抢到令牌之后怎么落座
- [延迟关单](/java-practice/12306-design/04-delayed-close-order) - MQ 消费幂等的真实使用者
- [并发与锁](/service/common/concurrency-locks) - Redisson 锁的可重入、看门狗
- [Java 并发编程](/service/java/java-concurrency) - tryLock / AQS 基础

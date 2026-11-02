# 双项目精读计划（mall × 12306）

> **定位**：不按文件读，按「同一个问题在两个项目里怎么解」读。每个主题产出一张卡片，面试直接能用。
>
> **前置**：mall 能跑通、12306 的[四条主线](/java-practice/07-microservice-12306)读过一遍。
>
> **时间**：每天 60~90 分钟，10 天走完。**宁可少看一个主题，也要把卡片写完**——不产出等于没读。

## 一、为什么用"对比式阅读"

```
单看 mall    → 满眼 CRUD，看不出设计，容易觉得"这项目没东西"
单看 12306   → 满眼抽象，看不懂"为什么要这么复杂"
两个一起看   → mall 是教学简化版，12306 是生产妥协版，差异本身就是知识
```

**核心提问**：mall 为什么这么写？12306 为什么换了方案？是我这个场景不需要，还是 mall 写错了？

诚实的答案通常是三种之一：

| 答案 | 例子 |
|------|------|
| mall 的场景不需要 | 单机 + 低并发 → 不需要分布式锁 |
| mall 确实写错了/写简了 | 下单没事务、库存读改写 |
| 12306 过度设计 | 教学项目不值得上 ShardingSphere |

**能分清这三种，就已经超过大多数背八股的候选人。**

## 二、总览矩阵（先扫一眼，再逐个精读）

| # | 主题 | mall 的做法 | 12306 的做法 | 差在哪 |
|---|------|------------|-------------|--------|
| 1 | 统一返回 + 异常 | `CommonResult` + `Asserts.fail` + `@RestControllerAdvice` | `Result` + 业务码 2xxxx/4xxxx 分段 + 枚举带 HttpStatus | 12306 把"错误码→HTTP 状态"做成了单一来源 |
| 2 | 认证 | `JwtAuthenticationTokenFilter` + 白名单 `IgnoreUrlsConfig` | 网关统一校验 + 下游复验 | 单体在应用内拦，微服务在边缘拦 |
| 3 | 鉴权 | **动态资源权限**：URL 存 `ums_resource`，运行时查 | 角色粒度，网关放行后基本不细控 | mall 这套更接近真实后台系统 |
| 4 | 缓存 | `*CacheService` 命名切面 + `@CacheException` 降级 | 多级缓存框架 + 布隆防穿透 + 令牌桶 | mall 学"降级思想"，12306 学"高并发结构" |
| 5 | 幂等 | **没有** | 注解 + AOP + 四种策略 | 这是 mall 最大的空白 |
| 6 | 库存扣减 | 读-改-写（**有丢更新风险**） | Redis 令牌桶 + DB 条件 UPDATE | 反面教材 vs 正确做法 |
| 7 | 订单号 | 日期 + 来源/支付方式 + Redis `INCR`（按天分 key） | 雪花 + `userId%1000000` 基因 | 单库用 Redis，分库必须全局 ID |
| 8 | 超时取消 | RabbitMQ TTL + 死信（定时兜底**默认关闭**） | RocketMQ 延时消息 + 状态机 CAS + 对账 | 一个只有精确通道，一个还有兜底 |
| 9 | 数据访问 | MBG 生成 + **Example 动态查询** | MyBatis-Plus + ShardingSphere 分片 | Example 模式国内老项目遍地都是 |
| 10 | 可观测 | `WebLogAspect` → Logstash → ES | 网关访问日志 + traceId | mall 这条链路可以直接抄 |

## 三、10 天精读清单

> 每项都给「看什么 → 带着什么问题看 → 能学到的结论」。**先看再答，别先看答案。**

### Day 1｜异常与统一返回（mall 的"断言式校验"）

**看**：`mall-common/.../exception/Asserts.java`、`GlobalExceptionHandler`、`ApiException`
**问自己**：
1. 为什么业务代码里到处 `Asserts.fail("库存不足")`，而不是每层返回 boolean 再由上层判断？
2. `GlobalExceptionHandler` 里为什么要分 `ApiException`（业务）和 `Exception`（兜底）两类？

**结论**：断言把"错误处理"从返回值里剥离，Controller 只剩成功路径 → 这就是**"异常往上抛、全局统一接"**的落地。业务异常带错误码，兜底异常只记日志、不把堆栈吐给前端。

**追问预警**：`Asserts.fail` 抛的是运行时异常吗？如果不是，`@Transactional` 会回滚吗？

---

### Day 2｜动态权限（mall 最值得学的一块）

**看**：`mall-security/.../component/DynamicSecurityMetadataSource.java`、`DynamicAuthorizationManager.java`、`DynamicSecurityService`；再看 `UmsResourceServiceImpl.listResourceList` 那条四表联查
**问自己**：
1. 为什么权限点是"URL 字符串"而不是"权限码"？
2. `DynamicSecurityMetadataSource` 启动时预加载了什么？为什么用 `@PostConstruct`？
3. 每次请求都要查一次权限吗？缓存怎么做的？

**结论**：**权限可配置 = 权限数据在 DB、判断在运行时**。URL 作为权限点，改权限改库即生效，不用发版。代价是每次请求都要匹配 URL 规则（所以要缓存 + 预加载）。

**追问预警**：URL 匹配用的是什么规则？`/notice/*` 和 `/notice/**` 差在哪？（答案在 harvest 里）

---

### Day 3｜认证链路与白名单

**看**：`JwtTokenUtil`、`JwtAuthenticationTokenFilter`、`IgnoreUrlsConfig`、`SecurityConfig`
**问自己**：
1. 登录接口为什么不需要 token？是"过滤器放行了"还是"根本没进过滤器"？
2. `SecurityContextHolder` 里的用户信息，是谁放进去的？什么时候清？
3. 401 和 403 分别由谁产生？（`RestAuthenticationEntryPoint` / `RestfulAccessDeniedHandler`）

**结论**：**认证是"过滤器塞上下文"，鉴权是"决策器查权限"**，两件事分开。白名单是"跳过认证"，不是"跳过鉴权"。

**追问预警**：JWT 无状态，改了密码旧 token 还能用——怎么解决？（mall-design 第二篇有）

---

### Day 4｜缓存降级 AOP（三行切点，一个设计思想）

**看**：`RedisCacheAspect.java`、`CacheException.java`、`UmsAdminCacheServiceImpl`
**问自己**：
1. 切点为什么写 `*CacheService.*(..)` 而不是给每个方法加注解？
2. 吞掉异常后返回 `null`，调用方怎么知道要走 DB？
3. 哪些方法标了 `@CacheException`？为什么它们不能降级？

**结论**：**用命名约定代替注解配置**——所有 `*CacheService` 自动获得降级能力，个别关键方法用 `@CacheException` 显式拒绝降级（如验证码：假成功比失败更糟）。降级的前提是**有第二数据源**。

**再看一眼"删缓存"的正确姿势**：`UmsAdminCacheServiceImpl` 里改角色/资源后不是只删自己的 key，而是**按 role/resource 反查出一批相关 key 批量 del**（因为一个管理员的信息可能缓存在多个维度下）。**缓存一致性最难的不是"删不删"，是"要删哪几个"**。

**追问预警**：Redis 挂了，请求全部打到 DB，会不会把 DB 打挂？这时候该做什么？

---

### Day 5｜订单主流程（重点是"看出它缺什么"）

**看**：`OmsPortalOrderServiceImpl.generateOrder` 全流程（约 150 行）
**问自己**：
1. 这个方法有几件事要做？（锁库存、算优惠、插订单、插明细、改券、扣积分、删购物车、发消息）
2. `@Transactional` 在哪？在类上、方法上、还是接口上？
3. 如果第 5 步失败，前面 4 步会回滚吗？

**结论（重要）**：
- `@Transactional` 标在**接口** `OmsPortalOrderService` 上，而 Spring Boot 2+ 默认 **CGLIB 代理 → 接口注解不生效**
- 即使生效，`lockStock` 是「查出来 → 内存加 → 写回」，并发下**丢更新**
- 同一个项目里 `PmsProductServiceImpl:71` 却写对了：`@Transactional(rollbackFor = Exception.class)` 连插 7 张关联表——**说明作者会写，只是下单这条最该加的地方漏了**

**再补一刀（更隐蔽）**：`paySuccess(orderId, payType)` **不校验当前订单状态**。支付平台重复回调（超时重试、人工补单）会把 `stock` 再扣一次、`lock_stock` 再减一次。这是"幂等"缺失在支付环节的体现，比重复下单更严重。

**这是全项目最值钱的"反面教材"**。面试讲"我参考了 mall 的下单实现"是减分项；讲"我读了 mall，发现它的下单缺事务边界、库存是读改写、支付回调不校验状态，所以我在自己的实现里改成了条件 UPDATE + 状态机"是加分项。

---

### Day 6｜库存扣减：把错的改成对的（动手）

**看**：`lockStock`（下单锁定）、`hasStock`（下单前校验）、`PortalOrderDao.xml` 的 `updateSkuStock`（支付/取消时批量改）
**问自己**：
1. `hasStock` 先查再判，`lockStock` 再改——中间这段时间别的请求在干什么？
2. `updateByPrimaryKeySelective` 写的是绝对值还是增量？
3. `updateSkuStock` 用 `CASE WHEN` 批量更新很聪明，但 `WHERE` 里有什么？

**mall 的真实 SQL**（`mall-portal/src/main/resources/.../PortalOrderDao.xml:50`，简化）：

```sql
UPDATE pms_sku_stock
SET stock      = CASE id WHEN #{id} THEN stock - #{qty}      ... END,
    lock_stock = CASE id WHEN #{id} THEN lock_stock - #{qty} ... END
WHERE id IN (...);          -- ← 只有 id，没有任何库存余量条件
```

**两条结论**：
- `CASE WHEN` 批量更新本身是好手法（一次往返改多条，比 for 循环 update 快一个量级）——**这个可以学**
- 但 `WHERE` 只有 `id IN`，**没有 `stock >= n`**——扣到负数也不会失败

**动手**（这一天必须写代码）：
```sql
-- 单条：把"读改写"改成"条件原子更新"
UPDATE pms_sku_stock
SET lock_stock = lock_stock + #{quantity}
WHERE id = #{skuId}
  AND stock - lock_stock >= #{quantity};
-- 影响行数 = 0 → 库存不足（用返回值判断，别再依赖 hasStock）
```
然后并发测：10 个线程各买 1 件、库存 5 件，验证只有 5 次成功。

**结论**：**"检查 + 扣减"必须在一条 SQL 里**。这和 12306 的 Lua 令牌桶是同一个思想（检查与扣减原子），只是粒度不同。mall 的 `hasStock` + `lockStock` 是"检查在 Java、扣减在 SQL"，中间有窗口。

> 顺带记一个正例：`PmsProductServiceImpl:71` 用 `@Transactional(rollbackFor = Exception.class)` 连插 7 张关联表——**多表写就该这么写**。同一个项目里，商品模块写对了、下单模块没写，这种"不一致"本身就是很好的面试话题。

---

### Day 7｜订单号与超时取消（一条"只有一半"的最终一致链路）

**看**：`generateOrderSn`、`CancelOrderSender`、`RabbitMqConfig.orderTtlQueue`、`CancelOrderReceiver`、`OrderTimeOutCancelTask`
**问自己**：
1. 订单号为什么按天分 key 做 `INCR`？换成 `INCR` 不分天会怎样？
2. RabbitMQ 的 TTL + 死信是怎么实现"延迟"的？为什么说它有**队头阻塞**问题？
3. `OrderTimeOutCancelTask` 上的 `@Component` 是开着的吗？

**结论**：
- 订单号 = `yyyyMMdd + 来源(2) + 支付方式(2) + 序号(6)`，**可读、可反解、单库够用**；分库就不行了（要全局 ID）
- TTL + 死信是 RabbitMQ 的"曲线延迟"：**消息级 TTL** 按队列顺序过期，前一条没到期会挡住后面的（队头阻塞）→ 这正是 RocketMQ 延时消息的动机
- **关键发现：`OrderTimeOutCancelTask` 的 `@Component` 被注释掉了，定时兜底默认不启用**。所以 mall 实际只有"延时消息"一条路——消息一丢，订单永远不关、库存永远锁着
- 这正好解释了 12306 为什么要"延时消息 + 对账"两条腿：**只有一个通道的最终一致，不叫最终一致**

**面试怎么答**：不要说"mall 用了延时队列 + 定时任务双保险"（没开）。正确的说法是：mall 只做了精确通道，兜底被注释了，这是个典型缺口；生产上必须补"扫表对账"，且扫表要能扛住分库分表（按时间分片扫，别全表扫）。

---

### Day 8｜幂等：在 mall 里"补"出 12306 的那套

**看**：mall 的 `OmsPortalOrderController.generateOrder`（有没有防重？答案是没有）→ 对照 [12306 幂等篇](/java-practice/12306-design/01-idempotent)
**问自己**：
1. 用户连点两次"提交订单"，mall 会生成两个订单吗？
2. 如果加幂等，key 该怎么设计？（用户 + 路径 + 参数摘要？还是前端 token？）

**动手**：给 `generateOrder` 加一个最简单的幂等——`SETNX order:submit:{memberId}:{cartIdsHash}`，失败返回"请勿重复提交"。跑通后再读 12306 的注解版，就能看懂它在解决什么。

**结论**：幂等的三层——**前端置灰 → 分布式锁/令牌 → 数据库唯一索引**。mall 一层都没有，所以这是"补作业"最好的练习。

---

### Day 9｜数据访问：Example 模式（老项目的通行证）

**看**：任意 `*Example.java`（MBG 生成的）+ `PmsProductMapper.xml` 里的 `Example_Where_Clause` → 对照 [harvest 里"Example 动态查询两层 if"](/java-practice/harvest)
**问自己**：
1. `andNameLike("%" + name + "%")` 只在 name 非空时调用——如果传了 null 会怎样？
2. Example 的 `criteria` 里存的是什么？SQL 是在哪一层拼的？

**结论**：Example 模式把"条件"从 SQL 里搬到 Java 对象，XML 只做翻译。**Java 层判空、示例层记录、XML 层翻译**，三层职责分明。坑是"Java 不判空 → SQL 出现 `= null` → 永远查不出"。

**对比**：12306 用 MyBatis-Plus 的 `LambdaQueryWrapper`，本质是同一件事的现代写法（用 lambda 拿字段名，避免魔法字符串）。

**顺带看一个分页封装**：`CommonPage.restPage` 有两个重载——一个吃 `PageHelper` 的 `List`，一个吃 Spring Data 的 `Page`。**同一个出参适配两种分页来源**，这是"新旧分页方案混用"项目的常见过渡写法，读老代码会用得上。

---

### Day 10｜日志与可观测（可直接抄的一条链路）

**看**：`WebLogAspect`、`logback-spring.xml`、`document/elk` 下的 logstash 配置
**问自己**：
1. 为什么要 `@Around` 而不是 `@Before` + `@AfterReturning`？
2. 日志里的 traceId 从哪来？跨服务怎么传？
3. 应用里为什么没有 ES 配置？

**结论**：**应用只负责"发"，存哪由 Logstash 决定**——这是"关注点分离"在日志上的体现。`@Around` 能同时拿到入参、返回值、耗时、异常，一个切面搞定。

**追问预警**：日志里有用户手机号/身份证怎么办？（脱敏在序列化层做，别在业务里散着 replace）

---

### 选修｜mall 独有的三个小设计（各 20 分钟）

这两个模块 12306 里没有，属于"加餐"：

| 看什么 | 学什么 | 一句话结论 |
|--------|--------|-----------|
| `mall-demo/.../validator/FlagValidator` + `FlagValidatorClass` | **自定义校验注解**：`@Constraint(validatedBy=...)` 是怎么接进 `@Valid` 的 | 自定义校验器只需实现 `ConstraintValidator<注解, 字段类型>`，框架在参数绑定时调用 |
| `mall-search/.../EsProductServiceImpl.importAll()` | Spring Data ES 的 Repository + 原生 DSL 两条用法 | **同步是手动的**（`importAll` 要人调），生产该改成 binlog/Canal 增量——这正好和 12306 的 Canal 对照 |
| `mall-demo/.../RestTemplateDemoController` | `RestTemplate` 的三种调用写法（getForObject / postForEntity / exchange） | 微服务里被 OpenFeign 取代，但要能看懂老项目 |
| `UmsMenuServiceImpl:77/97` | **递归建树**（菜单父子关系 → 树） | 一次查全表、内存里按 parentId 分组递归，避免 N+1；这是后台管理系统最高频的算法 |
| `OssServiceImpl:50` | **服务端签名 + 前端直传 OSS** | 文件不经过应用服务器，省带宽；签名只给"限时 + 限定路径"的凭证 |

**关于 ES 同步的追问预警**：面试问"商品数据怎么同步到 ES"，答"定时全量 importAll"是减分项——应该说"全量初始化 + 增量靠 binlog（Canal）或 MQ 事件"，并说明为什么不能用定时全量（数据量大时扫不动、延迟不可控）。

---

## 四、mall 的「值得学 / 别学」清单

| 值得学 | 为什么 | 位置 |
|--------|--------|------|
| 断言式校验 | 业务异常与返回值解耦 | `Asserts` + `GlobalExceptionHandler` |
| 命名约定切面 | 用命名代替注解，减少配置噪音 | `RedisCacheAspect` |
| 动态资源权限 | 权限可配置的标准实现 | `DynamicSecurityMetadataSource` |
| RabbitMQ TTL + 死信 | 队列级延迟的实现，以及它的队头阻塞 | `CancelOrderSender` + `RabbitMqConfig` |
| Redis 生成业务号 | 按天分 key、可读可反解 | `generateOrderSn` |
| Example 动态查询 | 老项目必备 | `*Example` + `Example_Where_Clause` |

| 别学（并发/事务不安全） | 问题 | 正确做法 |
|------------------------|------|---------|
| 下单方法的事务边界 | `@Transactional` 标在接口上，CGLIB 下不生效 | 标实现类方法 + `rollbackFor` |
| `lockStock` 读改写 | 并发丢更新 | `SET lock_stock = lock_stock + n WHERE stock - lock_stock >= n` |
| `hasStock` 先查后判 | 检查与扣减分离 | 合并成一条条件 UPDATE |
| 下单无幂等 | 连点两次生成两单 | 分布式锁 / token / 唯一索引 |
| `paySuccess` 不校验状态 | 重复支付回调会二次扣库存 | 状态机 CAS（`WHERE status = 待支付`） |
| 领券 check-then-act（`UmsMemberCouponServiceImpl:43`） | 库存/时间/限领三次独立查询后才插 | 唯一索引（user_id + coupon_id）+ 条件扣减 |

> **一句话**：mall 的价值不在"它怎么写的"，在"它教会你看一个项目该怀疑什么"。
>
> **一个全局事实**：全库 grep `synchronized` / `ReentrantLock` / `Redisson` / 分布式锁 —— **0 命中**。整个项目没有任何并发控制，唯一"并发安全"的地方是 Redis `INCR` 生成订单号。这不是缺陷展示，而是"教学项目的边界"：它教你三层架构和框架用法，但不教你抗并发。**抗并发要去 12306 学**。

### 设计模式速查（想找"经典用法"就从这里挑）

| 模式 | mall 里的位置 | 学到什么 |
|------|--------------|---------|
| **建造者** | `*Example.java` 的 `Criteria` 链式调用（3000 行生成物） | 复杂条件对象的构造；链式 API 怎么写 |
| **静态工厂** | `CommonResult.success() / failed()` | 统一出参 + 泛型推断 |
| **策略** | `DynamicAuthorizationManager`（鉴权策略）、`OssService`（阿里云直传签名） | 把"可变算法"抽成接口，运行时选实现 |
| **责任链** | Spring Security 的 `FilterChain`、`JwtAuthenticationTokenFilter` | 请求穿过一串处理器，每个只做一件事 |
| **代理** | `WebLogAspect`、`RedisCacheAspect` | AOP 就是动态代理，切面是"包装"不是"插入" |
| **模板方法** | `Abstract...` 类（mall 里少，12306 里多） | 骨架固定、步骤可变；对照 12306 的 `AbstractIdempotentExecuteHandler` |
| **递归** | `UmsMenuServiceImpl:77/97` 菜单建树 | 一次查全表 + 内存分组，避免 N+1 |

> **怎么用这张表**：面试问"你用过什么设计模式"，别背定义，说"我在 XX 场景用了策略模式解决 YY 问题"——上面每一行都能这么讲。

## 五、产出物：每张卡片固定六行

```
### 主题：库存扣减
- mall：查出来 → 内存加 → 写回（丢更新）
- 12306：Redis 令牌桶 + DB 条件 UPDATE
- 关键差异：检查与扣减是否原子
- 代价：12306 要维护令牌桶初始化/回滚，复杂度高一个量级
- 30 秒答法：……
- 追问预警：令牌桶和 DB 库存不一致怎么办（对账）
```

**10 张卡片写完，你会发现面试题不用背了**——因为每道题你都有"两个真实实现的对比"当素材。

## 六、如果时间只够一半

按这个优先级砍：

| 优先级 | 主题 | 理由 |
|--------|------|------|
| 必做 | Day 5、6（订单 + 库存） | 面试必问，且 mall 有坑可讲 |
| 必做 | Day 8（幂等） | 补作业性价比最高 |
| 强烈建议 | Day 2、3（权限/认证） | mall 独有，微服务项目里反而看不到 |
| 可选 | Day 1、7、9、10 | 已在前面的文档里覆盖过原理 |

## 七、和已有文档的关系

| 文档 | 作用 |
|------|------|
| [mall 设计记录](/java-practice/mall-design/01-permission-design) | 权限 / token 失效的深度设计（对应 Day 2、3） |
| [12306 四条主线](/java-practice/07-microservice-12306) | 对应 Day 6、7、8 的"正确答案" |
| [harvest 收获记录](/java-practice/harvest) | 上面计划里很多结论的原始来源 |
| [Java 专项模拟面试](/interview-questions/2026-10-26-java) | 读完计划后的自测 |

## 附：第三个项目（AI 方向，可选）

如果时间还有，或者要面 AI 应用岗，第三个项目是 [ragent](/java-practice/ragent-reading)（nageoffer 的 Agentic RAG 平台，和 12306 同作者）。

**它和这个计划的关系**：mall 教你"框架怎么用"、12306 教你"并发怎么抗"，ragent 教你"**多个下游怎么编排**"。第三个问题在 BFF、网关、聚合层都会遇到，而且它的代码质量（注释、降级、可观测）是三个项目里最高的。

**只读 4 小时就够**：多通道并行引擎 → RRF 融合 → 公平限流 → 可编排 Pipeline。

## 延伸阅读

- [Spring 核心原理](/service/java/spring-principles) - Day 5 的事务失效、Day 2 的 AOP
- [MySQL 进阶](/service/common/mysql-advanced) - Day 6 的条件更新与行锁
- [消息队列](/service/common/mq-intro) - Day 7 的 TTL/死信/延时消息

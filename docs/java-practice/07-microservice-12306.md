# 阶段 7：12306 微服务（总览）

> **目标**：把 mall（单体）学到的东西，在真实的微服务 + 高并发场景里验证一遍，并且**拿到一个能讲 20 分钟的面试项目**。
>
> **前置**：阶段 1-6 完成。项目在 `~/Documents/Jun/code/12306`。
>
> **读法**：本篇只建立全局坐标系；四个技术主线是独立的深挖篇，建议按 ①→④ 顺序读（正好是一条业务链路的顺序）。

## 一、为什么 12306 比 mall 值得讲

| | mall | 12306 |
|--|------|-------|
| 性质 | 教程型电商单体（macrozheng 出品） | 高并发票务系统（有真实的复杂度） |
| 面试官反应 | "这个我见过很多次" | "这个有点意思，你说说超卖怎么防" |
| 能深挖的点 | CRUD、JWT、缓存注解 | **余票 Hash 矩阵 + Lua 原子扣减、DB 行锁落座、基因法分片、延时消息最终一致** |
| 你的角色 | 跟着教程跑通 | 能说清"为什么这么设计、代价是什么" |

**结论**：mall 用来"建立骨架"，12306 用来"拿面试分"。别把 80% 的时间花在 mall 的 CRUD 上。

## 二、项目全景

```
12306/
├── services/                       # 微服务，按业务拆分
│   ├── gateway-service             # 网关：统一入口、路由、鉴权
│   ├── user-service                # 用户 / 乘车人 / 证件
│   ├── ticket-service              # 购票核心：余票、选座、锁座、延迟关单消费
│   ├── order-service               # 订单：分库分表（2 库 × 32 表）、ID 生成
│   ├── pay-service                 # 支付、回调
│   └── aggregation-service         # BFF：聚合多服务数据
├── frameworks/                     # 公共 starter（被各服务依赖）
│   ├── idempotent/                 # 幂等框架（注解 + AOP + 4 种策略）
│   ├── distributedid/              # 雪花 + workId 获取 + 业务前缀
│   ├── cache/                      # 多级缓存（Caffeine + Redis）、防穿透
│   ├── database/                   # 数据访问、分库分表适配
│   ├── convention/ base/ web/ log/ designpattern/
└── console-vue                     # 管理后台前端
```

**技术栈**：JDK 17 + Spring Boot 3 + Spring Cloud Alibaba（Nacos 注册/配置、Sentinel 限流）+ Redis + Redisson + RocketMQ + ShardingSphere + Canal。

**和 mall 的关键差异**：

| 维度 | mall（单体） | 12306（微服务） |
|------|-------------|----------------|
| 服务调用 | 进程内方法调用 | HTTP/RPC 跨进程（Feign） |
| 找服务 | 不需要 | Nacos 注册中心 |
| 流量入口 | 直接访问 | 网关统一鉴权/限流/路由 |
| 数据 | 一个库 | 每服务独立库，订单还要分库分表 |
| 事务 | `@Transactional` | 没有全局事务 → 延时消息 + 状态机 + 对账 |

## 三、四条技术主线（深挖篇）

按**一条下单请求的路径**读，而不是按模块读：

| # | 主线 | 解决的问题 | 核心技术 | 篇目 |
|---|------|-----------|---------|------|
| ① | **幂等** | 用户连点、网络重试、MQ 重投 → 重复下单 | 注解 + AOP + 工厂 + Redisson/Redis 占位 + 状态机 | [幂等设计](/java-practice/12306-design/01-idempotent) |
| ② | **余票与选座** | 瞬时高并发打垮 DB；座位不能卖重 | 余票 Hash 矩阵 + Lua 批量扣区间 + DB 行锁落座 | [余票与选座](/java-practice/12306-design/02-seat-and-ticket) |
| ③ | **分布式 ID + 分片** | 分库分表后 ID 唯一、按两个维度都能查 | 雪花（Redis 分配 workId）+ 基因法复合分片键 | [分布式 ID 与分库分表](/java-practice/12306-design/03-distributed-id-sharding) |
| ④ | **延迟关单** | 锁座 20 分钟到期释放；支付与关单竞态 | RocketMQ 延时消息 + 状态机 CAS + 对账 | [延迟关单](/java-practice/12306-design/04-delayed-close-order) |

**为什么是这四条**：它们正好覆盖 Java 后端面试的四类高频题——**并发与幂等、缓存与高并发、分库分表、分布式事务**。学完能对应到八股，而不是"看过一个项目"。

## 四、验收标准（做完自检）

- [ ] 能画出"下单"全链路：网关 → 幂等 → 领令牌 → 判座 → 建单（分片）→ 发延时消息
- [ ] 能说清"余票令牌桶"挡在哪个位置、为什么必须在座位分配之前
- [ ] 能解释基因法解决什么查询问题，并指出"两条 hash 分支必须一致才严格成立"这个实现细节
- [ ] 能说清支付与关单的竞态怎么解决（状态机 CAS，不是分布式锁）
- [ ] 能说出四条主线各自的**代价**（而不只是优点）——这是区分"背过"和"想过"的分水岭

## 五、面试叙事模板（STAR）

背下面这段结构，比背任何八股都有用。**每个点都要能展开 2 分钟**：

```
S（背景）：12306 类票务系统，核心难点是瞬时高并发抢票 + 库存不能超卖 + 订单要分库分表
T（任务）：我负责/研究了 购票链路的 库存校验、订单落库、超时释放
A（行动）：
   1. 入口用幂等框架挡住重复提交（注解 + AOP + Redisson 锁 / Redis 状态机）
   2. 余票在一个车次维度上做成 Hash 矩阵（field = 始发_到达_座位类型），
      下单用 Lua 一次扣减途经的所有区间，保证"检查+扣减"原子
   3. 座位落在 MySQL（t_seat），锁座是带条件的 UPDATE——座位是业务实体，
      要能被订单引用、要能审计，所以没有塞进 Redis 位图
   4. 订单号尾部拼 userId%1000000 做基因，2 库 32 表复合分片，
      目标两种查法都单表命中（并知道两条 hash 分支要统一才严格成立）
   5. 超时关单用 RocketMQ 延时消息，支付/关单竞态用状态机 CAS 解决
R（结果）：能说清每层的**收益和代价**（如 Lua 批量扣减保证原子但脚本难维护；
          基因法方便双维度查询但要牺牲尾部语义；binlog 同步最终一致但有延迟）
```

**⚠️ 面试红线**：不要说"我做了 12306 项目"就结束，也不要把教程里的方案说成自己原创。**说"我研究了它的设计，并且自己动手验证了 X"** 完全不失分，反而显得诚实。

## 六、怎么跑起来

1. 读[官方文档站](https://nageoffer.com/12306) 的"项目依赖中间件环境搭建"（Nacos / Redis / RocketMQ / MySQL）
2. 至少启动 `gateway-service` + `user-service` + `ticket-service`，走通一次查票
3. **重点不是跑通，是打断点**：在 `takeTokenFromBucket`、`SeatServiceImpl.lockSeat`、`DelayCloseOrderConsumer.onMessage` 三处各打一个断点，亲眼看数据流

> 只想学架构、不想装中间件也完全可以——四篇深挖篇都是"读代码 + 画链路"，不依赖运行环境。

## 七、关联理论

- [Spring Cloud 微服务](/service/java/spring-cloud) — 注册中心、网关、Feign
- [API 网关深入](/service/java/spring-cloud-gateway) — 网关的路由/鉴权/限流
- [分布式基础](/service/common/distributed-basics) — CAP、分布式事务方案对比
- [消息队列](/service/common/mq-intro) — 不丢/不重/顺序、延时消息
- [Redis 入门](/service/common/redis-intro) — Lua、位图、令牌桶、分布式锁
- [并发与锁](/service/common/concurrency-locks) — 乐观/悲观、Redisson 看门狗

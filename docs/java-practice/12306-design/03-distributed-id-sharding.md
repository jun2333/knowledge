# 12306 分布式 ID 与分库分表（基因法）

> **定位**：订单服务的两块基石。面试"分库分表后 ID 怎么办、怎么查"常连着问，能把这套讲圆，直接区分出"跟教程做过"和"想过为什么"。
>
> **代码位置**：`frameworks/distributedid`、`services/order-service`（`OrderIdGeneratorManager`、`dao/algorithm`、`shardingsphere-config.yaml`）
>
> ⚠️ 本篇区分了「框架里的通用方案」和「订单服务实际用的方案」——两者不一样，混讲会被追问穿。

## 一、为什么自增主键不够用

| 约束 | 自增的问题 |
|------|-----------|
| 分库分表 | 各库各表分别自增 → 订单号重复 |
| 不可猜测 | 自增可遍历（拿到 1001 猜 1002），订单号还会泄露单量 |
| 生成性能 | 依赖 DB，成为写热点 |
| 排序性 | UUID 无序 → B+ 树随机插入 → 页分裂 |

所以需要：**全局唯一 + 趋势递增 + 不依赖中心节点 + 可反解**。

## 二、雪花算法：64 位怎么切

```
0 | 41 位时间戳(ms) | 5 位 dataCenterId | 5 位 workerId | 12 位序列号
↑      ~69 年          0~31               0~31            0~4095/ms
符号位
```

- 每毫秒每节点最多 **4096** 个（单节点理论 400 万/秒）
- **趋势递增**：高位是时间 → 按 ID 排序≈按时间排序 → B+ 树友好
- 时钟回拨必须处理：本项目**直接抛异常拒绝**（`Clock moved backwards`），比"等待回拨"更安全，上层重试即可

## 三、面试真正的追问点：10 位机器号从哪来

雪花最容易翻车的是**分配机器号**——两台机器拿到同一个 `workerId` 就会生成重复 ID，而且低峰期发现不了。

项目用模板方法在启动时注入（`AbstractWorkIdChooseTemplate.chooseAndInit()`）：

| 实现 | 做法 | 特点 |
|------|------|------|
| **LocalRedisWorkIdChoose** | 跑 Lua，对 Hash `snowflake_work_id_key` 做**递增分配**（workId 到 31 进位 dataCenterId，两者都到 31 归零循环） | 多实例不撞号；强依赖 Redis |
| **RandomWorkIdChoose** | `workId` / `dataCenterId` 各在 0~31 随机 | 零依赖；节点多时有冲突概率（生日悖论） |

**自动装配条件是"有没有配 Redis"**：有 `spring.data.redis.host` 就用 LocalRedis 版，否则退回随机版——这就是 `@Conditional` 的典型用法。

**一道开放的追问**：如果实例数到 50+，随机策略的碰撞概率就不能忽略了。要嘛扩位宽（牺牲序列位），要嘛换成"号段/租约"方案（美团 Leaf 的 ZooKeeper 顺序节点、百度的号段模式）。**能说出"为什么 5+5 位不够用"就够高级了。**

## 四、订单号实际是怎么生成的（和框架的通用方案不同）

### 框架层：带"基因位"的 ServiceIdGenerator

```
DefaultServiceIdGenerator.nextId(serviceId)
   = 雪花 ID | (|hash(serviceId)| % 2^4)
     ↑ 低 4 bit 当"业务基因"，序列位从 12 压缩到 8
```

`IdGeneratorManager` 按资源名注册生成器，业务可以按服务取不同的号段。**这是"一个框架支持多业务 ID"的通用做法**。

### 订单服务：更直接的字符串拼接

```java
// OrderIdGeneratorManager
generateId() = DistributedIdGenerator.generateId() + (userId % 1000000)
```

```java
// DistributedIdGenerator（简化雪花）
timestamp(自 2021-01-01) << 12 | nodeId(5 bit) << 7 | sequence(7 bit)
// nodeId 由 Redis 自增 0~32 分配，sequence 7 位 → 每毫秒 128 个
```

**注意三件事**：

1. 订单号的"用户基因"是**字符串拼接**，不是位运算腾挪——所以雪花部分的序列位没被压缩（还是有自己的编码空间）
2. 拼接结果是 `13~15 位数字 + 1~6 位用户尾数`，长度不固定（`userId % 1000000` 会丢前导零）——**这会影响"订单号定长"的假设**，如果有按长度校验的逻辑要注意
3. `nodeId` 走 Redis 自增，和框架的 `workId/dataCenterId` 是两套机制——**同一个项目里并存两套 ID 生成器，是真实工程常态，不是设计缺陷**

## 五、分库分表：2 库 × 32 表

```yaml
# shardingsphere-config.yaml
t_order:
  actualDataNodes: ds_${0..1}.t_order_${0..31}          # 64 个分片
  databaseStrategy:
    complex:
      shardingColumns: user_id, order_sn                # 复合分片键
      shardingAlgorithmName: order_database_complex_mod
  tableStrategy:
    complex:
      shardingColumns: user_id, order_sn
      shardingAlgorithmName: order_table_complex_mod
```

**为什么用 `complex`（复合）而不是 `standard`（单键）**：因为订单有两种查法——"我的订单"（按 `user_id`）和"客服查单"（按 `order_sn`）。单键分片必然有一种要全路由。

```java
// OrderCommonDataBaseComplexAlgorithm（简化）
if (有 user_id)      分片 = hash(user_id 末 6 位) % 32
else if (有 order_sn) 分片 = hash(order_sn 末 6 位) % 32

库 = 分片值 / 16      // 0~15 → ds_0，16~31 → ds_1
表 = 分片值 % 16
```

## 六、基因法：设计意图与一个真实的坑

### 意图

让订单号尾部带上 `user_id` 的尾部，这样"按单号查"也能算出和"按用户查"相同的分片：

```
user_id = 1000123456
                └─ 尾 6 位 = 123456 ─┐
                                     ├─ 应该落到同一分片
order_sn = 1834...123456 ────────────┘
```

**收益**：不带 `user_id` 也能单表定位，避免 64 个分片全路由（分库分表最常见的性能事故）。

### 坑：两条分支的 hash 函数可能不等价

```java
if (comparable instanceof String)  hash(actualUserId.substring(len-6, len))   // String.hashCode
else                               hash((Long) comparable % 1000000)          // Long.hashCode
...
// order_sn 分支（永远是 String）
hash(actualOrderSn.substring(len-6, len))                                     // String.hashCode
```

**`String.hashCode("123456")` ≠ `Long.hashCode(123456)`**，所以：

- 如果 `user_id` 传进来是 **String** → 两边都走 `String.hashCode` → 基因法成立 ✅
- 如果 `user_id` 是 **Long**（`user_id` 列通常是 bigint，实体一般是 `Long`）→ 一边数值、一边字符串 → **mod 32 结果可能不同，单号路由不一定落到用户所在的那一片**

**这不是"项目有 bug"的指控，而是读源码能发现的真实细节**。面试如果被追问"基因法一定能定位到同一片吗"，正确答法是：

> 设计意图是尾部带基因，但**前缀 hash 函数必须一致**才会严格成立：一个走 `Long.hashCode`、一个走 `String.hashCode` 就不等价。所以要么统一转字符串再 hash，要么统一按数值取模。这也是我读源码时发现的、值得改成 `String.valueOf(userId % 1000000)` 的地方。

**能指出这一点，比背"我们用了基因法"强得多**——面试官要的就是这种"想清楚了"的证据。

### 其他细节

- `t_order_item_passenger` 按 `id_card` 标准分片——**一张表一个分片键，别硬套**
- 尾 6 位决定了"能区分的用户数"（百万级均匀打散）；用户量再大要加宽
- 尾数丢失前导零的问题见第四节

## 七、分库分表之后，你得接受这些

| 问题 | 现实 |
|------|------|
| 跨分片 join | 基本别想，改"应用层两次查询 + 内存拼装"或冗余字段 |
| 跨分片分页/排序 | `ORDER BY + LIMIT` 要归并，深分页更痛 |
| 跨分片聚合 | `COUNT/SUM` 内存归并，量大上 ES/宽表 |
| 分布式事务 | 单库事务没了 → 最终一致（见[延迟关单](/java-practice/12306-design/04-delayed-close-order)） |
| 扩容 | 取模分片扩不了容；成倍扩容（32→64）只需搬一半 |

**加分判断**：分片数不是越多越好。2×32 是"够用 + 扩容只搬一半 + 单表数据量可控"的折中，不是拍脑袋。

## 八、面试怎么讲（30 秒版）

> 订单 ID 是雪花：41 位时间 + 5 位节点 + 7 位序列，节点号启动时从 Redis 自增分配，避免两台机器撞号——这是雪花最常出线上事故的点。订单号还在尾部拼了 `userId % 1000000` 作为"用户基因"。
> 订单表分 2 库 32 表，用 ShardingSphere 的复合分片键 `user_id + order_sn`：有用户 ID 按用户尾 6 位路由，只有单号就按单号尾 6 位路由，目标是两种查法都能单表命中，避免全路由。
> **这里有个值得说的细节**：基因法要成立，两条分支的 hash 必须一致，但代码里一个走 `Long.hashCode` 一个走 `String.hashCode`，严格说并不等价——统一转成字符串才是对的。我读源码时才发现这点。

## 九、自己动手

1. 用 `SnowflakeIdInfo` 反解一个 ID，验证 `timestamp / workerId / dataCenterId / sequence`
2. 在 jshell 里跑 `((Long)123456L).hashCode() % 32` 和 `"123456".hashCode() % 32`，亲眼看到不相等
3. 执行一条不带 `user_id`/`order_sn` 的查询，看 ShardingSphere 日志里的**全路由（64 条 SQL）**，体会分片键选错的代价
4. 把 `RandomWorkIdChoose` 的随机范围改成 0~3，并发压测看能否撞出重复 ID

## 延伸阅读

- [延迟关单](/java-practice/12306-design/04-delayed-close-order) - 分片后跨服务的最终一致
- [余票与选座](/java-practice/12306-design/02-seat-and-ticket) - 下单前的库存校验
- [MySQL 进阶](/service/common/mysql-advanced) - 分库分表与索引、深分页
- [分布式基础](/service/common/distributed-basics) - 雪花、CAP、分布式事务全景

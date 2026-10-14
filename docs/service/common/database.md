---
title: 数据库基础
date: 2026-07-30
---

# 数据库基础

数据库是后端开发的核心。前端转全栈，数据库是最需要补齐的知识。本文覆盖关系型数据库、NoSQL、缓存和 ORM。

## 为什么前端需要学数据库

```mermaid
graph LR
    A[用户请求] --> B[后端服务]
    B --> C[数据库]
    C --> D[返回数据]
    D --> B --> E[响应给前端]
```

前端处理的是"展示逻辑"，后端处理的是"数据逻辑"。不理解数据库，就无法理解后端在做什么。

## 关系型数据库（SQL）

以 MySQL / PostgreSQL 为代表，数据以**表**的形式组织，行和列的结构严格。

### 核心概念

| 概念 | 说明 |
|------|------|
| **表（Table）** | 数据的容器，类似 JS 中的数组 |
| **行（Row）** | 一条记录，类似数组中的一个对象 |
| **列（Column）** | 一个字段，类似对象的属性 |
| **主键（Primary Key）** | 唯一标识一行，通常用自增 ID 或 UUID |
| **外键（Foreign Key）** | 关联另一张表的主键，建立表间关系 |
| **索引（Index）** | 加速查询的数据结构，类似书的目录 |

### 常用数据类型怎么选

| 场景 | 推荐 | 说明 |
|------|------|------|
| 定长字符串（手机号、身份证、MD5） | `CHAR(n)` | 定长，存取快；不足会补空格 |
| 变长字符串（用户名、邮箱、地址） | `VARCHAR(n)` | 按实际长度存，省空间；n 按业务上限给，别一律 255 |
| 超长文本（文章、JSON） | `TEXT` / `JSON` | 不适合建索引（或只能前缀索引） |
| 整数（ID、数量） | `INT` / `BIGINT` | 主键优先 `BIGINT`（防 ID 耗尽） |
| **金额 / 精确小数** | **`DECIMAL(m,n)`** | **绝不用 `FLOAT`/`DOUBLE`**——浮点数有精度误差，`0.1 + 0.2 ≠ 0.3` |
| 时间 | `DATETIME` / `TIMESTAMP` | 见下表对比 |
| 布尔 | `TINYINT(1)` | MySQL 没有真正的 bool，用 0/1 表示 |

**`DATETIME` vs `TIMESTAMP`：**

| | `DATETIME` | `TIMESTAMP` |
|---|---|---|
| 范围 | 1000 ~ 9999 年 | 1970 ~ 2038 年（**2038 问题**） |
| 时区 | **不随时区变**（存什么读什么） | **随会话时区转换**（存 UTC，读时转换） |
| 空间 | 8 字节 | 4 字节 |
| 建议 | 业务时间字段优先用它（直观、无 2038 限制） | 需要自动时区转换时用 |

> **前端类比**：`DECIMAL` 像"用字符串精确存数字"（准，稍慢），`FLOAT` 像 JS 的 `number`（快，但精度不可靠）——所以**钱必须用 `DECIMAL`**。

### 基本 SQL 语法

以下语法在 MySQL、PostgreSQL、SQLite 中通用，学会这些能覆盖大部分业务场景。

#### 增删改查（CRUD）

```sql
-- 创建表
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,  -- PostgreSQL 用 SERIAL 或 GENERATED ALWAYS AS IDENTITY
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 增
INSERT INTO users (username, email, password_hash)
VALUES ('alice', 'alice@example.com', 'hashed_pwd');

-- 批量插入
INSERT INTO users (username, email, password_hash)
VALUES ('bob', 'bob@example.com', 'hash1'),
       ('charlie', 'charlie@example.com', 'hash2');

-- 查
SELECT * FROM users WHERE id = 1;
SELECT username, email FROM users WHERE created_at > '2026-01-01';

-- 改
UPDATE users SET email = 'new@example.com' WHERE id = 1;

-- 删
DELETE FROM users WHERE id = 1;
```

**三种"删除"的区别（面试常考）：**

| | `DELETE` | `TRUNCATE` | `DROP` |
|---|---|---|---|
| 删除什么 | 符合条件的**行** | **整表数据**（保留表结构） | **整张表**（结构和数据都没了） |
| 能否带 `WHERE` | ✅ | ❌ | ❌ |
| 能否回滚 | ✅（事务内） | ❌（隐式提交，属 DDL） | ❌ |
| 自增 ID | 不重置（继续递增） | **重置为 1** | — |
| 速度 | 慢（逐行删 + 写 undo/redo） | 快（直接重建数据页） | 快 |
| 触发器 | 会触发 | 不触发 | 不触发 |

> 记忆：`DELETE` 是 DML（可回滚、可带条件）；`TRUNCATE` / `DROP` 是 DDL（不可回滚）。

#### 条件与排序

```sql
-- 多条件
SELECT * FROM users WHERE status = 'active' AND role = 'admin';
SELECT * FROM users WHERE role IN ('admin', 'editor');
SELECT * FROM users WHERE username LIKE '%alice%';  -- 模糊匹配

-- 排序 + 分页
SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 20;
-- 第 3 页，每页 10 条（OFFSET = (页码-1) * 每页数量）

-- 去重
SELECT DISTINCT role FROM users;
```

#### 聚合与分组

```sql
-- 聚合函数
SELECT COUNT(*) AS total FROM users;              -- 总数
SELECT AVG(age) AS avg_age FROM users;            -- 平均值
SELECT MAX(created_at) AS latest FROM users;      -- 最大值
SELECT SUM(balance) AS total_balance FROM accounts; -- 求和

-- 分组 + 过滤
SELECT role, COUNT(*) AS count
FROM users
WHERE status = 'active'        -- 先过滤行
GROUP BY role                  -- 再分组
HAVING COUNT(*) > 5            -- 分组后再过滤（WHERE 不能用于聚合结果）
ORDER BY count DESC;
```

#### 子查询

```sql
-- WHERE 中的子查询
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE amount > 1000);

-- FROM 中的子查询（当临时表用）
SELECT role, avg_age FROM (
  SELECT role, AVG(age) AS avg_age FROM users GROUP BY role
) AS subquery
WHERE avg_age > 25;
```

#### NULL 的坑（高频）

```sql
-- ① = NULL 永远查不到东西,要用 IS NULL
SELECT * FROM users WHERE email = NULL;      -- ❌ 结果永远为空
SELECT * FROM users WHERE email IS NULL;     -- ✅

-- ② NULL 参与运算 / 聚合会被忽略
SELECT AVG(age) FROM users;    -- 跳过 age 为 NULL 的行再平均
SELECT 1 + NULL;               -- NULL
SELECT CONCAT('a', NULL);      -- NULL(字符串拼接同样会"传染")

-- ③ COUNT 的三种写法结果可能不同
SELECT COUNT(*)     FROM users;   -- 所有行
SELECT COUNT(1)     FROM users;   -- 所有行(与 COUNT(*) 等价)
SELECT COUNT(email) FROM users;   -- 只统计 email 非 NULL 的行 ← 关键区别

-- ④ 排序:MySQL 中 NULL 最小,ASC 时排最前
SELECT * FROM users ORDER BY age ASC;

-- ⑤ 唯一索引允许多个 NULL(但空字符串只能有一个)
```

| 要点 | 说明 |
|------|------|
| 判断 | 只能用 `IS NULL` / `IS NOT NULL`，不能用 `=` |
| 聚合 | `SUM/AVG/MAX/MIN/COUNT(col)` 都会**跳过 NULL** |
| 函数 | 大部分函数遇 NULL 返回 NULL，可用 `IFNULL(col, 0)` / `COALESCE(a, b)` 兜底 |
| 索引 | `WHERE col IS NULL` 一般能走索引；`IS NOT NULL` 常常不走 |
| 设计建议 | 业务字段尽量 `NOT NULL DEFAULT ''` / `0`，少用 NULL（三值逻辑容易踩坑） |

#### MySQL vs PostgreSQL 常见差异

大部分基础语法完全一样，差异主要在以下场景：

| 功能 | MySQL | PostgreSQL |
|------|-------|------------|
| 自增主键 | `AUTO_INCREMENT` | `SERIAL` 或 `GENERATED ALWAYS AS IDENTITY` |
| 字符串拼接 | `CONCAT(a, b)` | `a \|\| b` |
| 日期格式化 | `DATE_FORMAT(now(), '%Y-%m-%d')` | `TO_CHAR(now(), 'YYYY-MM-DD')` |
| 当前时间 | `NOW()` | `NOW()`（一样） |
| 分页 | `LIMIT 10 OFFSET 20` | `LIMIT 10 OFFSET 20`（一样） |
| 类型转换 | `CAST(val AS UNSIGNED)` | `val::integer` |
| JSON 查询 | `JSON_EXTRACT(data, '$.name')` | `data->>'name'` |

**实际建议：** 先学通用语法，遇到差异查一下目标数据库的写法就行，10 分钟能上手。大部分项目用 ORM 后这些差异也被屏蔽了。

#### UNION vs UNION ALL

```sql
-- 合并两个查询的结果(列数、类型必须一致)
SELECT name FROM users
UNION
SELECT name FROM admins;       -- 去重(隐式排序,慢)

SELECT name FROM users
UNION ALL
SELECT name FROM admins;       -- 不去重(直接拼接,快)
```

| | `UNION` | `UNION ALL` |
|---|---|---|
| 去重 | ✅ 会去重 | ❌ 不去重 |
| 性能 | 慢（去重可能引入临时表 + 排序） | **快**（直接追加） |
| 何时用 | 结果必须唯一 | 确定无重复、或允许重复时（**默认优先用它**） |

> 面试问"选哪个"——**没有去重需求就用 `UNION ALL`**。
> 另外：`UNION` 的结果列名取**第一个查询**的列名。

### 表关系设计

```mermaid
erDiagram
    users ||--o{ posts : "发布"
    users ||--o{ comments : "评论"
    posts ||--o{ comments : "包含"
    posts ||--o{ tags : "标签"

    users {
      int id PK
      varchar username
      varchar email
    }

    posts {
      int id PK
      int user_id FK
      varchar title
      text content
    }

    comments {
      int id PK
      int post_id FK
      int user_id FK
      text content
    }

    tags {
      int id PK
      varchar name
    }
```

### JOIN 查询

```sql
-- INNER JOIN：只返回两张表都能匹配上的行
-- 如果用户没有文章，这行不会出现
SELECT u.username, p.title, p.created_at
FROM users u
INNER JOIN posts p ON u.id = p.user_id
WHERE u.id = 1;

-- LEFT JOIN：返回左表所有行，右表匹配不上的字段为 NULL
-- 即使没有文章也会返回用户（title 为 NULL）
SELECT u.username, p.title
FROM users u
LEFT JOIN posts p ON u.id = p.user_id;
```

| JOIN 类型 | 效果 | 使用频率 |
|-----------|------|----------|
| **INNER JOIN** | 只保留两边都能匹配的行 | 最高 |
| **LEFT JOIN** | 保留左表所有行，右表没匹配的填 NULL | 高 |
| **RIGHT JOIN** | 保留右表所有行，左表没匹配的填 NULL | 少用（用 LEFT JOIN 翻转表顺序可替代） |
| **FULL OUTER JOIN** | 保留两边所有行，没匹配的填 NULL | 少见 |
| **CROSS JOIN** | 笛卡尔积，左表每行 × 右表每行 | 特殊场景 |
| **SELF JOIN** | 表自己和自己 JOIN（如查员工-上级关系） | 特定场景 |

### 索引

索引是查询性能的关键。没有索引，数据库需要逐行扫描（全表扫描）；有了索引，可以快速定位。

**它怎么工作的**：索引是一棵排好序的 B+ 树（结构细节见 [MySQL 进阶](/service/common/mysql-advanced)）。查询时数据库从树根开始逐层比较，3~4 次磁盘读就能在千万行里定位到目标——相当于查字典先翻拼音目录，而不是从第一页翻到最后一页。

```sql
-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- 联合索引（注意列的顺序）
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);

-- 删除索引
DROP INDEX idx_users_email ON users;
```

**创建只是第一步——查询条件匹配上才会用**。判断一条查询有没有用上索引，`EXPLAIN` 一下（读法见 [MySQL 进阶](/service/common/mysql-advanced)）：

```sql
EXPLAIN SELECT * FROM users WHERE email = 'a@b.com';
-- key 列出现 idx_users_email = 用上了；key = null = 全表扫描，白建了
```

**索引原则：**
- 在 `WHERE`、`JOIN`、`ORDER BY` 中频繁使用的列上加索引
- 不要给所有列都加索引——索引会占用空间，降低写入速度
- 联合索引遵循**最左前缀原则**：`(user_id, created_at)` 可以加速 `WHERE user_id = 1` 和 `WHERE user_id = 1 AND created_at > '2026-01-01'`，但不能加速 `WHERE created_at > '2026-01-01'`

### 事务

事务保证一组操作要么全部成功，要么全部失败（ACID 特性）。

> **C（一致性）为什么拿"总金额不变"举例**：一致性不是某种独立技术，而是事务要达成的**业务约束**——"A + B 的总和恒定"就是转账业务的约束。没有事务保护时，可能扣了 A 的款系统就崩了、B 没收到，总和凭空少了 100 元——数据进入了业务上非法的状态。原子性（要么全做要么全不做）和隔离性（并发下不出错）共同保证了这个约束不被破坏。一句话：**A/I/D 是手段，C 是目的**。

| 特性 | 含义 | 例子 |
|------|------|------|
| **A**tomicity 原子性 | 一组操作要么全成功，要么全失败 | 转账：扣款和加款必须同时完成，不能只扣不加 |
| **C**onsistency 一致性 | 事务前后数据满足业务规则（约束不被破坏） | 转账前后，两个账户的总金额不变——只扣了 A 没加 B，总和就变了，这就是被破坏的一致性 |
| **I**solation 隔离性 | 并发事务互不干扰 | 两个事务同时转账，结果和串行执行一样 |
| **D**urability 持久性 | 事务提交后数据永久保存 | 提交后即使立刻断电，数据也不会丢 |

```sql
-- 转账示例：A 给 B 转 100 元
BEGIN TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;

-- 如果上面任何一步失败，回滚
ROLLBACK;

-- 如果都成功，提交
COMMIT;
```

**典型场景：** 订单创建（扣库存 + 生成订单 + 扣余额）必须在一个事务中完成。

### 锁

事务保证原子性，锁解决的是**并发修改**问题——防止两个事务同时改同一行数据导致结果错误。

**自动加锁：** 事务中的写操作（`UPDATE`/`INSERT`/`DELETE`）数据库会自动加排他锁，不需要手动处理。

**需要手动加锁的场景：** 读了数据之后要基于这个值做修改，必须在读的时候就加锁，否则其他事务可能在你"读"和"写"之间改了数据。

```
典型坑（读时不加锁）：
1. SELECT balance          → 读到 100
2. （此时另一个事务把余额改成了 50）
3. UPDATE balance = 100 - 30 → 写入 70（基于过期数据，错了）

正确做法（读时加锁）：
1. SELECT balance FOR UPDATE → 读到 100，加锁
2. （另一个事务想改这行 → 被阻塞，等你释放锁）
3. UPDATE balance = 100 - 30 → 写入 70（正确）
```

| 锁类型 | 效果 | 用法 |
|--------|------|------|
| **共享锁（读锁）** | 多个事务可以同时读，但不能写 | `SELECT ... LOCK IN SHARE MODE` |
| **排他锁（写锁）** | 只有一个事务能读或写，其他全部阻塞 | `SELECT ... FOR UPDATE` |

**实际应用：**

```sql
-- 转账场景：用排他锁防止并发修改
BEGIN TRANSACTION;

-- 加锁读取（其他事务此时无法修改这两行）
SELECT balance FROM accounts WHERE user_id = 1 FOR UPDATE;
SELECT balance FROM accounts WHERE user_id = 2 FOR UPDATE;

UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;

COMMIT;  -- 释放锁
```

不用 `FOR UPDATE` 的风险：两个事务同时读到余额 100，各自扣款后都写入，最终余额只扣了一次。

## NoSQL：MongoDB

MongoDB 是文档型数据库，数据以 JSON 格式的文档存储，无需预定义表结构。

### 核心概念对比

| SQL | MongoDB |
|-----|---------|
| 数据库（Database） | 数据库（Database） |
| 表（Table） | 集合（Collection） |
| 行（Row） | 文档（Document） |
| 列（Column） | 字段（Field） |
| JOIN | `$lookup` / 应用层关联 |

### 基本操作

```javascript
// 插入文档
db.users.insertOne({
  username: 'alice',
  email: 'alice@example.com',
  age: 25,
  tags: ['developer', 'nodejs'],
  createdAt: new Date()
})

// 查询
db.users.find({ age: { $gte: 18 } })
db.users.findOne({ username: 'alice' })

// 更新
db.users.updateOne(
  { username: 'alice' },
  { $set: { age: 26 }, $push: { tags: 'typescript' } }
)

// 删除
db.users.deleteOne({ username: 'alice' })
```

### 适用场景

- **适合 MongoDB：** 数据结构不固定、快速迭代、内容管理系统、日志存储
- **适合 SQL：** 数据关系复杂、需要事务、金融/订单系统、数据一致性要求高

## 缓存：Redis

Redis 是内存中的键值存储，读写速度极快（微秒级），常用于缓存和会话存储。

### 数据类型

```bash
# 字符串（最常用）
SET user:1:name "alice"
GET user:1:name

# 哈希（存储对象）
HSET user:1 username "alice" email "alice@example.com" age 25
HGETALL user:1

# 列表（队列）
LPUSH tasks "task-1" "task-2"
RPOP tasks

# 集合（去重）
SADD tags:post:1 "javascript" "nodejs"
SMEMBERS tags:post:1

# 有序集合 zset（排行榜）：每个成员自带一个分数（score），Redis 按分数排序维护
# ZADD key score member —— 加人时必须带分数（alice 100 分、bob 90 分）
ZADD leaderboard 100 "alice" 90 "bob"

# ZREVRANGE key 起 止 [WITHSCORES]：按分数从高到低取前 10 名（0 9）
# WITHSCORES = 返回结果里连分数一起给（排行榜页面前端要展示"100 分"）
# 不加 WITHSCORES 只返回成员名；加了就是 成员、分数 交替返回
ZREVRANGE leaderboard 0 9 WITHSCORES
# → 1) "alice"  2) "100"  3) "bob"  4) "90"
```

> **WITHSCORES 是个"返回选项"，不是 zset 的固定结构**：分数是 zset 存储结构自带的（所以 `ZADD` 时必须给），而 `WITHSCORES` 只决定**返回时带不带它**——类似 SQL 里 `SELECT name` 和 `SELECT name, score` 的区别，要展示几列就查几列。

### Key 的组织方式

Redis 没有命名空间、没有表、没有模块的概念，所有数据扁平地存在一个巨大的 key-value 字典里。`user:1:name` 中的 `:` 只是**命名约定**，Redis 本身不识别层级，它就是一个普通字符串。

```
Redis 的视角：
{
  "user:1:name": "alice",
  "user:1:email": "alice@example.com",
  "post:1:title": "Hello",
  "session:abc123": "{...}",
  "cache:homepage": "{...}",
}
```

**靠 key 前缀区分业务**是最常用的组织方式：`user:`、`post:`、`cache:`、`session:`。很多 Redis 可视化工具会识别 `:` 并展示成树形结构，但这只是 UI 效果。

如果需要更彻底的隔离，可以用 `SELECT` 切换数据库（默认 16 个库），但**集群模式不支持**，生产环境不推荐。

### 缓存策略

```javascript
const Redis = require('ioredis')
const redis = new Redis()

async function getUser(id) {
  // 1. 先查缓存
  const cached = await redis.get(`user:${id}`)
  if (cached) {
    return JSON.parse(cached)
  }

  // 2. 缓存未命中，查数据库
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id])

  // 3. 写入缓存，设置过期时间（避免缓存无限增长）
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user))

  return user
}
```

**缓存三大问题：**

### 缓存穿透

查询的数据**缓存和数据库都没有**，每次请求都穿透到数据库。

```
场景：恶意用户疯狂请求不存在的 ID（user:1 到 user:100000）
结果：100000 次请求全部打到数据库

正常情况：10000 个请求查同一个 key → 1 次查库 + 9999 次走缓存
穿透情况：10000 个请求查不存在的 key → 10000 次全部查库
```

**解决方案：**

```javascript
// 方案 1：缓存空值（简单）
if (!user) {
  await redis.setex(`user:${id}`, 300, 'NULL')  // 缓存 5 分钟
  return null
}
// 同一个不存在的 ID，5 分钟内只查一次数据库

// 方案 2：布隆过滤器（高效）
// 原理：一个 bit 数组 + 多个哈希函数。加元素时把几个哈希位置全部置 1；
// 查询时看这几个位——全是 1 说"可能存在"，只要有一个是 0 就说"一定不存在"。
// 特点：不会漏报（说不存在的铁定不存在），但可能误报（说存在的其实没有）——
// 对缓存穿透场景正好：宁可白查一次库，也绝不能把真实存在的数据挡在外面
```

**Redis 实践**（Redis 4.0+，加载 RedisBloom 模块后）：

```bash
BF.ADD user:ids 1001          # 启动时把所有有效 ID 灌进去
BF.EXISTS user:ids 999999     # 请求来了先问它
# 返回 0 = 一定不存在 → 直接返回 null，缓存和数据库都不碰
# 返回 1 = 可能存在 → 继续查缓存/库（小概率白跑一趟，可接受）
```

**Java 实践**（Guava，过滤器放进程内，适合单体/启动预热）：

```java
BloomFilter<Integer> filter = BloomFilter.create(
    Funnels.integerFunnel(),
    1_000_000,    // expectedInsertions：预计灌入量
    0.01          // fpp：可接受的误判率（1%）
);
// 启动预热：把有效 ID 全集灌进去
userIds.forEach(filter::put);
// 查询前判断：
if (!filter.mightContain(id)) {
    return null;  // 一定不存在，直接挡掉
}
```

> **使用要点**：① 必须在启动时/预热时把**全集**灌进去才有意义；② 删除困难（多个元素共享 bit，清一位可能误伤别人），所以适合"ID 全集相对稳定"的场景；③ 容量和误判率要按预期数据量规划（灌爆了误判率飙升）。

### 缓存击穿

某个**热点 key 刚好过期**的瞬间，大量并发请求同时发现缓存没了，全部去查数据库。

```
场景：首页文章列表缓存过期（这个 key 每秒有 1000 次访问）
时刻 T：缓存过期
时刻 T+1ms：1000 个请求同时发现缓存为空 → 1000 个全部查数据库

和穿透的区别：穿透是"数据不存在"，击穿是"数据存在但缓存刚好过期"
```

**解决方案：**

```javascript
// 方案 1：互斥锁（只让一个请求查库，其他等待）
async function getHotData(key) {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  // 尝试获取分布式锁（SET NX = 只在 key 不存在时设置，设置成功 = 拿到锁）
  const lock = await redis.set(`lock:${key}`, '1', 'NX', 'EX', 10)
  if (!lock) {
    // 没抢到锁，等一会儿重试
    await sleep(100)
    return getHotData(key)
  }

  try {
    const data = await db.query('SELECT * FROM hot_data')
    await redis.setex(key, 3600, JSON.stringify(data))
    return data
  } finally {
    await redis.del(`lock:${key}`)  // 释放锁
  }
}

// 方案 2：永不过期 + 异步更新
// 缓存不设过期时间，用户请求永远能命中
// 后台定时任务（如每 5 分钟）主动查数据库更新缓存，保证数据新鲜度
// 这样就不会出现"缓存过期瞬间大量请求打到数据库"的问题
```

### 缓存雪崩

**大量 key 在同一时间过期**，缓存命中率骤降，数据库压力骤增。

```
场景：凌晨 0 点设置了 10 万个 key，过期时间都是 24 小时
第二天凌晨 0 点：10 万个 key 同时过期 → 数据库瞬间被打垮

和击穿的区别：击穿是"一个热点 key 过期"，雪崩是"大量 key 同时过期"
```

**解决方案：**

```javascript
// 给过期时间加随机值，避免同时过期
const baseTTL = 3600  // 基础 1 小时
const randomTTL = baseTTL + Math.floor(Math.random() * 600)  // 1h ~ 1h10m
await redis.setex(key, randomTTL, JSON.stringify(data))

// 或者：多级缓存（本地缓存 + Redis），Redis 挂了还有本地缓存兜底
```

### 三者对比

| 问题 | 原因 | 关键特征 | 解决方案 |
|------|------|----------|----------|
| **穿透** | 数据不存在 | 请求不存在的 key | 缓存空值、布隆过滤器 |
| **击穿** | 热点 key 过期 | 单个 key 过期瞬间并发 | 互斥锁、永不过期+异步更新 |
| **雪崩** | 大量 key 同时过期 | 大面积缓存失效 | 过期时间加随机值、多级缓存 |

## ORM：用 TypeScript 操作数据库

ORM（Object-Relational Mapping）让你用对象和类型安全的方式操作数据库，不用手写 SQL。

### Prisma 示例

```prisma
// schema.prisma — 定义数据模型
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
}
```

```typescript
// 使用 Prisma Client
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// 创建用户
const user = await prisma.user.create({
  data: {
    username: 'alice',
    email: 'alice@example.com',
  },
})

// 查询（带关联）
const usersWithPosts = await prisma.user.findMany({
  include: { posts: true },
  where: { createdAt: { gt: new Date('2026-01-01') } },
  take: 10,
  skip: 0,
  orderBy: { createdAt: 'desc' },
})

// 更新
await prisma.user.update({
  where: { id: 1 },
  data: { email: 'new@example.com' },
})

// 事务
await prisma.$transaction([
  prisma.user.update({ where: { id: 1 }, data: { balance: { decrement: 100 } } }),
  prisma.user.update({ where: { id: 2 }, data: { balance: { increment: 100 } } }),
])
```

### ORM vs 手写 SQL

| 维度 | ORM（Prisma） | 手写 SQL |
|------|---------------|----------|
| **类型安全** | 自动生成 TS 类型 | 需要手动维护 |
| **开发效率** | 高，链式 API | 低，需要写 SQL |
| **复杂查询** | 可能不够灵活 | 完全灵活 |
| **性能** | 可能有额外开销 | 可精确优化 |
| **学习成本** | 需学习 ORM API | 需学习 SQL |

**建议：** 大部分 CRUD 用 ORM，复杂报表或性能敏感场景用原生 SQL。

## 数据库选型指南

```mermaid
graph TD
    A[需要数据库] --> B{数据关系复杂?}
    B -->|是| C{需要强事务?}
    C -->|是| D[PostgreSQL / MySQL]
    C -->|否| E[MongoDB]
    B -->|否| F{数据结构固定?}
    F -->|是| D
    F -->|否| E
    D --> G{需要缓存加速?}
    E --> G
    G -->|是| H[加 Redis]
    G -->|否| I[不需要]
```

| 场景 | 推荐方案 |
|------|----------|
| 电商/金融/订单系统 | PostgreSQL + Redis |
| 内容管理/博客 | MongoDB 或 MySQL |
| 实时聊天/推送 | Redis + PostgreSQL |
| 快速原型/MVP | MongoDB（灵活，改结构方便） |
| 数据分析/报表 | PostgreSQL（强大的聚合能力） |

## 前端开发者常见误区

1. **"数据库就是存数据的地方"** — 数据库还负责数据一致性、并发控制、事务隔离
2. **"NoSQL 比 SQL 好"** — 没有绝对的好坏，只有适合的场景
3. **"ORM 可以完全替代 SQL"** — 复杂查询和性能优化仍然需要理解 SQL
4. **"索引越多越好"** — 索引加速读、拖慢写，需要权衡
5. **"不需要学数据库设计"** — 糟糕的表设计会导致后期无法维护

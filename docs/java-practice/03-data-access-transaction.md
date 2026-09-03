# 阶段 3：数据访问与事务

> **目标**：搞懂 MyBatis 怎么工作（接口 + XML + 动态代理）、Example 动态 SQL 怎么拼条件、事务怎么保证数据一致。
>
> **前置**：阶段 2 完成，已在商品模块见过 Mapper 的使用。

## 一、验收标准（做完自检）

- [ ] 能解释"为什么 Mapper 接口没有实现类也能被调用"（MyBatis 动态代理）
- [ ] 能看懂 `XxxExample` 的条件拼接逻辑（`createCriteria().andXxxEqualTo()`）
- [ ] 能解释 `@Transactional` 的边界（哪段代码在事务里、异常什么时候回滚）
- [ ] 完成动手任务 3（造一个回滚场景）并观察结果

## 二、MyBatis 是怎么工作的

核心一句话：**接口定义方法，XML 写 SQL，MyBatis 启动时用动态代理把接口和 XML 绑定，生成实现类**。

```java
// 1. Mapper 接口（mall-mbg，只声明方法）
public interface PmsProductMapper {
    List<PmsProduct> selectByExample(PmsProductExample example);  // 方法名要和 XML 的 id 一致
}

// 2. XML（同包路径下，写真正的 SQL）
// mall-mbg/src/main/resources/com/macro/mall/mapper/PmsProductMapper.xml
// <select id="selectByExample" parameterType="..." resultType="..."> SELECT ... WHERE ... LIMIT ... </select>

// 3. 使用（Controller/Service 里 @Autowired 直接注入）
@Autowired
private PmsProductMapper productMapper;
```

**关键认知**：
- Mapper 接口、model、XML 都由 **MyBatis Generator** 从数据库表自动生成（`mall-mbg/generatorConfig.xml` 配置），**不用手写**
- 接口方法名 ↔ XML `<select id>` 一一对应（namespace + id）
- 字段 ↔ 数据库列，映射规则在 XML 的 `resultMap` 里定义

## 三、Example 动态 SQL（MyBatis Generator 的特色）

业务里要按条件查，但条件不固定（有时按名字、有时按状态、有时都不传）——Example 就是干这个的：

```java
PmsProductExample example = new PmsProductExample();
PmsProductExample.Criteria criteria = example.createCriteria();
if (productQueryParam.getKeyword() != null) {
    criteria.andNameLike("%" + productQueryParam.getKeyword() + "%");  // where name like ?
}
if (productQueryParam.getPublishStatus() != null) {
    criteria.andPublishStatusEqualTo(productQueryParam.getPublishStatus());  // and publish_status = ?
}
// 只有传了的条件才会拼进 where —— 这就是"动态 SQL"
List<PmsProduct> list = productMapper.selectByExample(example);
```

**动手验证**：在 `PmsProductServiceImpl.list()` 打断点，分别带/不带 keyword 调 `GET /product/list`，观察 `example` 里 `criteria` 的条件数量变化，再对比 XML 里实际拼出的 SQL。

> 面试常问：MyBatis 动态 SQL 有哪些标签？答：`<if>`、`<where>`、`<foreach>`、`<set>`、`<choose>`。在 `PmsProductMapper.xml` 里搜 `<if>` 能看到实际用法。

### 3.1 条件类型对照表（五种情况一次看懂）

Example 的条件分四种类型（由你调用的方法决定），`condition` 是"**字段名 + 操作符**"（操作符跟随方法名，不只是等号）：

| Java 方法 | condition | 类型 | SQL 片段 |
|-----------|-----------|------|---------|
| `andUsernameEqualTo("admin")` | `username =` | singleValue | `username = ?` |
| `andEmailLike("%@qq.com")` | `email like` | singleValue | `email like ?` |
| `andLoginTimeIsNull()` | `login_time is null` | noValue | `login_time is null`（**没有 ?**） |
| `andCreateTimeBetween(a, b)` | `create_time between` | betweenValue | `create_time between ? and ?` |
| `andIdIn(Arrays.asList(1,2,3))` | `id in` | listValue | `id in (?, ?, ?)` |

**完整例子**（五种情况 + or 组一起看最终 SQL）：

```java
UmsAdminExample example = new UmsAdminExample();
UmsAdminExample.Criteria criteria = example.createCriteria();

criteria.andUsernameEqualTo("admin");                // ① 单值：=
criteria.andEmailLike("%@qq.com");                   // ② 单值：like
criteria.andLoginTimeIsNull();                       // ③ 无值：is null
criteria.andCreateTimeBetween(startDate, endDate);   // ④ 范围：between
criteria.andIdIn(Arrays.asList(1L, 2L, 3L));         // ⑤ 列表：in

example.or().andStatusEqualTo(0);                    // ⑥ 新组（or 连接）

adminMapper.selectByExample(example);
```

拼出来的 SQL：

```sql
SELECT id, username, password, icon, email, nick_name, note, create_time, login_time, status
FROM ums_admin
WHERE (username = ? AND email like ? AND login_time is null
       AND create_time between ? and ? AND id in (?, ?, ?))
   OR (status = ?)
```

**三层加工规律**：
- **组内**（`<foreach criteria>` + `<choose>`）：条件之间用 `and` 连接，按类型选拼接模板
- **组间**（`<foreach oredCriteria separator="or">`）：组和组之间用 `or` 连接
- **收尾**（`<where>` + `<trim>`）：补 `where` 关键字、包括号、去掉组内第一个 `and`

### 3.2 MyBatis 核心优势（面试谈资）

| 优势 | 说明 |
|------|------|
| **动态 SQL**（核心） | `<if>/<where>/<foreach>/<choose>` 让"条件不固定"的查询一个 SQL 通吃 |
| **SQL 完全可控** | 复杂 join、子查询直接写，不受 ORM 自动生成的限制 |
| **性能可调优** | SQL 自己写，慢查询能精确优化 |
| **批量操作高效** | `CASE WHEN + foreach` 一条 SQL 批量更新 |
| **复杂映射** | `resultMap` 支持一对多嵌套、自定义字段映射 |

> 面试一句话：MyBatis 的核心优势是 **SQL 可控 + 动态 SQL**。复杂查询、性能调优直接写 SQL；JPA 自动生成省事，但复杂场景难搞、SQL 不可控。

### 3.3 批量更新的三种方案（按场景选）

**核心判断**：能不能合并成一条 SQL，取决于"**新值是否可参数化**"（所有行用同一组值 → 可批量；每行值都不同 → 要逐行处理）。

| 方案 | 适用场景 | SQL / 网络往返 |
|------|---------|---------------|
| **一、`updateByExampleSelective`** | 所有行改成**同一个值**（批量上下架） | 1 条 |
| **二、CASE WHEN + foreach** | 值不同，但**改的字段固定**（批量改价） | 1 条 |
| **三、循环 / JDBC batch** | 每行**字段和值都不同** | N 条 / 1 次批量 |

#### 方案一：updateByExampleSelective（值相同，最简）

```java
// 批量上架：所有 id 商品的 publish_status 统一改成 1
PmsProduct record = new PmsProduct();
record.setPublishStatus(1);                       // record：只设要改的字段
PmsProductExample example = new PmsProductExample();
example.createCriteria().andIdIn(ids);            // example：WHERE id IN (...)
productMapper.updateByExampleSelective(record, example);
```

```sql
-- 生成：一条 SQL，所有命中的行统一 SET
UPDATE pms_product SET publish_status = 1 WHERE id IN (1, 2, 3)
```

> Selective 是关键：**只更新 record 非 null 字段**，不会把 null 覆盖到其他字段。批量改"同一个值"时用它最合适（mall 的 `updatePublishStatus` 就是）。

#### 方案二：CASE WHEN + foreach（值不同、字段固定）

**XML**（手写 DAO，如 `OmsOrderDao.xml`）：

```xml
<update id="delivery">
    UPDATE oms_order
    SET
    delivery_sn = CASE id
        <foreach collection="list" item="item">
            WHEN #{item.orderId} THEN #{item.deliverySn}
        </foreach>
    END,
    delivery_company = CASE id
        <foreach collection="list" item="item">
            WHEN #{item.orderId} THEN #{item.deliveryCompany}
        </foreach>
    END,
    delivery_time = CASE id
        <foreach collection="list" item="item">
            WHEN #{item.orderId} THEN now()
        </foreach>
    END
    WHERE id IN
    <foreach collection="list" item="item" open="(" separator="," close=")">
        #{item.orderId}
    </foreach>
</update>
```

**Java 接口**：`int delivery(@Param("list") List<OmsOrderDeliveryParam> list);`

**传入 2 条数据后生成的 SQL**：

```sql
UPDATE oms_order
SET delivery_sn = CASE id
    WHEN 1 THEN 'SF123'
    WHEN 2 THEN 'SF456'
    END,
    delivery_time = CASE id
    WHEN 1 THEN NOW()
    WHEN 2 THEN NOW()
    END
WHERE id IN (1, 2)
```

**机制**：`CASE id WHEN 值 THEN 结果 END` = 行间条件赋值（每行按 id 匹配取对应值）；`<foreach>` 循环生成每个 `WHEN`；`WHERE id IN` 限定更新范围。

**适用边界**：改的字段是**同一组**（都改 price，但值不同）才能用 CASE 合并。如果每个商品**改的字段都不一样**（1 改 price、2 改 stock），要多个 CASE 合并，复杂度飙升 → 不如方案三。

#### 方案三：循环 / JDBC batch（字段乱）

```java
// 每个商品改的字段/值都不同 → 循环（简单可靠，配 @Transactional）
for (PmsProduct p : list) {
    productMapper.updateByPrimaryKeySelective(p);   // 每个商品用自己的 record
}
```

**为什么循环慢**：每次 mapper 调用 = SQL 解析 + 建 statement + **一次网络往返** + 等返回。1 万条 = 1 万次网络往返，慢在网络 IO 和 statement 创建，不是真正执行。

**数据量大时用 JDBC 批处理（MyBatis ExecutorType.BATCH）**：攒批后一次网络往返发一坨，性能远优于逐条：

```java
// ① 必须用 BATCH 模式开 session（默认 SIMPLE 不攒批）
SqlSession sqlSession = sqlSessionFactory.openSession(ExecutorType.BATCH);
try {
    // ② mapper 必须从这个 session 拿（注入的 mapper 属于别的 session，不攒批）
    PmsProductMapper mapper = sqlSession.getMapper(PmsProductMapper.class);
    int i = 0;
    for (PmsProduct p : list) {
        mapper.updateByPrimaryKeySelective(p);   // 内部 addBatch：只攒参数，不真正执行
        if (++i % 1000 == 0) {
            sqlSession.flushStatements();        // ③ 攒够 1000 手动刷一次（才真正发到 MySQL）
        }
    }
    sqlSession.flushStatements();                // ④ 把最后没发的刷完
    sqlSession.commit();                         // ⑤ 提交事务
} finally {
    sqlSession.close();                          // ⑥ 必须关
}
```

**原理**：JDBC 的 `addBatch` 只把参数记在本地缓冲，`executeBatch`/`flushStatements` 才一次网络往返批量发给 MySQL——1 万条 = 10 次往返（每批 1000），不是 1 万次。

**BATCH 模式三个坑**：

| 坑 | 说明 |
|----|------|
| 必须手动 `flushStatements()` | BATCH 默认攒着不执行，攒太多占内存/超时，定期刷 |
| 返回值不可靠 | BATCH 下 update 返回条数不准（可能 -2），别依赖返回值判断 |
| 和 `@Transactional` 混用冲突 | `@Transactional` 用 Spring 管理的 session，`openSession(BATCH)` 是自开的 session，不在同一事务——BATCH 常用于独立批处理任务，自己 commit |

**可选加速**：JDBC url 加 `rewriteBatchedStatements=true`，MySQL 会把批里的多条 SQL 重写成一条多值语句，少解析几次。

#### 决策总结

```
值相同（批量上下架）        → 方案一（最简，一条 SQL）
值不同 + 字段固定（改价）   → 方案二（一条 SQL）
值不同 + 字段也乱           → 方案三（循环 + 事务，量大换 batch）
```

> 一句话：**批量更新的核心权衡 = 能不能把"每行的差异"参数化成一条 SQL**。能 → 方案一二；不能 → 循环/批处理。

## 四、事务（@Transactional）

### 4.1 事务在哪

`UmsAdminService` 接口的 `updateRole(Long adminId, List<Long> roleIds)` 方法上有 `@Transactional`（第 65 行）。

```java
@Transactional
int updateRole(Long adminId, List<Long> roleIds);
```

**它的逻辑**（看 `UmsAdminServiceImpl` 实现）：
1. 删除该用户所有角色关联（`DELETE FROM ums_admin_role_relation WHERE admin_id = ?`）
2. 逐个插入新角色关联（`INSERT INTO ums_admin_role_relation ...`）

这两步要么都成功，要么都失败回滚——**这就是事务的意义**：中间任何一步抛异常，前面的删除/插入全部撤销。

### 4.2 理解事务边界

- 事务**默认在方法调用前开启、方法正常结束提交、抛运行时异常回滚**
- 抛 `RuntimeException`（或子类）才回滚；抛受检异常默认不回滚（除非 `@Transactional(rollbackFor = Exception.class)`）
- 重要：事务基于 Spring AOP 代理。**同类内部调用 `this.method()` 不会走代理 → 事务失效**。这是经典面试题。

> mall 把 `@Transactional` 写在**接口**上。Spring 官方建议写在实现类/具体类上（避免代理问题），但 mall 在接口上写也能生效（因为默认 JDK 动态代理）。知道这个差异即可，不必纠结。

### 4.3 动手任务：造一个回滚

1. 打开 `UmsAdminServiceImpl.updateRole()` 的实现，在两次数据库操作**中间**加一行：
   ```java
   throw new RuntimeException("测试回滚");
   ```
2. 在 Swagger 调 `POST /admin/role/update`（传一个 adminId 和 roleIds）
3. 观察返回 500 + 错误信息
4. 查数据库：`SELECT * FROM ums_admin_role_relation WHERE admin_id = ?` → **之前的记录没有被删除**，证明事务回滚了
5. 撤销刚才加的异常代码，恢复原样

## 五、操作步骤小结（照做）

1. 在 `PmsProductServiceImpl.list()` 打断点，带/不带 keyword 调 list 接口，观察 Example 条件拼接
2. 打开 `PmsProductMapper.xml`，搜 `<if>` 和 `<foreach>`，看懂动态 SQL 写法
3. 完成 4.3 的回滚实验
4. 把 `updateRole` 的代码画成时序图（调用链 + 事务边界在哪）

## 六、关联理论

- [MyBatis-Plus 入门](/service/mybatis-plus) — mall 用原生 MyBatis，MP 是进阶写法
- [Spring 核心原理](/service/spring-principles) — AOP 是事务的底层，值得读
- [数据库基础](/service/database) / [MySQL 进阶](/service/mysql-advanced) — SQL、事务隔离级别

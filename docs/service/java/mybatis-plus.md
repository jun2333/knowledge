# MyBatis-Plus 入门

> **优先级：P1（国内企业高频）** — MyBatis-Plus 是国内 Java 后端的实际标准 ORM（使用率远超 JPA），面试中"你们项目用什么 ORM"十有八九是它。

::: tip 背景
承接 Spring Boot 篇。MyBatis-Plus = MyBatis（手写 SQL 的 ORM）+ 增强（CRUD 免写、分页、代码生成器）。对标你熟悉的 TypeORM，但哲学完全不同：**SQL 是一等公民**。
:::

## 和原生 MyBatis 的关系（先看这个，否则会懵）

这一块有三层，新手最容易混的是「MyBatis 不是靠 XML 写 SQL 吗，怎么现在一行 SQL 都没有」：

| 层 | 你写什么 | 谁生成 SQL |
|--|---------|-----------|
| ① JDBC | `Connection` / `PreparedStatement` / `ResultSet` 全套 | 你手写，还要自己遍历结果集 |
| ② MyBatis | **只写 SQL**（XML 或注解），参数映射和结果集映射它包了 | 你写 |
| ③ MyBatis-Plus | 大部分场景**连锁 SQL 都不写** | 它按实体自动生成 |

同一个「按 id 查用户」，三种写法对照：

```xml
<!-- ② MyBatis XML：resources/mapper/UserMapper.xml -->
<select id="findById" resultType="User">
    SELECT * FROM users WHERE id = #{id}
</select>
```

```java
// ② MyBatis 注解
@Select("SELECT * FROM users WHERE id = #{id}")
User findById(@Param("id") Long id);

// ③ MyBatis-Plus（一行，无 SQL）
userMapper.selectById(id);
```

**关键认知：MP 不是替代 MyBatis，是在它上面加了一层。** 运行时依然是 `SqlSession → Executor → JDBC` 那条老路，MP 只是在**启动时**替你生成了「XML 本该写的内容」（也就是 `MappedStatement`）。

所以后面讲的 MapperProxy、四大对象、两级缓存，全部是 **MyBatis 的机制**，MP 一层都没改。

## 和 TypeORM / JPA 的哲学差异

| | TypeORM / JPA | MyBatis-Plus |
|--|--------------|--------------|
| 定位 | ORM：对象 ↔ 表自动映射，SQL 自动生成 | 半 ORM：实体 ↔ 表映射，SQL **手写优先** |
| 复杂查询 | 查询构造器 / JPQL | XML / 注解写 SQL |
| 复杂 SQL 能力 | 弱（难调优） | **强**（DBA 友好，直接控制 SQL） |
| 国内使用率 | 低 | **高**（大厂标配） |

**为什么国内爱用 MyBatis**：复杂报表/多表 join SQL 直接写，SQL 可复制到 Navicat 调优，DBA 审查方便。JPA 自动生成的 SQL 难调优、难排查。

## 快速开始

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>3.5.x</version>
</dependency>
```

> **版本坑（3.5.9 起）**：内置分页 `PaginationInnerInterceptor` 已拆到独立依赖，只引 starter 会编译不过，还必须加：
> ```xml
> <dependency>
>     <groupId>com.baomidou</groupId>
>     <artifactId>mybatis-plus-jsqlparser</artifactId>
>     <version>3.5.x</version>
> </dependency>
> ```

**Mapper 要被扫描到才能注入**——二选一（漏了启动就 `NoSuchBeanDefinitionException`）：

```java
// 方式一：启动类上批量扫描（推荐，包内所有 Mapper 一次搞定）
@SpringBootApplication
@MapperScan("com.example.mapper")
public class App { }

// 方式二：每个接口自己标 @Mapper
@Mapper
public interface UserMapper extends BaseMapper<User> { }
```

实体类 + Mapper 接口（继承 `BaseMapper` 即获得全套 CRUD）：

```java
@Data                              // Lombok：自动生成 getter/setter
@TableName("users")                // 表名映射
public class User {
    @TableId(type = IdType.AUTO)   // 主键策略：自增
    private Long id;

    private String name;

    @TableField("created_at")      // 驼峰 → 下划线自动映射，特殊字段才需要
    private LocalDateTime createdAt;
}

public interface UserMapper extends BaseMapper<User> {
    // 继承后自动拥有：selectById / insert / updateById / deleteById / selectList...
}
```

使用：

```java
@Autowired
private UserMapper userMapper;

User user = userMapper.selectById(1L);                       // 对应 findOneBy
List<User> list = userMapper.selectList(
    new LambdaQueryWrapper<User>()                           // 查询构造器，对应 TypeORM 的 where
        .eq(User::getName, "张三")
        .gt(User::getId, 100)
        .orderByDesc(User::getId)
);
```

**LambdaQueryWrapper 对应关系**：

| TypeORM | MyBatis-Plus |
|---------|--------------|
| `where: { name: '张三' }` | `.eq(User::getName, "张三")` |
| `where: { id: MoreThan(100) }` | `.gt(User::getId, 100)` |
| `orderBy: { id: 'DESC' }` | `.orderByDesc(User::getId)` |
| `like: { name: '%张%' }` | `.like(User::getName, "张")` |
| `in: ...` | `.in(User::getId, ids)` |

> `Wrappers.lambdaQuery(User.class)` 和 `new LambdaQueryWrapper<User>()` 完全等价，前者是静态工厂。
> 嵌套调用时前者能省泛型参数（不用写 `Wrappers.<User>lambdaQuery()`），项目里更常见。

## Wrapper 的边界

`LambdaQueryWrapper` 只能构造**单表**的 `WHERE / ORDER BY / LIMIT`，做不了 join。所以分界线很清晰：

| 场景 | 用什么 |
|--|--------|
| 单表条件查询 | `Wrapper`（绝大多数场景） |
| 多表 join、聚合、报表 | `@Select` 注解，复杂到读不下去才开 XML |

**「零 XML」是完全可行的现实选择**：一个中等规模的后端项目可以全库没有 mapper XML——单表走 Wrapper，多表走 `@Select`。看到「MyBatis 必须写 XML」的说法，那是原生 MyBatis 时代的事。

### `selectOne` 的隐含约束

```java
mapper.selectOne(wrapper);   // 结果 >1 条直接抛 TooManyResultsException
```

所以「取最新一条」这类查询必须配 `.last("limit 1")`——**那是保护措施，不是性能优化**：

```java
mapper.selectOne(
    Wrappers.lambdaQuery(SummaryDO.class)
        .eq(SummaryDO::getConversationId, conversationId)
        .orderByDesc(SummaryDO::getId)   // 雪花 ID 递增，id 降序 = 时间倒序
        .last("limit 1")
);
```

::: warning `.last()` 是字符串直拼
它绕过所有参数化机制，把内容原样塞到 SQL 末尾：

```java
.last("limit 1")                    // ✅ 字面量，安全
.last("limit " + userLimit)          // ❌ 拼接外部输入 = SQL 注入
```

只能用常量。确实需要外部数值（`limit` / `offset`）时，先做类型和范围校验，或者改用 `Page` 分页。
:::

## 分页查询（高频用法）

```java
// 1. 配置分页插件
@Configuration
public class MybatisPlusConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}

// 2. 使用
Page<User> page = userMapper.selectPage(
    new Page<>(1, 10),   // 第 1 页，每页 10 条
    new LambdaQueryWrapper<User>().eq(User::getStatus, 1)
);
List<User> records = page.getRecords();   // 当前页数据
long total = page.getTotal();             // 总条数（自动 COUNT）
```

**注意**：分页必须配置分页插件，否则 `Page` 参数会被忽略。

## 逻辑删除：`@TableLogic`

```java
@TableLogic
private Integer deleted;
```

配了之后：

- `deleteById(id)` → 实际执行 `UPDATE ... SET deleted = 1`
- 所有 **MP 自动生成**的查询 → 自动追加 `WHERE deleted = 0`

**最大的坑：手写 SQL 不会自动加条件。**

```java
// Wrapper 查询：自动带 deleted = 0 ✅
mapper.selectList(Wrappers.lambdaQuery(User.class).eq(User::getName, "张三"));

// @Select / XML 手写：不加，查得到已删除的数据 ❌
@Select("SELECT * FROM users WHERE name = #{name}")
List<User> findByName(@Param("name") String name);
```

所以手写 SQL 必须自己带 `AND deleted = 0`，自定义的 `update` / `count` / `join` 同理。

> 排查「列表里突然多出一条已删数据」时，第一个怀疑对象就是这条 SQL 是不是手写的。

## 手写 SQL：XML 还是注解

```java
// 注解方式（简单查询）
@Select("SELECT * FROM users WHERE name = #{name}")
List<User> findByName(@Param("name") String name);

// XML 方式（复杂查询，推荐）—— resources/mapper/UserMapper.xml
<select id="findOrdersWithItems" resultType="com.example.OrderVO">
    SELECT o.*, i.name AS item_name
    FROM orders o
    LEFT JOIN order_items i ON o.id = i.order_id
    WHERE o.user_id = #{userId}
      <if test="status != null">        <!-- 动态 SQL -->
        AND o.status = #{status}
      </if>
    ORDER BY o.created_at DESC
</select>
```

**动态 SQL 标签**（MyBatis 特色，面试可能问）：`<if>`、`<where>`、`<foreach>`（in 查询）、`<choose>`（switch）。

## 底层：Mapper 接口为什么没有实现类也能调（必考）

`UserMapper` 是个接口，没有 `UserMapperImpl`，但 `@Autowired` 注入后能直接调——靠 **JDK 动态代理**：

```
启动时：@MapperScan 扫描接口 → MapperFactoryBean → MapperProxyFactory 生成代理对象 → 注册成 Bean
调用时：userMapper.selectById(1L)
          → MapperProxy.invoke()             ← InvocationHandler
          → 按「接口全限定名 + 方法名」找到 MappedStatement（XML/注解里那条 SQL）
          → SqlSession.selectOne(statementId, 参数)
          → Executor → StatementHandler → JDBC
```

**所以两个常见报错都能对上号**：漏 `@MapperScan`/`@Mapper` → 代理 Bean 没注册 → 注入报 `NoSuchBeanDefinitionException`；XML 的 `namespace` 写错或方法名对不上 → 找不到 `MappedStatement` → `Invalid bound statement (not found)`。

**四大对象 + 插件链**（面试问"分页插件怎么实现的"）：

| 对象 | 职责 |
|------|------|
| `Executor` | 执行器：真正发起查询/更新（`SimpleExecutor` 默认；`BatchExecutor` 攒批；`CachingExecutor` 套二级缓存） |
| `StatementHandler` | 创建 `PreparedStatement`、设置参数、执行 SQL |
| `ParameterHandler` | Java 参数 → JDBC 参数（`#{}` 就是它做预编译赋值） |
| `ResultSetHandler` | ResultSet → Java 对象映射 |

插件（`Interceptor`）用**动态代理包装这四大对象**，按 `@Intercepts/@Signature` 声明要拦谁。MyBatis-Plus 的分页插件就是拦 `StatementHandler`：先改写 SQL 加 `LIMIT`，同时按需生成一条 `COUNT` 语句——所以"分页 = 两条 SQL"（见 [harvest 里的记录](/java-practice/harvest)）。

## 两级缓存（面试必问，且最容易答错）

| | 一级缓存 | 二级缓存 |
|--|---------|---------|
| 作用域 | **SqlSession**（会话级） | **namespace / Mapper**（应用级） |
| 默认 | **开启**，不用配 | 关闭，要 `<cache/>` 或 `@CacheNamespace` 显式开 |
| 命中条件 | 同一 SqlSession + 同一 statementId + 相同参数 + 期间没执行过增删改 | 跨 SqlSession，同一 namespace |
| 清理时机 | 执行 INSERT/UPDATE/DELETE、`commit()`/`rollback()`、手动 `clearCache()` | 该 namespace 有写操作时清除 |
| 存储 | 内存 HashMap（`PerpetualCache`） | 内存 HashMap，可换 Redis/Ehcache |

**最值钱的一个追问：Spring 项目里为什么感觉不到一级缓存？**

因为 `SqlSessionTemplate` 每次数据库操作都会开一个**新的 SqlSession**（用完就关），缓存自然命中不了。**只有在同一个事务里**，多个 Mapper 调用才会复用同一个 SqlSession——所以一级缓存的实际生效场景是"一个事务内反复查同一条 SQL"。

```java
@Transactional
public void demo() {
    userMapper.selectById(1L);   // 查库
    userMapper.selectById(1L);   // 命中一级缓存，不发 SQL
}
```

**二级缓存为什么生产上基本不用**：

- 缓存挂在 namespace 上，**多表关联时没法联动失效**——`orders` 的 Mapper 改了库存表，`products` 的 namespace 缓存不会清，直接读到脏数据
- 它是**应用内本地缓存**，多实例部署时各存一份，一致性无从保证
- 所以主流做法：关掉二级缓存，跨实例的缓存交给 Redis（`@Cacheable` 或手写 CacheService）

> 面试如果被问"你们用二级缓存吗"，正确答法是"**默认不开，多表 join 场景下 namespace 级缓存无法保证一致性；要缓存就用 Redis 统一管**"，而不是背 `<cache/>` 怎么配。

## 面试考点

| 考点 | 要点 |
|------|------|
| MyBatis 和 MyBatis-Plus 区别 | Plus = MyBatis + CRUD 免写 + 分页 + 代码生成器，兼容原 MyBatis |
| 为什么用 MyBatis 不用 JPA | SQL 可控可调优，复杂查询友好；国内团队习惯 |
| `#{}` 和 `${}` 区别（高频） | `#{}` 预编译占位符（防 SQL 注入）；`${}` 字符串拼接（**有注入风险**，只能用于表名/排序字段等） |
| 主键策略 | `IdType.AUTO`（自增）/ `ASSIGN_ID`（雪花算法） |
| 逻辑删除 | `@TableLogic`：删除变更新 `deleted` 字段，查询自动带 `WHERE deleted = 0` |
| 乐观锁 | `@Version` 字段 + 乐观锁插件，更新时 `SET version = version+1 WHERE version = ?` |
| Mapper 接口没实现类怎么调 | JDK 动态代理（MapperProxy），按 statementId 找到 SQL 交给 SqlSession |
| 一级缓存是什么 | SqlSession 级、默认开启；Spring 里只有同一事务内多查才命中 |
| 二级缓存为什么不推荐 | namespace 级、多表 join 无法联动失效、多实例各存一份 → 用 Redis 代替 |
| 分页插件原理 | 拦截 StatementHandler，改写 SQL 加 LIMIT + 另发一条 COUNT |
| 插件怎么实现 | 动态代理包装 Executor/StatementHandler/ParameterHandler/ResultSetHandler 四大对象 |

**`#{}` vs `${}` 是必考题**：`WHERE name = #{name}` 安全（预编译）；`ORDER BY ${column}` 只能用 `${}`（列名不能占位），但传入前必须白名单校验。

## 延伸阅读

- [Spring Boot 入门](/service/java/spring-boot) - 项目集成环境
- [MySQL 进阶](/service/common/mysql-advanced) - SQL 优化的知识背景
- [TypeORM 用法](/service/node/typeorm) - 你的 JS 侧对照
- [Java 服务端知识地图](/service/java/) - 全部篇目导航与学习路径

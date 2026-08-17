# MyBatis-Plus 入门

> **优先级：P1（国内企业高频）** — MyBatis-Plus 是国内 Java 后端的实际标准 ORM（使用率远超 JPA），面试中"你们项目用什么 ORM"十有八九是它。

::: tip 背景
承接 Spring Boot 篇。MyBatis-Plus = MyBatis（手写 SQL 的 ORM）+ 增强（CRUD 免写、分页、代码生成器）。对标你熟悉的 TypeORM，但哲学完全不同：**SQL 是一等公民**。
:::

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

## 面试考点

| 考点 | 要点 |
|------|------|
| MyBatis 和 MyBatis-Plus 区别 | Plus = MyBatis + CRUD 免写 + 分页 + 代码生成器，兼容原 MyBatis |
| 为什么用 MyBatis 不用 JPA | SQL 可控可调优，复杂查询友好；国内团队习惯 |
| `#{}` 和 `${}` 区别（高频） | `#{}` 预编译占位符（防 SQL 注入）；`${}` 字符串拼接（**有注入风险**，只能用于表名/排序字段等） |
| 主键策略 | `IdType.AUTO`（自增）/ `ASSIGN_ID`（雪花算法） |
| 逻辑删除 | `@TableLogic`：删除变更新 `deleted` 字段，查询自动带 `WHERE deleted = 0` |
| 乐观锁 | `@Version` 字段 + 乐观锁插件，更新时 `SET version = version+1 WHERE version = ?` |

**`#{}` vs `${}` 是必考题**：`WHERE name = #{name}` 安全（预编译）；`ORDER BY ${column}` 只能用 `${}`（列名不能占位），但传入前必须白名单校验。

## 延伸阅读

- [Spring Boot 入门](/service/spring-boot) - 项目集成环境
- [MySQL 进阶](/service/mysql-advanced) - SQL 优化的知识背景
- [TypeORM 用法](/service/typeorm) - 你的 JS 侧对照

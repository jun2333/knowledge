# Java 实战收获记录

> 记录在 mall 实战过程中沉淀的收获与踩坑，按主题持续追加。
> 与阶段文档的区分：阶段文档讲"怎么做"，这里记"实际遇到了什么、学到了什么"。

## 2026-08-31（首篇）

### 一、工程结构与依赖（Maven 多模块）

- **Maven 多模块 = 后端 monorepo**：一个仓库、多个可独立构建的模块，依赖方向单向（底座 ← 业务）。前端对应 pnpm workspace。
- **模块划分规范**：横切分层（mall-common / mall-mbg / mall-security 底座）+ 纵切业务（mall-admin / mall-portal 两个入口）。判断边界四问：依赖单向吗？通用下沉了吗？能独立编译吗？有循环依赖吗？
- **pom.xml 三块**：`<properties>` 统一定版本 → `<dependencies>` + `<dependencyManagement>` 声明依赖 → `<build>` 配置构建。
- **`dependencies` vs `dependencyManagement`**：前者"我要用"（子模块自动继承），后者"用的话必须这个版本"（版本清单，子模块要自己声明才拥有）。多模块版本统一靠 DM + properties。
- **坐标**：`groupId`（组织，反向域名）= npm 的 scope，`artifactId`（模块名）= npm 包名，`version` = 版本。三者唯一标识一个 jar。

### 二、Java 语言细节（澄清与踩坑）

- **enum 本质是"类"**：可带字段/构造器/方法/接口实现，隐式继承 `java.lang.Enum`，**实例在声明时定死、不能 new、天然单例**。适合"固定数量 + 每个常量带属性"（如 ResultCode）。
- **equals**：所有非 null 对象都有（继承 Object，默认比地址），String/包装类重写为**内容比较**；**null 调用 equals 直接 NPE**。最省心的写法是 `Objects.equals(a, b)`（两边都防 null）。
- **装箱/拆箱**：`int ↔ Integer` 自动转换；**`Integer` 的 `==` 陷阱**（-128~127 有缓存，超出范围 `==` 比地址不同对象 → false，要用 `equals`）。
- **equals 与 hashCode 契约**：equals 相等 → hashCode 必相等；重写 equals 必须重写 hashCode（HashMap 依赖）。record / Lombok @Data 自动处理。

### 三、Spring 注入与实例化

- **`@RequiredArgsConstructor` + `final` 字段 = 构造器注入**：Lombok 编译期生成构造器（只含 final/@NonNull 字段），Spring 看到唯一构造器自动注入，不需要 @Autowired。
- **`@Autowired` 字段注入已过时**：不可测试（私有字段 new 不进去）、隐藏依赖（构造器一眼看清依赖）、循环依赖静默（字段注入启动不报错、运行时才炸）。现代推荐**构造器注入**（final + @RequiredArgsConstructor）。
- **Spring 4.3+ 单构造器自动注入**：只有一个构造器时连 @Autowired 都不用写，Spring 自动用该构造器注入——所以构造器注入代码里通常看不到 @Autowired 注解。
- **IoC/DI**：对象的创建权交给框架——启动时扫描 @Service/@Bean 实例化并注入，业务代码从不 new 业务 Bean。这解释了"为什么构造器注入能成立"。

### 四、mall 实战改造（真实动手）

- **循环依赖重构**：UmsAdminService ↔ CacheService 互引，原用 `SpringUtil.getBean` 绕环。改为构造器注入 + CacheService 去掉对 AdminService 的依赖（直接注入 Mapper），**依赖单向化**。
- **HTTP 状态码语义化**：`ResponseBodyAdvice` 按 body.code 映射 HTTP 状态码 + 401/403 的 EntryPoint/DeniedHandler 手动 `setStatus`。常规做法其实是源头设置（ResponseEntity），ResponseBodyAdvice 是"老项目不改所有 Controller"的过渡方案。
- **业务码体系**：`ResultCode` 改 `2xxxx/4xxxx/5xxxx` 分段，**枚举自带 `HttpStatus`**（`httpStatusOf(code)` 查码 + 兜底 500），映射单一来源。
- **token 失效方案**：JWT 无状态 → 改密码后旧 token 依然有效（validateToken 只验签名+过期+用户名）。方案：**token 里带密码 hash 指纹**，改密码后数据库密码变 → 校验失败。登出仍要黑名单/时间戳方案。

### 五、排查经验（最值钱的沉淀）

- **404 → /error → 401 链路**：看似"被安全拦截"，实则是**路径 404 后 Spring 转发 `/error`，而 `/error` 不在白名单**。日志特征：`Secured 原路径` 后紧跟 `Securing /error`。Druid 监控页 401 的根因就是这个（StatViewServlet 未注册 → 404）。
- **MvcRequestMatcher vs PathPatternRequestMatcher**：`requestMatchers(String)` 默认 MvcRequestMatcher，其行为受 `spring.mvc.pathmatch.matching-strategy` 影响。排查时先怀疑"配置是否真的生效"，用临时打印/调试日志确认，别猜。
- **Druid 监控**：两层都要开——`stat-view-servlet.enabled: true`（监控页）+ `filters: stat`（SQL 统计）。SQL 显示为 `?` 是**参数化查询**（防注入 + 预编译），参数值看 MyBatis 日志的 `Parameters:` 行。
- **PageHelper 分页 = 两条 SQL**：一条列表（LIMIT）+ 一条 `count(0)`（同条件算总数），count 结果进 `Page.total` → `CommonPage.total/totalPage`。
- **环境**：命令行 `mvn` 用 JDK 17 靠 `JAVA_HOME` 环境变量（`~/.zshrc` 里配），IDEA 用 Project SDK（不读 shell）。

### 六、验证过的调试手段

- 看真实 SQL：`logging.level.com.macro.mall.mapper: debug`（Preparing + Parameters）+ Druid SQL 监控页（执行统计）。
- 定位安全拦截：`org.springframework.security: debug` 日志看过滤器链匹配过程（`Securing/Secured`）。
- 确认 class 是否最新：`javap` 反编译 + 对比进程启动时间和 class 更新时间（排查"改了没生效"）。

### 七、数据访问与更新（事务 / 全量vs差异 / 动态查询）

**事务注解位置（CGLIB 代理坑）**
- `@Transactional` 放**接口**上在 Spring Boot 3（默认 CGLIB 代理，基于类）下**不生效**——注解不被继承，CGLIB 只认类上的注解。
- 正确姿势：放**实现类方法**上 + `rollbackFor = Exception.class`（默认只回滚 RuntimeException，受检异常也要回滚就加它）。
- **验证事务生效**：`logging.level.org.springframework.transaction.interceptor: trace` → 日志见 `Creating new transaction` / `Committing transaction` / `Rolling back transaction`。**没有 Creating = 事务没被代理**。

**全量更新 vs 差异更新（先删后插）**
- mall 子表更新 = `deleteByExample`（按 productId 全删）+ `relateAndInsertList`（全量重插），简单一致。
- **纯配置子表**（会员价/阶梯价/满减/属性）：无状态、无外部引用 → 可删了重插。
- **有状态子表**（SKU）：有库存运行状态（删了重插会覆盖真实库存）+ 被订单/购物车引用 id（删了重插断关联）→ **必须 diff**（`handleUpdateSkuStockList`：新增 insert / 删除 delete / 变更 update，按 id 有无判断）。
- 判断标准：**数据是静态配置还是运行状态 + 有没有外部引用**。
- 多子表 SQL 必须**串行**（同一事务同一连接），并行 = 多连接 = 失去原子性；并行只留给"独立 + 耗时 + 不需要事务"的远程调用。

**Example 动态查询两层 if**
- **Java 层 if**（null 守卫）：值非 null 才 `andXxxEqualTo(value)`，决定"条件集合有什么"。
- **Example 条件对象**：只记"有没有这个条件"（condition + value），**不关心值是否为 null**。
- **XML `Example_Where_Clause`**：翻译器（MBG 生成），`foreach` 遍历条件组 + `if test="criteria.valid"` + `choose` 按类型拼 SQL（noValue→`is null`类 / singleValue→`= ?` / betweenValue→`between` / listValue→`in (...)`）。
- **坑**：Java 无脑丢 null → Example 照收 → XML 照拼 → SQL 出现 `= null` → 查不出（`=` 对 NULL 永远不成立，要用 `IS NULL`）。所以判空必须在 Java 层。
- **判断模式**：Java 传 Example 对象 = Example 模式（条件判断在 Java）；Java 传普通参数 + XML `<if test>` = XML 模式。

**SKU 编码生成**：`StringBuilder` 高效拼接 + `String.format("%04d", id)` 补零到指定宽度（前端等价 `String(id).padStart(4,'0')`），如 `日期 + 商品id(4位) + 序号(3位)` → `202608310012003`。

**前端配合后端状态码改造**（mall-admin-web）：
- 后端改语义化 HTTP 状态码后，axios 的 401/403 走 **error 分支**（不是 response 分支）→ 必须补 error 分支：401 → 登出弹窗，其他 → 从 `error.response.data.message` 取提示。
- 业务码判断同步改：成功 `200` → `20000`，未登录 `401` → `40100`。

### 八、AOP 实战：通知类型与切入点（WebLogAspect）

**核心直觉：AOP 通知 = 钩子函数**（框架在特定时机回调你定义的逻辑）。mall 的 `WebLogAspect`（mall-common）是完整演示。

**通知类型（5 种钩子）**：

| 通知 | 时机 | 能拿到 | 类比前端 |
|------|------|--------|---------|
| `@Before` | 目标方法**执行前** | JoinPoint（方法签名/参数） | 中间件 `next()` 前 |
| `@After` | 执行后（成功/异常都触发） | — | `finally` |
| `@AfterReturning` | **正常返回后**（异常不触发） | **返回值**（`returning="ret"`） | `res` 回调 |
| `@AfterThrowing` | 抛异常后 | 异常对象 | `catch` |
| `@Around` | **前后都包**（最灵活） | 全都有，`proceed()` 控制 | 中间件包 `next()` |

**`@Around` 是最全的钩子**：proceed() 前 = before，proceed() 后 = after/afterReturning，还能 catch 异常。mall 用 @Around 一把梭，@Before/@AfterReturning 留空占位。

**切入点表达式拆解**（`execution(...)`）：

```java
@Pointcut("execution(public * com.macro.mall.controller.*.*(..))
          || execution(public * com.macro.mall.*.controller.*.*(..))")
public void webLog() { }   // 空方法 = 切入点的"命名引用"，供通知引用
```

```
execution( 访问修饰符 返回类型 包.类.方法(参数) )
  public  *        com.macro.mall.controller . * . * (..)
  只切public  任意返回    指定包           类任意 方法任意 参数任意
```

- `||` = 或（再匹配一级子包下的 controller 包，如 portal/admin 的 controller）
- `..` = 任意参数（0 个或多个）

**WebLogAspect 实战要点**：
- `@Around` 包住方法：proceed() 前拿 `HttpServletRequest` 记开始时间 → proceed() 执行 → 后组装 `WebLog`（url/method/参数/耗时/结果）→ 通过 Logstash 打进 Elasticsearch
- **等于前端"请求日志中间件"**：不用每个接口手写日志，切一刀统一记录（横切关注点）

**钩子函数的心智模型**：AOP 通知 = 框架留的钩子位（before/after/around），你填逻辑，框架到点调你。`@Around` 的 `proceed()` 是"把控制权交给真实方法"的分水岭——**单切面时是包装（装饰器），多切面叠起来才成洋葱**。

### 九、注解 / 装饰器 / 高阶函数（概念澄清）

**HOF（高阶函数）严格定义**：**接收函数作为参数，"或"返回函数作为结果的函数**——是"或"（either/or），**不是"且"**（不需要同时满足）。

```js
arr.map(fn)                 // 接收函数（不返回函数）→ 是 HOF
const f = () => () => {}    // 返回函数 → 是 HOF
withLog(fn)                 // 接收且返回 → 是 HOF（也是装饰器）
```

- **HOF 是大集合**：map/filter/reduce、`addEventListener`、`setTimeout`、`Promise.then` 都是 HOF（接收回调就算）
- **装饰器是 HOF 的子集**：函数式装饰器（`withLog(fn)`）是 HOF 中"包装增强"的那一类；map 是 HOF 但不是装饰器（只消费回调，不包装增强原函数）

**注解 ≠ 装饰器**：
- 注解 = **元数据**（数据标记），本身无行为；装饰器 = **行为**（包装增强）
- 但"注解 + 框架"能触发装饰行为：Spring 读 `@Transactional` → 运行时生成代理装饰 bean
- 所以"注解像装饰器"的感觉来自**框架**，不是注解本身

**注解处理的两条路**（看 `@Retention`）：

| 时机 | 谁做 | 例子 | Retention |
|------|------|------|-----------|
| **编译期** | javac 注解处理器 | Lombok（@Data 生成 getter/setter） | `SOURCE`（编译后即弃） |
| **运行时** | 启动时反射 + 动态代理 | Spring（@Service/@Transactional → 代理） | `RUNTIME`（字节码保留，反射可读） |

**三者关系一句话**：注解 = "声明"（让框架做），装饰器 = "包装"（自己做），高阶函数 = "函数的能力"（接收/返回函数）；注解经框架触发才表现成装饰器，装饰器函数式实现时是高阶函数的一种，高阶函数范围最大。

### 十、日志配置与 ELK 链路（logback → Logstash → ES）

**日志链路三件套**（代码里打日志到最终落地的完整路径）：

```
log.info(...) / @Slf4j 的 log
  → SLF4J（门面/接口）
  → logback（实现，Spring Boot 默认）
  → logback-spring.xml 配置的 appender（决定"输出到哪"）
      ├─ ConsoleAppender            → 控制台
      ├─ RollingFileAppender        → 文件（滚动，`class` 属性定类型 + `%d`/`%i` 定文件名）
      └─ LogstashTcpSocketAppender  → 网络 TCP 发到 Logstash
```

**logback 配置核心概念**：

| 概念 | 作用 |
|------|------|
| appender | 输出目标（class 属性定类型：控制台/文件/网络端口） |
| logger / root | 级别配置（`name` 是包名前缀，按来源包分级） |
| pattern | 格式（`%d`时间 `%level`级别 `%logger`类 `%message`消息） |
| filter | appender 内再过滤（ThresholdFilter ≥X / LevelFilter 只 X） |
| rollingPolicy | 文件滚动（`%d` 按天 + `%i` 大小切分序号，留 30 天） |

**三个易混点**：
- **决定"输出到哪"的是 appender 的 `class`**，具体位置（路径/端口）由内部 `<fileNamePattern>`/`<destination>` 定；`<appender-ref>` 只是"选出口"
- **additivity（默认 true）**：logger 日志除了发自己绑的 appender，还向上叠加发给 root 的——想"只进自己分类管道"要加 `additivity="false"`
- **logback `<if>` 标准写法**：条件内联 `<if condition='property("X").equals("true")'>`，需要 Janino 支持；非标准写法（`<condition>` 拆到 if 前）可能不生效

**Logstash 收→发流程**（应用只负责"发"，存哪由 Logstash 定）：

```
应用（logback，TCP 发 4560-4563 端口，JSON 格式）
  → Logstash 服务（document/elk/logstash.conf）
       input：监听 4560(debug)/4561(error)/4562(business)/4563(record)
       filter：解析 JSON、清理字段
       output：elasticsearch → localhost:9200，索引 mall-{type}-{日期}
  → Elasticsearch（存储，全文搜索）
  → Kibana（可视化查日志）
```

**关键认知**：
- 应用项目里**没有 ES 配置**（只有 `logstash.host`）——ES 连接/索引在 **Logstash 的配置文件**（部署层）
- TCP 日志的落脚点是 **ES**（不是文件系统，不是 MySQL）——Elasticsearch 是"日志/搜索的搜索引擎存储"
- mall-search 的 ES 是**另一回事**（商品搜索），别和日志 ELK 混

## 2026-09-02（第二篇）

### 十一、认证改造：AuthenticationManager（登录交给框架）

mall 登录从"手动验证密码"改为"框架认证"：

```java
// 改前：手动 loadUserByUsername + passwordEncoder.matches + 手动 new 已认证对象
// 改后：交给框架
Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(username, password));
UserDetails userDetails = (UserDetails) authentication.getPrincipal();
String token = jwtTokenUtil.generateToken(userDetails);
```

**关键认知**：
- **自动装配是"按类型推断（byType）"不是按名字**：框架 `getBean(UserDetailsService.class)` 从容器找 Bean（MallSecurityConfig 提供，内部调 adminService），名字随便叫都能找到；UserDetailsService 是框架的 **SPI 接口约定**，你实现放进容器，框架自动接上
- **AuthenticationManager 接口是框架的，但 Bean 要自己暴露**（`config.getAuthenticationManager()`）
- **DaoAuthenticationProvider 内置检查**：查用户（UserDetailsService）+ 比对密码（PasswordEncoder）+ `isEnabled()`（禁用抛 DisabledException）、密码错抛 BadCredentialsException（用户不存在被框架隐藏成 BadCredentialsException 防枚举）

### 十二、循环依赖：原理与 ObjectProvider 断环

**环的形成**（本次实战）：UmsAdminService 依赖 AuthenticationManager，而 AuthenticationManager 的创建链（SecurityConfig → JwtAuthenticationTokenFilter → UserDetailsService → UmsAdminService）又必须经过 UmsAdminService——A要B→C→D→A，谁都等不到谁（类似 JS 模块循环引用）。

**修复**：`ObjectProvider<AuthenticationManager>` 懒获取——注入时不创建目标 Bean，login 用时才 `getObject()` 解析：

```java
private final ObjectProvider<AuthenticationManager> authenticationManagerProvider;
// login: authenticationManagerProvider.getObject().authenticate(...)
```

**经验套路**：循环依赖 = 画"谁需要谁"的链找到绕回起点的依赖，把它改成懒获取（ObjectProvider/@Lazy）或拆开。别用 `allow-circular-references=true`（掩盖问题）。

### 十三、异常分层与认证异常处理（最佳实践落地）

**分布原则**：异常**往上抛、全局统一接、别到处 try-catch**——Service 主动抛（知道为什么失败）、Controller 零判断（只写成功路径）、全局异常处理器统一转格式、技术异常（DB/IO）别吞。

**本次改造**（登录异常）：
- Controller 删掉 `if (token == null)` 判断（原：返回值判断 = 职责越界 + 原因丢失）
- Service catch 后**抛带业务码的 ApiException**（不再返回 null 丢原因）：

```java
catch (DisabledException e) {
    throw new ApiException(ResultCode.FORBIDDEN, "账号已被禁用");    // 40300/403
}
catch (BadCredentialsException e) {
    throw new ApiException(ResultCode.PARAM_ERROR, "用户名或密码错误"); // 40000/400
}
```

- 全局异常处理器 `handle(ApiException)` 用 `failed(errorCode, e.getMessage())` 返回
- ApiException 新增 `(IErrorCode, String message)` 构造器

**分层约束**：`mall-common` 是通用底座**不能依赖 spring-security**（DisabledException 在 spring-security-core，common 引不到）——安全异常要在依赖了 security 的 mall-admin 处理，再用自己的业务异常（ApiException）桥接给全局（mall-common 只处理通用异常）。

**缓存一致性小坑**：改了 DB 里的缓存数据源（如 status）**必须清 Redis**（`redis-cli -n 0 flushdb` 或删对应 key），否则 `getAdminByUsername` 先查缓存拿到旧值——"改库 + 清缓存"是配套动作。

---

## 待补充话题

- 登出方案落地（时间戳黑名单 / token 黑名单二选一）
- 阶段 6 动手开发的完整流程收获

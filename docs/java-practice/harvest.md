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

## 2026-09-03（第三篇）

### 十四、并发锁：从"背 API"到"用定义分界做决策"（今日主线）

**乐观/悲观阵营模型**（自己推出来的）：分界 = **加不加锁、阻不阻塞**，不是"用不用 version"：

```
悲观阵营：FOR UPDATE（加锁阻塞）
乐观阵营：不加锁假设成功、失败检测返回 0
  ├─ 条件型（原子 SQL stock=stock-1）：不读快照，一次闭环
  └─ 版本型（version/时间戳）：先读快照，冲突重试
```

- 按此定义**原子 SQL 也是乐观的**（教材把版本型特指叫乐观锁 → 口径混乱的根源）
- 乐观锁本质 = "**WHERE 带旧值**"：version / 时间戳 / CAS 条件（`stock>=1`）/ 状态机校验（防重复支付）/ 唯一约束 全是同一思想
- 原子 SQL 一条（不用读旧值）、版本型两条（先读快照再校验）——"一条能原子解决就别上锁"

**状态单调性决定预检可靠性**（自己悟的，值钱）：锁外预检只对"**单调状态**"（只增不减：已领/幂等标记）可靠、不会误杀；"**可回退状态**"（库存可退/剩余量回升）判断必须锁内拿最新值——秒杀 = "是否已抢"（可预检）+ "还有没有货"（锁内判）。

**锁粒度 = 并发粒度**：锁 key 决定互斥范围 = 能并行多少（`seckill:product` 串行 1 vs `seckill:product:1` 并发 = 资源数）。key 粒度是**性能决策不是正确性决策**。

**悲观锁必须事务**：FOR UPDATE 锁随事务提交/回滚释放，autocommit 下锁立即释放（锁个寂寞）；但"事务"不限于 @Transactional（TransactionTemplate/JDBC 手动都行）。

**Redis 分布式锁**：
- key = 锁什么资源，**value = 持有者 UUID（所有权凭证）**——释放靠 Lua"比对 value 才删"（原子两步），防超时后误删别人的锁
- Redisson 全封装：value 存 `UUID:threadId` + hash 可重入计数 + **看门狗**（默认 30s，业务没跑完每 10s 自动续，防提前过期）
- 两层过期：正常靠看门狗续、**宕机靠 TTL 兜底**（看门狗在持锁 JVM 里，JVM 死它也死）
- 锁粒度选择看"临界资源独立性"：资源按 id 独立就带 id；任务全局唯一（对账/刷新）用任务名
- 锁"数据" vs 锁"代码"：DB 锁数据行（库管），Redis 锁代码临界区（自己管令牌）

### 十五、数据批量写与主从一致（网络往返视角统一）

**批量写三种方案的性能本质 = 网络往返次数**：

```
循环逐条（N 次往返）< BATCH 攒批（addBatch 本地攒 + flushStatements 一批发，N/1000 次）< 合并 SQL（1 次）
BATCH 三坑：手动 flush、返回值不可靠、和 @Transactional 混用冲突（session 不同）
JDBC url 加 rewriteBatchedStatements=true 让 MySQL 重写合并批里的 SQL
```

**主从复制有两层一致**（自己悟的）：
- 第一层：主库并发写 → **主库行锁**（和单库一模一样，写全落主库）——需要锁
- 第二层：主库→从库 → binlog **顺序重放**，没有并发写 → 不用锁，一致风险是**复制延迟**（不是冲突）
- 所以"主从靠复制策略不是锁"指第二层（半同步/关键读走主/延迟监控）；第一层照样靠 DB 锁
- 四种数据形态（单库/主从/分片/分布式库）的锁与一致见 [数据分布场景与锁设计](/service/data-distribution-locks)

### 十六、SQL 优化动手闭环 + IDEA 红波浪线

**LEFT JOIN + 右表字段 IS NOT NULL = INNER JOIN**（语义等价，过滤只针对最右表时成立）——改了 mall `getResourceList` 四表联查并测试通过（第一次"看懂 → 动手改 → 验证"完整闭环）。

**IDEA XML 红波浪线** = SQL inspection 没配数据库数据源 → 猜列不存在而标红，**不是 SQL 写错**（运行时 MySQL 解析正常）——配 Database 数据源解决。

### 十七、Redis 认知补全

- **缓存三大问题 mall 没做防御**的原因：key 少（几个 admin/资源）、访问温和，够不着穿透/击穿/雪崩的触发条件——**方案必要性由场景决定**（高并发才值得上布隆/互斥/随机）
- `keys *` 生产禁用：单线程被全量遍历占死（阻塞）+ 运维 `rename-command KEYS ""` 禁命令；`scan` 游标分批不阻塞；`--scan --pattern 'ums:*' | xargs del` 是清缓存正规姿势
- `@CacheException`（RedisCacheAspect）：Redis 挂了自己抛异常，切面决定"命运"——**普通缓存吞异常降级（回源 DB），关键操作（验证码）必须抛**（假成功比失败更糟）；降级前提 = 有第二数据源，主源在 Redis 的数据只能显式失败

## 2026-09-04（第四篇）

### 十八、通知功能实战：从建表到接口的完整闭环（06 篇延伸）

自己动手写了 cms_notice 的完整 CRUD，踩了一圈真实开发必经的坑：

**Swagger 看不到控制器（排查三板斧）**：
- `@Controller` ≠ `@RestController`——纯 @Controller 返回值走视图渲染，SpringDoc 不收录、返回也不是 JSON
- **只有类级 @RequestMapping 不够，每个方法必须有映射注解**（@GetMapping 等）——没有映射 = URL 不存在 = 404 且文档无 operation
- 排查顺序：注解 → 方法映射 → springdoc 扫描限制 → 是否重启

**入参 DTO 与实体分离（Param 的第二个存在理由）**：
- `@RequestBody CmsNotice`（实体直接当入参）→ Swagger schema 暴露 id/createTime，调用方可伪造
- 正确：入参用 Param（只含调用方可给的字段），Controller/Service 转换成实体
- **入参模型 ≠ 存储模型**：id 由 DB 自增回填、createTime 由代码/DB 填，天然不该出现在"新增请求"里

**DTO 字段默认值**：声明时直接赋初值（`private String status = "1";`）；**@Builder 必须配 @Builder.Default**（否则 builder 把字段初值冲成 null）。

**Selective 与 DB 默认值的配合（关键机制）**：
- `insert`（全字段）会把 null 显式写入 → **绕过 DB 默认值**；`insertSelective`（null 列不进 SQL）→ DB 默认生效
- `updateByPrimaryKeyWithBLOBs`（全字段 UPDATE）会把没赋值的字段**刷成 NULL**——update 一律用 `updateByPrimaryKeySelective`（本次实战：updateStatus 复用 update + Selective，只更新 status 列）
- 时间字段交给 DB：`create_time datetime DEFAULT CURRENT_TIMESTAMP`、`update_time ... ON UPDATE CURRENT_TIMESTAMP`——**时间字段不是 DB 自带的**（mall 76 表只有 28 个 create_time、0 个 update_time），是建表显式声明 + 列属性自动维护

### 十九、MBG 自动生成（从手养到自动养）

**流程**：generator.properties 配库 → generatorConfig.xml 配表 → 跑 `Generator.main()` → model/Example/Mapper/xml 全套生成到 mall-mbg。

**三个坑**：
- **Mac 路径**：原配置 targetProject 是反斜杠（`mall-mbg\src\main\java`，作者 Windows 开发）——Mac 上会生成到字面目录，必须改正斜杠
- **FQCN 冲突**：手写的类（mall-admin）与生成类（mall-mbg）同全限定名 → 类路径冲突，手写版必须删（Service/Controller 的 import FQCN 不变，零改动）
- **重跑 = 覆盖**：以 DB 当前结构重置生成文件——**生成物永远不手改**；丢自定义用 IDEA Local History 找回

**铁律**：`model/mapper/xml = 生成物（改表重跑）`、`Service/Controller = 手写区`；自定义查询学 mall 的 `UmsAdminRoleRelationDao` 模式（自定义 dao 与生成 mapper 并存）。

### 二十、Spring Bean 概念链（一次串清）

- **Bean = 交给 Spring 容器创建和管理的对象**（IoC：对象不自己 new 依赖，容器统一创建按需注入，默认单例）
- **@Component 家族**（类注解，扫描注册）：@Service/@Repository/@Controller 是 @Component 的语义化派生；@Repository 多异常翻译、@Controller 多 Web 能力
- **@Bean**（方法注解，手动注册）：用于"没法加类注解"的对象——接口适配的方法引用（`adminService::loadUserByUsername`）、第三方类
- **@Autowired 按类型从统一容器找**：跨模块/跨 @Configuration 都能注入；前提该类型 Bean 唯一（多个报 NoUniqueBeanDefinitionException）；注入先于 @PostConstruct
- **@PostConstruct = 依赖注入完成后的初始化钩子**（构造器里依赖还是 null；对应前端 useEffect([])/onMounted）——DynamicSecurityMetadataSource 启动预加载权限 Map 就是它
- **安全装配层模式**：MallSecurityConfig = "通用库定义接口（mall-security 不绑业务）+ 应用侧适配注册（把业务 Service 方法适配成框架接口）"，两条链路（认证/鉴权）的扩展点统一在这注册

**record（Java 16 语言特性，非 Spring）**：一行生成不可变数据类全件（final 字段/全参构造/访问器 name()/equals/hashCode/toString）；适合**只读 DTO**；compact constructor 可加校验+防御拷贝；**有状态组件别转**（IDEA 会误报 Convert to record）；判断归属口诀"不带 spring 依赖能用 = Java 语言"。

### 二十一、权限与缓存实战踩坑

- **allocResource 是"全量分配"接口**（先删后插）——传 [33] 的语义是"角色 5 只有 33"，不是追加 → 实际把角色 5 资源清空了。追加 = 传"现有全部 + 新增"
- **恢复数据用批量 INSERT 不带 id**（自增分配无冲突风险）：`INSERT INTO t (role_id, resource_id) VALUES (5,1),(5,2)...`；逐条复制执行容易丢分号（1064 两条连成一条）
- **改权限库后必须清 `ums:resourceList:*` 缓存**（登录用户权限列表缓存在 Redis，不清则旧权限一直生效）
- **白名单 403 的通配符坑**：`/notice/*` 只匹配一段（/notice/list ✓），**不匹配 /notice 本身**（insert 的 URL）——要用 `/notice/**`（** = 零或多段）。口诀：* 一段，** 剩余全部
- 动态权限规则：**URL 未在 ums_resource 登记并授权 → 一律 403**（不是"没登记就放行"）

### 二十二、杂项认知速记

- **keys * 生产不能用**：单线程被全量遍历占死 + 运维 `rename-command KEYS ""` 禁用；`scan` 游标分批不阻塞；清缓存正规姿势 `redis-cli --scan --pattern 'ums:*' | xargs del`
- **TEXT = 65535 字节 ≈ 64KB**（utf8mb4 约 1.6 万汉字）；富文本（图片外链）够用，含 base64 图要 MEDIUMTEXT；1MB = 1024KB 是存储进制（硬盘厂商按 1000）
- **int(11) 的括号被 MySQL 8 弃用**：显示宽度不影响范围（int 固定 4 字节），新表写 `int` 即可
- **model 的 setId 能改**：Java 实体只是表结构的内存映射，自增/主键约束在 DB 层；纪律是 insert 别手动传 id、已持久化记录别改 id
- **DDL 的 Updated Rows 0 = 正常**（改结构不改数据）；验证用 SHOW CREATE TABLE
- **LEFT JOIN + 右表字段 IS NOT NULL = INNER JOIN**（已动手改 mall 的 getResourceList 四表联查并测试）

---

## 待补充话题

- 登出方案落地（时间戳黑名单 / token 黑名单二选一）
- 阶段 6 动手开发的完整流程收获

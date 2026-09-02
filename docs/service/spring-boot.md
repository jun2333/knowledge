# Spring Boot 入门与实战（NestJS 开发者视角）

::: tip 背景
承接《Java 入门》，面向熟悉 NestJS 的 JS 开发者。Spring Boot 在生态位上最接近 NestJS——全家桶式应用框架，自带 DI 容器、分层结构、生态整合。本文用 NestJS 做锚点快速建立 Spring Boot 心智模型。
:::

## 快速开始

用 [Spring Initializr](https://start.spring.io)（对应 `nest new`）生成项目：选 Java 17+、Spring Web、Spring Data JPA、MySQL Driver。生成后目录：

```
src/main/
├── java/com/example/demo/
│   └── DemoApplication.java   # 入口，对应 main.ts
└── resources/
    └── application.yml        # 配置文件，对应 .env / config
```

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

启动：`mvn spring-boot:run`（对应 `npm run start:dev`），默认端口 8080。

## IoC/DI 容器：对应 NestJS 的 Module + providers

NestJS 里 `@Injectable()` + `providers` 让框架帮你管理依赖；Spring Boot 做同样的事，只是叫 **IoC 容器（Inversion of Control）**：

| NestJS | Spring Boot |
|--------|-------------|
| `@Injectable()` | `@Service` / `@Component` / `@Repository` |
| Module 中注册 providers | 组件扫描（`@SpringBootApplication` 默认扫本包及子包） |
| 构造函数注入 | 构造器注入（推荐，`final` 字段 + 无需注解） |
| `@Inject()` / `forwardRef` | 字段 `@Autowired`（已过时，见下） |

```typescript
// NestJS
@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}
}
```

```java
// Spring Boot：构造器注入
@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

**核心心智**：Spring 启动时扫描并实例化所有标注了 `@Service`/`@Component` 的类，放进容器统一管理；谁需要谁在构造器里声明，容器自动注入。**不要自己 `new` 业务对象**——那不是 Spring 管理的实例。

## Controller / Service / Repository 分层

### Controller（对应 NestJS Controller）

```typescript
// NestJS
@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get(':id')
  getUser(@Param('id') id: string) { return this.userService.getById(id) }
}
```

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getById(id);
    }

    @PostMapping
    public User create(@RequestBody CreateUserDto dto) {
        return userService.create(dto);
    }
}
```

### Service（业务逻辑层）

```java
@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional          // 对应事务管理，方法内多步 DB 操作要么全成要么全败
    public User create(CreateUserDto dto) {
        return userRepository.save(new User(dto.name()));
    }
}
```

### Repository + Entity（数据访问，对应 TypeORM）

```typescript
// TypeORM
@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id!: number
  @Column() name!: string
}
```

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    // getter/setter 用 Lombok @Data 自动生成
    // 注：Java 16+ 的 record 更适合 DTO（不可变、代码少），
    //     不建议直接当 JPA Entity 用（record 缺无参构造器，JPA 反射需要）
}
```

```java
// Spring Data JPA：接口即实现，方法名即查询
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByName(String name);      // 派生查询
    List<User> findByAgeGreaterThan(int age); // 按方法名自动生成 SQL
}
```

| TypeORM | Spring Data JPA |
|---------|----------------|
| `@Entity('users')` | `@Entity` + `@Table(name = "users")` |
| `@PrimaryGeneratedColumn()` | `@Id` + `@GeneratedValue` |
| `@Column()` | 字段默认映射，无需注解 |
| `repository.find(...)` | `findByName(...)` 方法名即查询 |
| 自定义 SQL | `@Query("SELECT u FROM User u WHERE ...")` |

## Lombok：干掉样板代码

Java 的字段封装要写一堆 getter/setter，Lombok 用注解在**编译期自动生成**，代码里看不到但字节码里有。读真实项目（mall 就是）会大量看到。

```java
@Data
public class UmsAdminLoginParam {
    private String username;
    private String password;
    // 编译后自动有 getUsername()/setUsername()/toString()/equals()/hashCode()
}
```

常用注解：

| 注解 | 生成内容 |
|------|---------|
| `@Data` | getter/setter/toString/equals/hashCode（最常用） |
| `@Getter` / `@Setter` | 只要一半 |
| `@Slf4j` | 生成 `log` 对象，代码里直接 `log.info(...)` |
| `@RequiredArgsConstructor` | 为 final 字段生成构造器（配合构造器注入） |

**对应 JS**：没有直接对应物，可理解为"写注解代替手写样板方法"。注意 Lombok 是编译期魔法，报错信息有时不直观，IDE 需要装 Lombok 插件（IDEA 新版内置）。

## 参数校验与全局异常

### 参数校验：@Validated + 校验注解

Controller 参数上写 `@Validated`，DTO 字段上写规则，请求进来先校验、不通过直接返回错误：

```java
@PostMapping("/login")
public CommonResult login(@Validated @RequestBody UmsAdminLoginParam param) { ... }
```

```java
@Data
public class UmsAdminLoginParam {
    @NotEmpty               // 非空（不能 null 不能 ""）
    private String username;
    @NotEmpty
    private String password;
}
```

常用校验注解：`@NotNull`（非 null）、`@NotEmpty`（非空字符串）、`@NotBlank`（去空格后非空）、`@Min/@Max`（数值范围）、`@Pattern`（正则）、`@Email`。

**对应 NestJS**：`class-validator` 装饰器 + `ValidationPipe`。校验规则放 DTO，逻辑不在 Controller 里。

### 全局异常处理：@RestControllerAdvice（典型用法）

`@RestControllerAdvice` 是"**全局控制器增强器**"——异常处理只是它最常用的能力，它还能做参数绑定（`@InitBinder`）、全局模型数据（`@ModelAttribute`）、响应体增强（实现 `ResponseBodyAdvice`，mall 的 HTTP 状态码语义化改造就用了这个）。这里先讲它最常用的场景：异常兜底。

校验不通过、业务出错，都是抛异常，最后由**全局异常处理器**统一兜底，转成统一格式返回（而不是返回一堆堆栈）。

```java
@RestControllerAdvice          // 全局增强所有 Controller（这里是接住异常）
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)      // 业务异常
    public CommonResult handleApi(ApiException e) {
        return CommonResult.failed(e.getMessage());
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)  // 校验失败
    public CommonResult handleValid(MethodArgumentNotValidException e) {
        return CommonResult.validateFailed("参数校验失败");
    }
    // 还有兜底 Exception.class 处理未知异常
}
```

业务代码里怎么主动报错：`Asserts.fail("密码不正确")` —— 抛一个业务异常，被上面接住转成 `{code, message}` 返回。**你调登录接口输错密码看到的"密码不正确"，就是这条路。**

**对应 NestJS**：`ExceptionFilter`（异常过滤器）+ 业务里 `throw new BadRequestException('密码不正确')`。

## 统一返回约定（CommonResult）

mall 所有接口返回都包一层 `{code, message, data}`（`CommonResult` 类）：

```json
{ "code": 20000, "message": "操作成功", "data": { ... } }
```

mall 的业务码采用分段体系（非 HTTP 状态码）：`2xxxx` 成功 / `4xxxx` 客户端问题 / `5xxxx` 服务端问题，且业务码到 HTTP 状态码有统一映射（如 40000→400、40100→401）。

- `CommonResult.success(data)` → code 20000（HTTP 200）
- `CommonResult.failed("xxx")` → code 50000（HTTP 500）
- `CommonResult.unauthorized(null)` → code 40100（HTTP 401）

**这不是 Spring 的功能，是项目的约定**，但读 mall 每个 Controller 都会看到，先建立认知。**对应 NestJS**：全局 `Interceptor` 统一包装响应体，或手动 return `{code, message, data}`。

## 数据访问：mall 用的是 MyBatis，不是 JPA

上面的 Repository 章节讲的是 Spring Data JPA（自动生成 SQL）。**mall 实际用 MyBatis**——SQL 自己写在 XML 里，更可控，是国内主流（尤其老项目/大厂）。

| | Spring Data JPA | MyBatis（mall 用这个） |
|--|-----------------|----------------------|
| SQL 来源 | 方法名自动生成 | **手写在 XML 里** |
| 代表 | `JpaRepository` | `XxxMapper` 接口 + `XxxMapper.xml` |
| 动态条件 | `findByName(...)` 派生查询 | `XxxExample` 对象拼条件 |
| 代码生成 | 手写 Entity | MyBatis Generator 自动生成 model/mapper/XML |

mall 的数据访问长这样（注意是接口+XML 两件套）：

```java
// mall-mbg：Mapper 接口（MyBatis Generator 生成的）
public interface PmsProductMapper {
    List<PmsProduct> selectByExample(PmsProductExample example);
}
```

```xml
<!-- mall-mbg：同名 XML 写 SQL（MBG 自动生成的动态模板） -->
<select id="selectByExample" resultMap="BaseResultMap" parameterType="...PmsProductExample">
  SELECT ... FROM pms_product
  <if test="_parameter != null">
    <include refid="Example_Where_Clause"/>  <!-- 把 Example 条件对象翻译成 WHERE -->
  </if>
</select>
```

**关键认知**：
- Mapper 接口**没有实现类**，MyBatis 用**动态代理**在运行时生成实现，接口方法名 ↔ XML `<select id>` 一一对应
- 业务里查条件用 `XxxExample.createCriteria().andNameLike(...)` 拼 where，这就是"动态 SQL"——**Java 层拼条件对象（null 守卫），XML 层（`Example_Where_Clause`）按条件类型翻译成 `=`/`between`/`in` 等**
- model / Mapper / XML 都是 **MyBatis Generator** 从数据库表生成的（配置在 `generatorConfig.xml`），不用手写

**对应 NestJS**：更像 TypeORM 的 `@Query`/`QueryBuilder`，SQL 掌控感强于自动生成。

## Spring Security 过滤器链（鉴权是怎么进场的）

Spring Security 把"安全处理"做成一条**过滤器链**，请求先进过滤器链，最后才到 Controller。自定义过滤器通过 `addFilterBefore` 插进链里。

mall 的 JWT 鉴权就是这个套路：

```java
// SecurityConfig 里注册自定义过滤器
http.addFilterBefore(jwtAuthenticationTokenFilter, UsernamePasswordAuthenticationFilter.class);
```

```java
// JwtAuthenticationTokenFilter：从请求头取 token → 解析 → 把用户塞进 SecurityContext
public class JwtAuthenticationTokenFilter extends OncePerRequestFilter {
    protected void doFilterInternal(...) {
        String token = request.getHeader("Authorization");   // "Bearer xxx"
        // 解析 token → 查用户 → 放进 SecurityContextHolder
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
```

Controller 里怎么拿当前用户——Spring MVC 自动注入：

```java
public CommonResult getAdminInfo(Principal principal) {   // Principal = 当前登录用户
    if (principal == null) return CommonResult.unauthorized(null);  // 没登录
    String username = principal.getName();                          // 当前用户名
}
```

**对应 NestJS**：全局中间件（解析 token 挂到 `req.user`）+ `@UseGuards(AuthGuard)`。Spring 的过滤器链 ≈ 中间件洋葱模型，只是更正式。

**相关概念**（阶段深入时会遇到）：
- 白名单：`secure.ignored.urls` 配置的路径直接 `permitAll()`，不用 token（如 `/admin/login`、`/swagger-ui/`）
- 无状态：JWT 模式服务端不存 session，靠每个请求带的 token 认人

## Spring Boot 3 注意：jakarta 包名

Spring Boot 3 从 `javax.*` 迁移到 `jakarta.*`（Eclipse 基金会接管 Java EE 后改名）。mall 是 SB3，代码里全是：

```java
import jakarta.servlet.http.HttpServletRequest;   // SB3
// 网上老教程是：import javax.servlet.http.HttpServletRequest;  // SB2，会报错
```

**看到 `jakarta` 不要慌**，它只是 `javax` 的继任者。搜资料时认准 Spring Boot 3 / jakarta 版本，老教程会带你踩包名坑。

## 高频能力补全（能干活基本够用）

### 日志：@Slf4j

```java
@Slf4j        // Lombok 生成 log 对象
@Service
public class UserService {
    public void create(...) {
        log.info("创建用户: {}", username);   // {} 占位，对应 JS 模板字符串
        log.error("出错", e);
    }
}
```

日志级别（root 默认 info）：`trace < debug < info < warn < error`，yml 里按包调：
```yaml
logging:
  level:
    com.macro.mall.mapper: debug   # 只对 mapper 包开 debug（打印 SQL）
```

### AOP 切面：@Aspect

Spring 的"拦截方法"能力，横切关注点（日志、权限、耗时）抽成切面：

```java
@Aspect
@Component
public class LogAspect {
    // 切点：com.example.service 包下所有 public 方法
    @Around("execution(* com.example.service.*.*(..))")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = pjp.proceed();   // 执行真实方法（对应 JS 的 next()）
        log.info("{} 耗时 {}ms", pjp.getSignature(), System.currentTimeMillis() - start);
        return result;
    }
}
```

**对应 NestJS**：`Interceptor` / 全局守卫。`@Around` ≈ 环绕拦截，`pjp.proceed()` ≈ 中间件的 `next()`（但见下：单切面时更接近"装饰器包装"）。

#### 单切面 vs 多切面（proceed() 的角色）

**单切面**：`pjp.proceed()` 调的是**目标方法本身**（不是别的中间件）——before → 目标方法 → after，等目标方法跑完才回到切面逻辑。更像**装饰器/高阶函数包装**，不是洋葱模型：

```java
@Aspect
@Component
public class LogAspect {
    @Around("execution(* com.example.service.*.*(..))")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        log.info("before");                  // proceed() 之前 = 方法执行前
        Object result = pjp.proceed();       // 同步调目标方法本身，阻塞等它返回
        log.info("after");                   // proceed() 之后 = 方法执行后（异常时不会到这）
        return result;
    }
}
```

```js
// 对应前端：高阶函数包装 withLog(fn)，不是中间件链
function withLog(fn) {
  return function (...args) {
    console.log('before')
    const result = fn(...args)   // 调目标函数本身
    console.log('after')
    return result
  }
}
```

**多切面**：多个 `@Around` 叠加成**切面链**，`pjp.proceed()` 调**下一个切面**（最后一层才是目标方法）——**这时才像洋葱模型**：

```java
@Aspect @Component @Order(1)
public class LogAspect {   // 日志切面（外层）
    @Around("execution(* com.example.service.*.*(..))")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        log.info("日志 before");
        Object r = pjp.proceed();   // 调下一个切面（TxAspect）
        log.info("日志 after");
        return r;
    }
}

@Aspect @Component @Order(2)
public class TxAspect {    // 事务切面（内层）
    @Around("execution(* com.example.service.*.*(..))")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        openTx();
        try { return pjp.proceed(); }   // 最后才是目标方法
        finally { closeTx(); }
    }
}
```

执行顺序（洋葱进出）：`日志 before → 事务 before → 目标方法 → 事务 after → 日志 after`。切面顺序用 `@Order` 控制。

**JS 最小等价演示**（多切面 = 嵌套包装，原理和 Koa 洋葱同构）：

```js
// 每个 @Around 翻译成：收"下一个"引用，返回包装后的函数
const logAspect = (next) => async (...args) => {
  console.log('日志 before')                  // proceed() 之前
  const r = await next(...args)               // proceed()：调下一个切面或目标
  console.log('日志 after')                   // proceed() 之后
  return r
}
const txAspect = (next) => async (...args) => {
  console.log('事务 before（开启）')
  try { return await next(...args) }
  finally { console.log('事务 after（提交）') }
}
const target = async (x) => { console.log('目标方法', x); return x * 2 }

// 多切面 = 嵌套：logAspect(txAspect(target))
await logAspect(txAspect(target))(10)
// 输出：日志 before → 事务 before → 目标方法 10 → 事务 after → 日志 after
```

**和 Koa 的关系**：AOP 切面的 `pjp.proceed()` ≈ Koa 中间件的 `next`——都是"下一个切面/中间件的引用"。`logAspect(txAspect(target))` ≈ `koa.compose([logAspect, txAspect, target])`，嵌套的 Promise 链就是洋葱。

> **关于同步/异步**：上面的 JS 用 `async/await` 是 **JS 语言特性**（单线程 + 异步 IO，koa 的 handler 里可能有 `await` 数据库操作，所以 `next` 必须 await 才保证顺序）。**Java 切面默认是同步的**——`proceed()` 同步阻塞，等目标方法跑完返回。同步/异步只是两种语言"等它跑完再继续"的不同表达，AOP 的核心（包装嵌套 + next 顺序控制）完全一致。若目标方法本身异步（`@Async`/返回 `CompletableFuture`），`proceed()` 拿到 future 即返回，异步等待由线程池处理，不是切面的职责。

| | 单切面 | 多切面 |
|--|--------|--------|
| `proceed()` 调谁 | **目标方法本身** | **下一个切面**（最后才是目标方法） |
| 形状 | 装饰器 / 包装 | 洋葱模型 |
| 对应前端 | `withLog(fn)` | `withLog(withAuth(fn))` 多层包装 |

> 一句话：**单切面是"包一个方法"，多切面才叠成"洋葱"**——`proceed()` 单切面时收权、多切面时下钻。

### 事务避坑：@Transactional

```java
@Override
@Transactional(rollbackFor = Exception.class)   // 放在实现类方法上！
public void doSomething() { ... }
```

三个高频坑：
- **注解放接口上不生效**：Spring Boot 3 默认 CGLIB 代理（基于类），接口注解不被识别 → 必须放**实现类方法**上
- **自调用失效**：同类的 `this.method()` 内部调用不走代理，事务不生效 → 事务方法要跨类调用
- **默认只回滚 RuntimeException**：受检异常要加 `rollbackFor = Exception.class`

### 三个"拦截能力"的区分（面试必问）

| | 生效位置 | 能拿到什么 | 典型用途 |
|--|---------|-----------|---------|
| **Filter**（Servlet） | 请求进 Spring 之前 | HttpServletRequest | 编码、CORS、token 全局处理 |
| **Interceptor**（Spring MVC） | 进 Controller 之前/之后 | Handler + ModelAndView | 登录拦截、日志 |
| **AOP 切面**（Spring） | 方法调用前后 | 方法签名/参数/返回值 | 事务、缓存、日志、耗时 |

请求顺序：`Filter → Interceptor → AOP → Controller 方法`。对应 NestJS：Filter ≈ 全局中间件，Interceptor ≈ 路由守卫。

### 异步 / 定时 / 缓存：三个注解

**共性**：三个都是 Spring 内置（不用自己实现），套路一致——**① 方法上加注解 → ② 启动类加 @EnableXxx 开关 → ③ 可选配基础设施（线程池/缓存管理器）**。

#### @Async（异步方法，后台线程执行）

```java
// 启动类/配置类：@EnableAsync

@Async   // 方法直接返回，实际在后台线程跑（不阻塞调用方）
public void sendEmail(String to) { ... }

@Async("taskExecutor")   // 指定线程池 Bean（不指定用默认的）
public void writeLog() { ... }
```

**适用**：发邮件/短信、写操作日志、耗时的非核心处理（不让用户等）。
**对应 NestJS**：`async` 不完全是——`@Async` 是"另起线程执行"，不是 JS 的异步 await。更像把任务丢给线程池后台跑。
**坑**：自调用失效（同类里 `this.xxx()` 不走代理，和 @Transactional 一样）。

#### @Scheduled（定时任务）

```java
// 启动类/配置类：@EnableScheduling

@Scheduled(cron = "0 0 2 * * ?")       // 每天凌晨 2 点
public void dailyReport() { ... }

@Scheduled(cron = "0 0/10 * * * ?")    // 每 10 分钟
public void cancelTimeoutOrder() { ... }
```

**cron 六个字段**（秒 分 时 日 月 周）：`0 0/10 * * * ?` = 每 10 分钟。在线工具生成即可，不用背。
**适用**：超时订单取消、日报生成、定时拉取。**mall 的 `OrderTimeOutCancelTask` 就是用它**（每 10 分钟取消超时订单，配 `@EnableScheduling`）。
**对应 Node**：`node-cron` / 定时任务库。

#### @Cacheable（方法结果缓存）

```java
// 启动类/配置类：@EnableCaching + 配置 CacheManager（如 Redis）

@Cacheable(value = "user", key = "#id")   // ① 读：有缓存直接返回，没有则执行方法并缓存
public User getById(Long id) { ... }

@CacheEvict(value = "user", key = "#id")  // ② 删缓存：更新/删除数据后调用，让下次读回源
public void delete(Long id) { ... }

@CachePut(value = "user", key = "#user.id") // ③ 更新缓存：每次执行方法并写缓存（慎用，见下）
public User update(User user) { ... }
```

**三兄弟分工**：`@Cacheable` 读（缓存没有才查）、`@CacheEvict` 删（更新后让缓存失效）、`@CachePut` 写（执行并更新缓存）。
**一致性建议**：更新数据 → 先改 DB 再 `@CacheEvict` 删缓存（**别用 @CachePut 覆盖**——DB 写失败缓存还更新了就脏；删缓存让下次读回源最稳）。
**对应 NestJS**：`CacheModule` + `CacheInterceptor`，key 默认参数生成（建议显式 `key = "#id"`）。

#### mall 为什么不直接用 @Cacheable / @Async

| 注解 | mall 的做法 | 为什么 |
|------|------------|--------|
| `@Cacheable` | **自定义 CacheService**（手动读写 Redis） | 要精细控制 key、过期、**防穿透（缓存空值）**、**主动删除**、失败降级——Spring Cache 注解表达不了 |
| `@Async` | **用 MQ（RabbitMQ）** 做异步 | "订单超时取消"需要 **延迟 30 分钟 + 可靠**，线程池做不了延迟语义，MQ 延迟队列天生合适 |
| `@Scheduled` | ✅ 直接用了 | 定时任务无复杂需求，标准注解够用 |

> 判断标准：**框架注解是"快路径"，够用就用（@Scheduled）；不够用就自定义（mall 缓存）/换方案（MQ 异步）**。异步尤其要分清：同进程线程异步（@Async）vs 跨进程消息异步（MQ，可解耦 + 延迟），按需求选。

### 跨域 CORS

```java
@CrossOrigin(origins = "http://localhost:5173")   // 单接口
// 或全局配置：
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**").allowedOrigins("http://localhost:5173");
    }
}
```

对应 NestJS：`app.enableCors({ origin })`。

### 测试：@SpringBootTest

```java
@SpringBootTest
class UserServiceTest {
    @Autowired
    private UserService userService;

    @Test
    void createUser() {
        User u = userService.create(new CreateUserDto("a"));
        assertEquals("a", u.getName());
    }
}
```

对应 NestJS：Jest + `Test.createTestingModule()`。进阶用 `MockMvc` 测 Controller。

### Actuator：生产健康检查

```xml
<!-- pom 加依赖 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

启动后 `GET /actuator/health` 返回服务是否健康，`/actuator/env` 看配置、`/actuator/metrics` 看指标——部署到容器/云平台用它做探活（对应 NestJS 的 `/health` 端点）。

### 文件上传 / 下载

```java
@PostMapping("/upload")
public CommonResult upload(@RequestParam("file") MultipartFile file) {
    // file.getOriginalFilename() 文件名
    // file.getBytes() 文件内容
    file.transferTo(new File("/tmp/" + file.getOriginalFilename()));  // 存到本地
    return CommonResult.success(null);
}

// 下载：ResponseEntity<byte[]> 返回二进制 + 响应头
@GetMapping("/download/{id}")
public ResponseEntity<byte[]> download(@PathVariable Long id) throws IOException {
    // 取文件内容：实际项目里文件可能存磁盘路径 / OSS/MinIO / 数据库 BLOB，按存储位置读
    Path filePath = Paths.get("/tmp/report.xlsx");      // 例：从磁盘路径读
    byte[] data = Files.readAllBytes(filePath);          // ← 把文件内容读成字节数组

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filePath.getFileName())
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .body(data);
}
```

大小限制配置（默认 1MB）：

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB   # 单文件上限
      max-request-size: 10MB # 请求总上限
```

对应 NestJS：`FileInterceptor` + `multer`（`@UseInterceptors(FileInterceptor('file'))`）。

### 静态资源

Spring Boot 默认把 `src/main/resources/static/`（还有 `public/`、`resources/`）下的文件当静态资源直接访问：

```
src/main/resources/static/logo.png  →  http://localhost:8080/logo.png
```

自定义映射目录：

```java
@Configuration
public class StaticConfig implements WebMvcConfigurer {
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/files/**")          // 访问路径前缀
                .addResourceLocations("file:/tmp/uploads/"); // 磁盘目录
    }
}
```

对应 NestJS：`ServeStaticModule` / `app.useStaticAssets()`。

### Jackson 序列化配置

Spring Boot 默认用 Jackson 序列化 JSON（对应 JS 的 `JSON.stringify` + `class-transformer`）：

```java
// ① 字段级：日期格式
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
private Date createTime;

// ② 字段级：忽略 null（不输出为 "field": null）
@JsonInclude(JsonInclude.Include.NON_NULL)
private String remark;
```

全局配置（application.yml）：

```yaml
spring:
  jackson:
    date-format: yyyy-MM-dd HH:mm:ss   # 全局日期格式
    time-zone: Asia/Shanghai
    default-property-inclusion: non_null  # 全局忽略 null 字段
```

注意：**日期默认序列化是时间戳/ISO**，给前端返回 "2026-09-01 10:00:00" 这种格式就靠 `@JsonFormat`。

### Spring Cache 深入

配合 Redis 用缓存（对应 NestJS `CacheModule` + `@UseInterceptors(CacheInterceptor)`）：

```java
@Cacheable(value = "user", key = "#id")        // ① 读：有缓存直接返回，没有则执行方法并缓存
public User getById(Long id) { ... }

@CacheEvict(value = "user", key = "#id")       // ② 删：方法执行后删除缓存（更新/删除数据时用）
public void delete(Long id) { ... }

@CachePut(value = "user", key = "#user.id")    // ③ 写：每次执行方法并更新缓存
public User update(User user) { ... }
```

- **key 默认由参数生成**，建议显式指定 `key = "#id"`（避免类型/toString 不一致）
- `value` = 缓存分区名（Redis 里 key 形如 `user::1`）
- **缓存一致性（高频考点）**：更新数据时先改 DB 再 `@CacheEvict` 删缓存，**不要用 `@CachePut` 直接覆盖**——万一 DB 写失败缓存还更新了，就脏了。删缓存让下次读回源，最稳
- 开启方式：入口类加 `@EnableCaching` + 配置 Redis

## 注解速查表

| 注解 | 作用 | 对应 NestJS |
|------|------|-------------|
| `@SpringBootApplication` | 入口，含组件扫描 | `NestFactory.create()` + Module |
| `@RestController` | JSON 接口控制器 | `@Controller()` |
| `@RequestMapping("/api/users")` | 路由前缀 | `@Controller('api/users')` |
| `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` | HTTP 方法路由 | `@Get()` / `@Post()` 等 |
| `@PathVariable("id")` | 路径参数 | `@Param('id')` |
| `@RequestParam` | 查询参数 | `@Query()` |
| `@RequestBody` | 请求体 | `@Body()` |
| `@Service` / `@Component` / `@Repository` | 注册到容器 | `@Injectable()` |
| 构造器注入（无注解） | `final` 字段 + 构造器（推荐）；Spring 4.3+ 唯一构造器自动注入，不用注解 | 构造函数注入（默认） |
| `@Autowired`（字段） | 字段注入，**已过时**（不可测试、隐藏依赖、循环依赖静默） | — |
| `@Transactional` | 事务边界 | TypeORM 的 `queryRunner` / 事务装饰器 |
| `@Entity` / `@Table` / `@Id` / `@GeneratedValue` | ORM 映射 | TypeORM 装饰器 |
| `@Configuration` | 配置类 | Module 中的 providers/imports |
| `@Value("${server.port}")` | 读取配置 | `process.env` / `ConfigService` |
| `@Data` / `@Slf4j` | Lombok 生成样板代码/日志 | 无（编译期生成） |
| `@Validated` + `@NotEmpty` | 参数校验 | `class-validator` + `ValidationPipe` |
| `@RestControllerAdvice` / `@ExceptionHandler` | 全局控制器增强（异常/绑定/响应） | 异常过滤器 + 全局增强 |
| `@Mapper` | MyBatis Mapper 接口标记 | TypeORM 的 repository |
| `@ConfigurationProperties` | 一组配置绑定成对象 | `ConfigService` |
| `@Aspect` / `@Around` | AOP 切面 | `Interceptor` |
| `@Async` | 异步方法 | 异步执行 |
| `@Scheduled` | 定时任务 | `node-cron` |
| `@Cacheable` | 方法结果缓存 | `CacheInterceptor` |
| `@CrossOrigin` | 跨域 | `enableCors()` |
| `@SpringBootTest` | 集成测试 | Jest |
| `@JsonFormat` | 日期/字段序列化格式 | `class-transformer` 装饰器 |
| `@JsonInclude(NON_NULL)` | 忽略 null 字段 | — |
| `@CacheEvict` / `@CachePut` | 缓存删除/更新 | `CacheInterceptor` 的 invalidation |

## 配置：application.yml（对应 .env）

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/demo
    username: root
    password: secret
  jpa:
    hibernate:
      ddl-auto: update   # 启动时自动建表（开发期），生产建议 none + 迁移工具
```

代码里读取配置两种方式：

```java
// ① @Value：单个值
@Value("${server.port}")
private String port;

// ② @ConfigurationProperties：一组配置绑定成对象（推荐，类型安全）
@ConfigurationProperties(prefix = "spring.datasource")   // 绑 application.yml 的 spring.datasource.*
@Data
public class DataSourceProps {
    private String url;
    private String username;
    private String password;
}
```

**多环境 profile**（对应 NestJS 的 `.env.development` / `.env.production`）：

```yaml
# application.yml
spring:
  profiles:
    active: dev   # 默认激活哪个环境

# application-dev.yml（dev 环境专用配置，自动覆盖同名 key）
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/demo
```

启动时指定环境：`java -jar demo.jar --spring.profiles.active=prod`（对应 `cross-env NODE_ENV=production`）。mall 就是 `application.yml` + `application-dev.yml` 这套。

## 打包与部署

| 步骤 | 命令 | 对应 JS |
|------|------|---------|
| 打包 | `mvn package` | `npm run build` |
| 产物 | `target/demo-0.0.1.jar` | `dist/` |
| 运行 | `java -jar demo.jar` | `node dist/main.js` |
| 内嵌服务器 | jar 自带 Tomcat | Node 自带 HTTP 服务 |

jar 包内嵌 Tomcat，无需单独装服务器，`java -jar` 直接跑——这就是 Spring Boot 的"可执行 jar"。

## 学习路径建议

1. **先跑通**：Initializr 生成项目 → 写一个 User CRUD（Controller → Service → Repository）
2. **理解容器**：写代码时多问一句"这个对象谁 new 的？"——容器帮你 new
3. **实战补充**：Lombok（@Data）、参数校验 + 全局异常（@Validated / @RestControllerAdvice）、统一返回（CommonResult）
4. **数据访问二选一**：JPA（自动生成 SQL）或 MyBatis（SQL 写 XML，mall 用这个）；真实项目用 MyBatis 的比例很高
5. **安全入门**：Spring Security 过滤器链、JWT 无状态鉴权、白名单——读 mall 的 `mall-security` 模块
6. **对照继续**：看到 NestJS 中间件 → 对应 Spring 的 Filter/Interceptor；看到管道 → 对应 `@Valid` + Bean Validation

> 配合实战：用 [Java 实战学习计划](/java-practice/) 里的 mall 项目对照读，效果最好。

## 延伸阅读

- [Java 入门（JS 开发者视角）](/service/java-basics) - 语言基础与 Maven 工程化
- [Spring 核心原理](/service/spring-principles) - IoC 容器、AOP、事务原理
- [设计模式](/service/design-patterns) - Spring 里的模式落地（工厂/代理/策略）
- [TypeORM 用法](/service/typeorm) - JPA 的对照参考
- [NestJS 从入门到放弃](/service/nest) - 你已经掌握的另一侧

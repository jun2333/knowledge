# Spring 核心原理

> **优先级：P0（面试必考）** — 框架原理题：IoC、AOP、Bean 生命周期、循环依赖、事务，是 Spring 岗位的必答组合拳。

::: tip 背景
你已经掌握 NestJS 的 DI 心智（Module/providers/构造器注入），Spring 原理就是把这套心智往深挖一层：容器怎么管理 Bean、怎么解决循环依赖、AOP 怎么织入、事务怎么失效。本文对标面试考点。
:::

## IoC / DI：容器即 Map

IoC（控制反转）：对象创建权从"你自己 new"反转给"容器管理"。Spring 容器本质上是一个大 `Map<String, Object>`（Bean 名 → Bean 实例）：

```
ApplicationContext（容器）
└── beanFactory: Map<beanName, beanDefinition>  →  创建 →  Map<beanName, beanInstance>
```

```java
@Service                    // 容器扫描注册
public class UserService { }

// 使用：不用 new，构造器注入
@RestController
public class UserController {
    private final UserService userService;
    public UserController(UserService userService) {  // 容器自动注入
        this.userService = userService;
    }
}
```

**和 NestJS 的区别**：NestJS 显式在 Module 声明 providers；Spring 靠**组件扫描**（`@ComponentScan`，默认扫启动类所在包）自动发现 `@Service`/`@Component`/`@Repository`/`@Controller`。

## Bean 生命周期（面试必背）

```
实例化（new）
  → 属性填充（依赖注入）
  → 初始化前（@PostConstruct / InitializingBean）
  → 初始化（initMethod）
  → 初始化后（AOP 代理创建：JDK 动态代理 或 CGLIB）
  → 使用中
  → 销毁（@PreDestroy / DisposableBean）
```

**关键点**：AOP 代理在 Bean 初始化之后创建，所以注入的是代理对象而非原始对象。

## AOP：动态代理

AOP（面向切面）用于日志、事务、权限等横切逻辑，底层是动态代理：

| 方式 | 条件 | 原理 |
|------|------|------|
| **JDK 动态代理** | 目标类实现了接口 | 生成接口的代理类（`Proxy.newProxyInstance`），调用时经 InvocationHandler |
| **CGLIB 代理** | 目标类没实现接口 | 生成目标类的子类，重写方法（所以被代理的类/方法不能是 final） |

```java
@Aspect
@Component
public class LogAspect {
    @Around("@annotation(logAnnotation)")
    public Object log(ProceedingJoinPoint pjp, Log log) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = pjp.proceed();      // 执行原方法
        System.out.println("耗时: " + (System.currentTimeMillis() - start) + "ms");
        return result;
    }
}
```

**高频题**：Spring 事务为什么失效（见下）——因为代理！`this.xxx()` 调用不经过代理。

## 循环依赖：三级缓存（必考）

循环依赖：A 依赖 B，B 依赖 A，先创建谁都会缺一方。Spring 用**三级缓存**解决（仅限单例 + 非构造器注入）：

```java
// 三级缓存（DefaultSingletonBeanRegistry 中）
// 1. singletonObjects     一级：成品 Bean（Map<String, Object>）
// 2. earlySingletonObjects 二级：半成品（已实例化未完成属性填充）
// 3. singletonFactories    三级：lambda 工厂（可提前暴露引用，用于 AOP）
```

**流程**（A 依赖 B，B 依赖 A）：

```
创建 A → 实例化 A（空对象）→ 放入三级缓存（提前暴露）
  → 填充属性：需要 B → 创建 B → 实例化 B → 放入三级缓存
    → 填充属性：需要 A → 从三级缓存找到 A 的引用（提升到二级）→ 注入
  → B 完成，放入一级缓存
→ A 拿到 B 引用，继续填充 → A 完成（从三级缓存移除）
```

**为什么三级而不是两级**：三级缓存放的是 **lambda 工厂**，在真正需要时才决定是否创建 AOP 代理——如果 A 最终没被代理，就不用白白创建代理对象；且代理对象必须在引用暴露前生成，否则注入的是原始对象。

**无法解决的循环依赖**：
- 构造器注入的循环依赖（实例化阶段就需要对方）→ 报错 `BeanCurrentlyInCreationException`
- 原型（prototype）作用域 Bean 不缓存 → 报错

## @Transactional 事务（必考失效场景）

Spring 事务是 AOP 实现的：方法执行前开启事务，成功后提交，异常回滚。

```java
@Service
public class OrderService {
    @Transactional
    public void createOrder() { ... }
}
```

**事务失效的 6 个场景**（面试必背）：

| 场景 | 原因 |
|------|------|
| **同类内 `this.xxx()` 调用** | 不走代理，事务切面不生效（最常见！） |
| 方法不是 public | 代理只能拦截 public 方法 |
| 被 `final` 修饰（CGLIB 场景） | 无法生成子类代理 |
| 异常被 try/catch 吞掉 | 异常没抛出去，事务不会回滚 |
| 抛出的是非 RuntimeException | 默认只回滚 RuntimeException/Error，受检异常不回滚（要 `rollbackFor = Exception.class`） |
| Bean 不是由 Spring 管理（自己 new） | 没有代理 |

**解决同类调用**：注入自己（`@Autowired` 自身代理）或拆出另一个 Service 调用。

## 事务传播行为（七种，比"失效场景"问得更勤）

传播行为回答的是：**A 事务方法里调了 B 事务方法，B 用谁的事务？**

| 传播行为 | 行为 | 典型用途 |
|---------|------|---------|
| **REQUIRED**（默认） | 有事务就加入，没有就新建 | 绝大多数业务方法 |
| **REQUIRES_NEW** | **总是新建**，把外层事务挂起 | 记操作日志、发审计记录——外层回滚不能带着日志一起回滚 |
| SUPPORTS | 有就加入，没有就以非事务方式跑 | 查询方法（无所谓事务） |
| NOT_SUPPORTED | 以非事务方式跑，挂起外层事务 | 外层在事务里，但这段耗时操作不想占着事务/连接 |
| MANDATORY | 必须已有事务，否则抛异常 | 强制要求被事务方法调用 |
| NEVER | 必须没有事务，否则抛异常 | 强制要求脱事务执行 |
| **NESTED** | 有事务就建**保存点**（savepoint），没有等同 REQUIRED | 子步骤失败只想回滚子步骤，外层还能继续 |

**面试必答的两组对比**：

```
REQUIRED vs REQUIRES_NEW
  REQUIRED：同一个物理事务，外层回滚 → 内层一起回滚
  REQUIRES_NEW：新开事务 + 独立连接，外层回滚 → 内层已提交，不受影响

REQUIRES_NEW vs NESTED
  REQUIRES_NEW：真正的新事务，提交就落库，外层回滚也救不回来
  NESTED：同一事务里的保存点，外层回滚 → 保存点之后的操作全部回滚
```

**两个实战坑**：

- **REQUIRES_NEW 会多占一个数据库连接**——嵌套层级深 + 并发高时，连接池（默认 Hikari 10 个）容易被占满，出现"等连接超时"而不是慢 SQL
- **同类内调用传播行为也失效**——和 `@Transactional` 一样走不到代理，`this.b()` 里的 REQUIRES_NEW 不生效

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void writeAuditLog(String action) { ... }   // 外层业务回滚，这条日志照样留下
```

## Spring MVC：一个请求怎么走到你的 Controller（必考）

前端最容易答错的一题——因为 Express/Koa 是"中间件洋葱"一条链到底，Spring 是**前端控制器（Front Controller）+ 策略组件**：所有请求先进一个 Servlet，再由它调度一堆可替换的组件。

```
浏览器请求
  → Filter 链（Servlet 规范层：编码/CORS/token）
  → DispatcherServlet.doDispatch()        ← 唯一入口，所有请求都走它
      ① HandlerMapping   查"这个 URL 归谁处理" → HandlerExecutionChain（handler + 拦截器列表）
      ② HandlerAdapter   用适配器去调用 handler（因为 handler 可能是注解方法/函数式端点）
      ③ 参数解析 HandlerMethodArgumentResolver（@RequestBody / @PathVariable / @RequestParam）
      ④ 执行 Controller 方法
      ⑤ 返回值处理 HandlerMethodReturnValueHandler
            @ResponseBody → HttpMessageConverter（Jackson 把对象转 JSON）
            否则 → ViewResolver 找模板（前后端分离基本走不到）
  → 出 Filter 链 → 响应
中途抛异常 → HandlerExceptionResolver（@RestControllerAdvice 就是在这一步接管）
```

**九大组件**（面试常问"DispatcherServlet 里有什么"，答出前四个就够）：

| 组件 | 职责 |
|------|------|
| HandlerMapping | URL → handler 的映射表（`RequestMappingHandlerMapping` 扫描 `@RequestMapping`） |
| HandlerAdapter | 真正执行 handler（`RequestMappingHandlerAdapter` 负责反射调用 + 参数/返回值处理） |
| HandlerExceptionResolver | 异常 → 响应的转换（`@ExceptionHandler` 走这里） |
| ViewResolver | 逻辑视图名 → 真实视图（前后端分离下基本不用） |
| MultipartResolver | 文件上传解析（`MultipartFile` 能拿到就靠它） |
| LocaleResolver / ThemeResolver / FlashMapManager / RequestToViewNameTranslator | 国际化、主题、重定向传参、默认视图名——知道名字即可 |

**三个高频追问**：

1. **为什么要有 HandlerAdapter，不让 DispatcherServlet 直接调 handler？**
   因为 handler 的形态不止一种（注解方法、`HttpRequestHandler`、函数式 `RouterFunction`），适配器让"调度"和"调用方式"解耦——新增一种 handler 只需加一个 Adapter，不动核心流程。

2. **`@ResponseBody` 是怎么变成 JSON 的？**
   `RequestResponseBodyMethodProcessor`（返回值处理器）→ 按 `Accept` 挑一个 `HttpMessageConverter`（Jackson 的 `MappingJackson2HttpMessageConverter`）→ 序列化写入 response body。所以想改 JSON 行为，配的是 `ObjectMapper`，不是配 MVC。

3. **Filter / Interceptor / AOP 三者的边界？**
   Filter 在 Servlet 容器层，拿不到 handler 信息；Interceptor 在 DispatcherServlet 内、能拿到 handler 和 ModelAndView；AOP 在 Bean 方法层，能拿到方法签名/参数/返回值但不知道 HTTP 上下文。详见 [Spring Boot 入门的那张对照表](/service/java/spring-boot)。

## 自动配置原理（Spring Boot）

```java
@SpringBootApplication  // = @SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan
```

- `@EnableAutoConfiguration` 加载自动配置类清单：**Boot 2.7 之前是 `spring.factories`，Boot 3 只认 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`**（Boot 2.7 起新写法，3.0 移除旧机制——看老文章时注意）
- 每个自动配置类用 `@ConditionalOnClass` / `@ConditionalOnMissingBean` 按条件生效
- 所以 pom 引入 `spring-boot-starter-web` 就自动配好 Tomcat + MVC

**高频题**：Spring Boot 为什么"约定优于配置"？——起步依赖 + 自动配置 + 条件装配，你引入什么就自动配什么，想覆盖就自己定义 Bean（`@ConditionalOnMissingBean` 让位）。

## 面试题速查

| 问题 | 一句话答案 |
|------|-----------|
| IoC 是什么 | 对象创建和依赖管理交给容器，不自己 new |
| Bean 生命周期 | 实例化 → 属性填充 → 初始化 → AOP 代理 → 使用 → 销毁 |
| JDK 代理 vs CGLIB | 前者要求接口（JDK 官方），后者生成子类（可无接口，final 不行） |
| 循环依赖怎么解决 | 三级缓存提前暴露半成品引用（仅单例 + setter 注入） |
| 为什么三级不是两级 | 延迟决定是否创建 AOP 代理，避免无效代理 |
| 事务失效常见原因 | 同类 this 调用、异常被吞、非 public、final、受检异常默认不回滚 |
| Spring 事务默认回滚什么 | RuntimeException 和 Error |
| 事务传播行为有哪些 | REQUIRED（默认）/ REQUIRES_NEW / SUPPORTS / NOT_SUPPORTED / MANDATORY / NEVER / NESTED |
| REQUIRED 和 REQUIRES_NEW 区别 | 前者加入同一事务（外层回滚一起滚），后者新开事务独立提交 |
| REQUIRES_NEW 和 NESTED 区别 | 前者真新事务（提交即落库），后者是保存点（外层回滚仍会撤销） |
| 一个请求怎么走到 Controller | DispatcherServlet → HandlerMapping 找 handler → HandlerAdapter 调用 → 参数解析 → 执行业务 → 返回值处理（JSON 靠 HttpMessageConverter） |
| 为什么要 HandlerAdapter | handler 形态多样（注解方法/函数式端点），适配器让调度与调用解耦 |
| @ResponseBody 怎么变 JSON | ReturnValueHandler 选 HttpMessageConverter（Jackson）序列化写回 body |
| Spring Boot 自动配置原理 | 启动时加载 AutoConfiguration.imports（Boot 3）+ @Conditional 条件装配 |

## 延伸阅读

- [Spring Boot 入门](/service/java/spring-boot) - 框架使用层
- [Java 并发编程](/service/java/java-concurrency) - 代理/事务涉及的 AOP 底层
- [Java 语言进阶](/service/java/java-language-advanced) - 反射与注解（IoC/AOP 的基石）
- [设计模式](/service/common/design-patterns) - 单例、代理、工厂在 Spring 中的应用

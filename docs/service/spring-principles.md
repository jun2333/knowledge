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
  → B 完成，销毁
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

## 自动配置原理（Spring Boot）

```java
@SpringBootApplication  // = @SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan
```

- `@EnableAutoConfiguration` 加载 `spring.factories` / `AutoConfiguration.imports` 中的自动配置类
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
| Spring Boot 自动配置原理 | spring.factories + @Conditional 条件装配 |

## 延伸阅读

- [Spring Boot 入门](/service/spring-boot) - 框架使用层
- [Java 并发编程](/service/java-concurrency) - 代理/事务涉及的 AOP 底层
- [设计模式](/service/design-patterns) - 单例、代理、工厂在 Spring 中的应用

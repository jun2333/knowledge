# 设计模式（Java 视角）

> **优先级：P2（加分项）** — 面试不会直接考默写，但"你在项目里用过哪些设计模式"必问，且 Spring 源码全是模式。掌握高频 6 个 + 能说 Spring 中的应用即可。

::: tip 背景
JS 里设计模式同样适用，但 Java 的静态类型 + 接口文化让模式更"正式"。本文只挑面试高频 + Spring 里真实用到的。
:::

## 高频必会 6 个

### 1. 单例模式（Spring 默认 Bean 作用域）

```java
// 饿汉式（类加载即创建，线程安全）
public class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    private Singleton() {}
    public static Singleton getInstance() { return INSTANCE; }
}

// 懒汉式（用到才创建，需双重检查 + volatile）
public class LazySingleton {
    private static volatile LazySingleton instance;
    private LazySingleton() {}
    public static LazySingleton getInstance() {
        if (instance == null) {
            synchronized (LazySingleton.class) {
                if (instance == null) instance = new LazySingleton();
            }
        }
        return instance;
    }
}
```

**Spring 应用**：`@Service` 默认单例（一个 Bean 一个实例）。**注意**：单例 Bean 里不能持有可变实例字段（多线程共享）。

### 2. 工厂模式（BeanFactory 就是工厂）

```java
public interface Shape { void draw(); }
public class Circle implements Shape { public void draw() { ... } }

public class ShapeFactory {
    public Shape create(String type) {
        return switch (type) {
            case "circle" -> new Circle();
            case "square" -> new Square();
            default -> throw new IllegalArgumentException();
        };
    }
}
```

**Spring 应用**：`BeanFactory`/`ApplicationContext` 就是对象工厂；`FactoryBean` 自定义创建逻辑。

### 3. 代理模式（AOP 的底层）

```java
// 静态代理：包装原对象
public class LogProxy implements Service {
    private final Service target;
    public LogProxy(Service target) { this.target = target; }
    public void doWork() {
        System.out.println("before");
        target.doWork();
        System.out.println("after");
    }
}
```

**Spring 应用**：**AOP 就是动态代理**（JDK 代理/CGLIB），`@Transactional`、`@Cacheable` 都靠它（详见 [Spring 核心原理](/service/spring-principles)）。

### 4. 策略模式（消除 if-else 全家桶）

```java
public interface PayStrategy { void pay(BigDecimal amount); }

@Component("wechat") public class WechatPay implements PayStrategy { ... }
@Component("alipay") public class AlipayPay implements PayStrategy { ... }

// 使用：策略注入 Map（Spring 会把同接口所有实现注入进来）
@Autowired
private Map<String, PayStrategy> payStrategyMap;

public void pay(String channel, BigDecimal amount) {
    payStrategyMap.get(channel).pay(amount);   // 替代 switch(channel)
}
```

**Spring 应用**：`Map<String, 接口>` 注入同接口所有实现——这是 Spring 里策略模式的**标准写法**，面试讲这个直接加分。

### 5. 模板方法模式（定义骨架，子类填空）

```java
public abstract class DataProcessor {
    public final void process() {          // 骨架固定
        read();
        validate();
        save();
    }
    protected abstract void read();        // 子类实现
    protected abstract void save();
    protected void validate() { /* 默认实现 */ }
}
```

**Spring 应用**：`JdbcTemplate`、`RestTemplate` 把"获取连接/关闭资源"做成模板，业务只写核心逻辑。

### 6. 观察者模式（事件驱动）

```java
// Spring 的事件机制（最常用的观察者落地）
@Component
public class OrderCreatedEvent extends ApplicationEvent { ... }

// 发布
applicationEventPublisher.publishEvent(new OrderCreatedEvent(order));

// 监听（对应 JS 的 addEventListener）
@EventListener
public void onOrderCreated(OrderCreatedEvent event) { sendSms(event.getOrder()); }
```

**Spring 应用**：`@EventListener`/`@Async` 解耦业务（订单创建 → 发短信/记日志，不用改订单代码）。

## Spring 里其他模式的痕迹（面试谈资）

| 模式 | Spring 中的位置 |
|------|----------------|
| 建造者 | `BeanDefinitionBuilder`、Lombok `@Builder` |
| 装饰器 | `HttpServletRequestWrapper`（请求包装） |
| 适配器 | Spring MVC 的 `HandlerAdapter`（统一适配不同 Controller 方法签名） |
| 组合 | `CompositeCacheManager` 等 |
| 责任链 | Filter 链、拦截器链 |

## 答题模板：项目里用过的模式

> "用过策略模式：支付渠道有微信/支付宝/银联，我用 `Map<String, PayStrategy>` 注入所有实现，新增渠道只要加一个 `@Component` 类，零改动现有代码。Spring 的 AOP 本质是动态代理模式，我的 `@Transactional` 就是它实现的。"

**结构**：模式名 + 场景（真实业务）+ 怎么用（代码结构）+ 收益（解耦/扩展性）。别背定义。

## 面试题速查

| 问题 | 要点 |
|------|------|
| 单例怎么写 | 饿汉（简单）/ 懒汉双重检查 + volatile（延迟加载） |
| 单例和 Spring 的关系 | Spring Bean 默认单例 |
| 代理模式的两种实现 | JDK（需接口）/ CGLIB（子类），Spring AOP 二选一 |
| 策略模式怎么避免 if-else | Map 注入同接口实现，按 key 取 |
| 模板方法 vs 策略 | 模板：继承 + 骨架固定；策略：组合 + 可替换 |
| 观察者在 Spring 里 | @EventListener 事件机制 |

## 延伸阅读

- [Spring 核心原理](/service/spring-principles) - AOP 动态代理、单例容器
- [Java 并发编程](/service/java-concurrency) - 单例的线程安全问题
- [Java 入门（JS 开发者视角）](/service/java-basics) - 语言基础

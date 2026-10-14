# Java 语言进阶（JS/TS 开发者视角）

> **优先级：P0（面试必考）** — 泛型、反射、注解是 Java 中高级岗的必问组合；String/equals/hashCode 契约是日常踩坑王；新特性梳理帮你把散落的知识串成线。

::: tip 背景
《Java 入门》带你建立了 Java 心智，但"能干活"和"能过面试、能读框架源码"之间还差一层：泛型的类型擦除、反射为什么是 Spring 的基石、注解到底怎么被读取、String 为什么不可变、Java 8 以后每个版本都加了什么。本文用 TS/JS 概念做锚点，一次讲透。
:::

## 泛型：编译期的类型安全网

### 先建立对照

TS 开发者对泛型不陌生，但 Java 泛型有一条**本质差异：类型擦除**。

```typescript
// TS：泛型是"编译期检查"，编译后类型信息消失（和 Java 一样）
function first<T>(arr: T[]): T { return arr[0]; }
// 运行时就只是 JS，没有 T 了
```

```java
// Java：同样是编译期检查，运行后类型信息也没了（擦除）
public static <T> T first(List<T> list) { return list.get(0); }
```

看起来一样？往下看第三节，差异在**运行时的表现**上。

### 基本用法

```java
// 泛型类
public class Box<T> {
    private T value;
    public T get() { return value; }
    public void set(T value) { this.value = value; }
}
Box<String> box = new Box<>();   // 钻石语法 <>，左边写了右边可省

// 泛型方法（注意 <T> 在返回类型前）
public static <T> T pick(T a, T b) { return a; }

// 泛型接口
public interface Result<T> { T getData(); }
```

**泛型的价值**：把运行时的 `ClassCastException`（类型转换异常）提前到编译期。没有泛型时，`List` 里取出来是 `Object`，用错类型运行时才炸：

```java
List list = new ArrayList();     // 裸类型（raw type），不要用
list.add("hello");
Integer num = (Integer) list.get(0);   // 编译不报错，运行抛 ClassCastException
```

### 类型擦除（面试必考）

**Java 的泛型只存在于编译期**。编译后 `List<String>` 和 `List<Integer>` 都变成裸的 `List`，类型参数被替换为**上界**（没写上界就是 `Object`）：

```java
List<String> strings = new ArrayList<>();
List<Integer> integers = new ArrayList<>();
strings.getClass() == integers.getClass();   // true！运行时分不出 String 和 Integer
```

由此派生一串经典后果：

| 现象 | 原因 |
|------|------|
| `new T()` 编译报错 | 擦除后不知道 T 的真实类型，无法实例化 |
| `new List<String>[10]` 编译报错 | 泛型数组会破坏数组的运行时类型检查 |
| `list instanceof List<String>` 编译报错 | instanceof 只认裸类型 `List` |
| 泛型变量不能是静态的 | 静态属于类，擦除后无法区分 T |
| 同一个类不能重载 `f(List<String>)` 和 `f(List<Integer>)` | 擦除后签名相同 |

**绕过擦除的常见手段**（了解即可）：

```java
// ① 传 Class 对象，"手动带类型"
public static <T> T parse(String json, Class<T> clazz) {
    return objectMapper.readValue(json, clazz);   // Jackson/Gson 都这么干
}

// ② 反射拿泛型信息（Spring 大量用）：方法/字段声明的泛型在字节码里其实有记录
```

> 面试一句话：**Java 泛型是编译期糖，运行时擦除为 Object（或上界）；TS 泛型同理但 JS 连类型都没有**。

### 通配符与 PECS 原则

泛型容器之间**不能相互赋值**：`List<String>` 不是 `List<Object>` 的子类。要让方法"接收各种类型的 List"，用通配符 `?`：

```java
// 无界通配符：只读不写
public static void printAll(List<?> list) {
    for (Object o : list) System.out.println(o);
}

// 上界通配符 ? extends E：能读（当 E 用），不能写（不知道具体子类型）
public static double sum(List<? extends Number> nums) {
    double total = 0;
    for (Number n : nums) total += n.doubleValue();   // 读出当 Number 用，安全
    return total;
}
sum(List.of(1, 2, 3));          // ✅ List<Integer> 是 List<? extends Number>
sum(List.of(1.5, 2.5));         // ✅ 同理

// 下界通配符 ? super E：能写（当 E 用），读出来只是 Object
public static void addNumbers(List<? super Integer> list) {
    list.add(1);   // 写入安全：list 至少是 Integer 的容器
}
```

**PECS 原则**（面试高频，来自 Effective Java）：**Producer Extends, Consumer Super**。

- 容器只"生产"数据给你（你要读）→ `? extends E`
- 容器只"消费"你给的数据（你要写）→ `? super E`
- 两者都干 → 精确类型 `<T>`

```java
// JDK 自己的例子：Collections.copy(List<? super T> dest, List<? extends T> src)
// dest 是消费方（被写入），src 是生产方（被读取）——教科书级 PECS
```

### 面试题速查（泛型）

| 问题 | 一句话答案 |
|------|-----------|
| 什么是类型擦除 | 编译后泛型参数被替换为上界/Object，运行时分不出 `List<String>` 和 `List<Integer>` |
| `List<String>` 是 `List<Object>` 的子类吗 | 不是，泛型不支持协变，靠通配符 `? extends` 实现"灵活的读" |
| PECS 是什么 | Producer Extends / Consumer Super：读用 extends，写用 super |
| 为什么不能 `new T()` | 擦除后运行时不持有 T 的真实类型信息 |

---

## 反射：运行时操作类的"后门"

### 是什么

**编译期你知道的一切，反射让你在运行时也能拿到**：类名、有哪些字段/方法/构造器、方法能不能调、字段能不能改、注解写了什么。

**TS 对照**：TS 的类型只存在于编译期，运行时啥都不剩。反射相当于 JS 的 `typeof` + 属性遍历 + 动态调用三件套，但能力远大于此——它能访问 `private` 成员。

```java
// 编译期：User user = new User();  类型清清楚楚
// 运行时通过反射：我手里只有一个字符串 "com.example.User"，也能把它 new 出来、调它的方法
```

### Class 对象：反射的入口

每个被加载的类在 JVM 里有唯一一个 `Class` 对象，三种获取方式：

```java
// ① 类名.class（编译期确定，最常用）
Class<User> c1 = User.class;

// ② 对象.getClass()
Class<? extends User> c2 = new User().getClass();

// ③ Class.forName（运行时动态加载，框架最爱——配置里写个字符串类名就能加载）
Class<?> c3 = Class.forName("com.mysql.cj.jdbc.Driver");
```

### 常用 API 四件套

```java
Class<?> clazz = Class.forName("com.example.User");

// 1. 创建实例（要求有无参构造器）
Object obj = clazz.getDeclaredConstructor().newInstance();

// 2. 调用方法
Method m = clazz.getMethod("getName");          // 只能拿 public
m.invoke(obj);                                   // 等价于 obj.getName()

// 3. 读写字段（包括 private）
Field f = clazz.getDeclaredField("password");
f.setAccessible(true);                           // 绕过 private 检查（框架常用）
f.set(obj, "newPassword");

// 4. 读注解（见下一节）
MyAnnotation anno = clazz.getAnnotation(MyAnnotation.class);
```

### 反射在哪用（前端最该建立的认知）

你不是为了用反射而学它，而是**读框架代码时到处都会遇到它**：

| 场景 | 反射在干什么 |
|------|-------------|
| Spring IoC | 扫描到 `@Service` 的类名字符串 → `Class.forName` → `newInstance` → 放进容器 Map |
| Spring AOP/事务 | 运行时生成代理类，反射调用原方法 |
| MyBatis | Mapper 接口没有实现类，MyBatis 用 JDK 动态代理（底层反射）生成实现 |
| 注解处理 | `getAnnotation` 读注解值，决定行为 |
| JSON 序列化 | Jackson/Gson 遍历对象的每个字段，反射读写 |
| JDBC | `Class.forName("com.mysql.cj.jdbc.Driver")` 加载驱动 |

```java
// Spring 创建 Bean 的心智模型（简化）
String className = scanResult;                    // 组件扫描得到的类名
Class<?> clazz = Class.forName(className);        // 加载
Object bean = clazz.getDeclaredConstructor().newInstance();   // 实例化（new 的替代）
// 检查有没有 @Autowired 字段，有就反射 set 进去……
```

### 性能与注意点

- 反射调用比直接调用慢（有检查开销），`setAccessible(true)` 后接近直接调用；热点路径别用反射
- 会破坏封装：能改 `private` 字段，所以 JDK 9+ 模块化后反射外部模块会受限
- `newInstance()` 已过时（异常处理不友好），用 `getDeclaredConstructor().newInstance()`

---

## 注解：给框架看的"标签"

### 是什么

注解（Annotation）是**代码里的元数据标签**，本身不执行任何逻辑——写了 `@Service` 不会发生任何事，**是 Spring 扫描到它后用反射读取，才执行了注册逻辑**。

**TS 对照**：最接近的是**装饰器**（`@Injectable()`），同样"本身不干活，是 NestJS 框架读取后干活"。

```java
@Service                  // ← 注解只是个标记
public class UserService { }
// 真正干活的：Spring 启动时扫描所有类 → 发现这个标记 → 反射创建实例 → 放进容器
```

### 自定义一个注解

```java
@Retention(RetentionPolicy.RUNTIME)          // ① 保留到运行时（框架要反射读）
@Target(ElementType.METHOD)                  // ② 只能贴在方法上
public @interface LogCost {
    String value() default "";               // 注解的"参数"
    boolean ignoreException() default false; // 可以有默认值
}
```

```java
// 用起来
@LogCost("创建用户")
public void createUser() { }
```

```java
// 框架怎么读（AOP 切面里）
Method method = ...;
LogCost anno = method.getAnnotation(LogCost.class);   // 反射读取
if (anno != null) {
    log.info("{}", anno.value());      // 拿到注解里写的 "创建用户"
}
```

### 四个元注解（面试常考）

| 元注解 | 作用 | 说明 |
|--------|------|------|
| `@Retention` | 存活到哪个阶段 | `SOURCE`（编译后丢弃）/ `CLASS`（字节码有，运行时没有）/ **`RUNTIME`**（运行时可反射读，框架注解都用这个） |
| `@Target` | 能贴在哪 | `TYPE`（类）/ `METHOD` / `FIELD` / `PARAMETER` 等，可多选 |
| `@Documented` | 进 Javadoc | 仪式性，基本不用管 |
| `@Inherited` | 子类继承父类注解 | 只对类生效，且要配合反射读类注解才有意义 |

**面试题：`@Retention(RetentionPolicy.RUNTIME)` 什么意思？**——注解保留到运行时，框架可以通过反射读到。如果是 `SOURCE`（如 `@Override`），编译完就没了，运行时读不到。

### 常见内置注解

| 注解 | 作用 |
|------|------|
| `@Override` | 标记重写父类方法，写错编译器报错（SOURCE 级） |
| `@Deprecated` | 标记废弃，调用处编译警告 |
| `@FunctionalInterface` | 标记函数式接口（只有一个抽象方法），编译期校验 |
| `@SuppressWarnings("unchecked")` | 压制编译警告 |

**核心认知**：注解 = 数据，框架 = 读者。看任何框架源码，先问"这个注解被谁读取了"，答案永远在反射里。

---

## String 与 equals/hashCode 契约

### String 不可变（Immutable）

Java 的 `String` 对象创建后**内容不能改**，所有"改"操作都返回新对象：

```java
String s = "hello";
s.toUpperCase();              // 返回 "HELLO"，但 s 还是 "hello"
s + " world";                 // 创建了新 String，s 不变

String a = "java";
a = a.concat("script");       // a 指向新对象 "javascript"，原 "java" 还在常量池
```

**为什么不可变**（面试常问）：① 安全（密码、网络连接地址不能被人改）② 哈希缓存（`hashCode` 算一次存起来，当 HashMap key 快）③ 线程安全（天生安全，不用同步）④ 字符串常量池复用。

**JS 对照**：JS 的 string 原生也不可变，语义一致。但 Java 里**拼接字符串有坑**：

```java
// ❌ 循环里拼接：每次 += 都创建新对象，O(n²)
String result = "";
for (String s : list) { result += s; }    // 性能灾难

// ✅ 用 StringBuilder（可变字符序列）
StringBuilder sb = new StringBuilder();
for (String s : list) { sb.append(s); }
String result = sb.toString();
```

`StringBuilder`（快，非线程安全）vs `StringBuffer`（慢，线程安全，方法有 synchronized）——**单线程用 Builder，别无脑用 Buffer**。

### 字符串常量池与 == 之谜

```java
String a = "hello";              // 字面量 → 进常量池
String b = "hello";              // 同一个池里的对象
String c = new String("hello");  // 强制 new → 堆上新对象
a == b;    // true（池里同一份）
a == c;    // false！（不同对象）
a.equals(c);   // true（内容相同）——永远用 equals 比内容！
```

**铁律**：**比字符串内容永远用 `equals`，`==` 比的是引用**。面试题 "`new String("abc")` 创建了几个对象"：字面量 `"abc"` 进池算一个，`new` 在堆上再建一个，答案 1 或 2 取决于池里有没有。

### equals / hashCode 契约（面试必考）

**契约三条**（Effective Java 原文精髓）：

1. `equals` 为 true 的两个对象，`hashCode` **必须**相同
2. `hashCode` 相同的两个对象，`equals` **不一定** true（哈希碰撞正常）
3. 重写 `equals` 必须同时重写 `hashCode`

```java
public class User {
    private Long id;
    private String name;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        User other = (User) o;
        return Objects.equals(id, other.id);      // 按业务标识字段比
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);                  // 用 equals 里相同的字段
    }
}
```

**不遵守契约的后果**：自定义对象直接塞 `HashMap` 当 key，`map.get(new User(1L))` **死活查不到**——因为两个内容相同的 key 哈希不同，落在不同桶里。这是新手最高频的 bug 之一。

Lombok `@Data` / `@EqualsAndHashCode` 会自动生成这对方法；`record` 自动按字段值比较（见《Java 入门》）。

---

## Java 8-21 新特性系统梳理

按版本串一遍，每个配最小示例。**新项目建议 JDK 17/21（LTS）**。

| 版本 | 特性 | 状态 |
|------|------|------|
| 8 (2014) | Lambda、Stream、Optional、新日期 API、默认方法 | LTS，必会 |
| 9 (2017) | 模块化、接口私有方法、`List.of` 等工厂方法 | LTS |
| 10 (2018) |`var` 局部类型推断 | 常用 |
| 11 (2018) |`String` 新方法（isBlank/strip/lines）、`var` 用于 lambda | LTS |
| 14 (2020) | `switch` 表达式 | 正式 |
| 15 (2020) | 文本块（Text Blocks） | 正式 |
| 16 (2021) | `record`、`instanceof` 模式匹配 | 正式 |
| 17 (2021) | `sealed` 密封类 | 正式，LTS |
| 21 (2023) | **虚拟线程**、`switch` 模式匹配正式、 sequenced collections | LTS |

### Java 8：函数式三件套（已在《Java 入门》展开）

Lambda / Stream / Optional。补一个**新日期 API**（老 `Date`/`Calendar` 难用，面试问过）：

```java
LocalDateTime now = LocalDateTime.now();
LocalDateTime tomorrow = now.plusDays(1);
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
String formatted = now.format(fmt);          // "2026-10-13 11:00:00"
```

不可变 + 链式 + 线程安全，对应 JS 的 `Temporal` 提案（还没进标准）。

### Java 10+：var 局部类型推断

```java
var list = new ArrayList<String>();    // 编译期推断为 ArrayList<String>
var user = new User();                 // 推断为 User
```

**注意**：`var` 不是动态类型，推断出来就固定了；只能用于局部变量（方法内），不能用于字段/方法签名/构造参数。可读性优先：`var user = new User()` 比全写更清晰，`var x = get()` 反而藏了类型——团队约定通常"右边能看出类型才用 var"。

### Java 11：String 新方法

```java
"  ".isBlank();          // true（比 isEmpty 强：空白字符也算空）
"  hi  ".strip();        // "hi"（比 trim 强：支持 Unicode 空白）
"A\nB".lines().count();  // 2
"abc".repeat(3);         // "abcabcabc"
```

### Java 14：switch 表达式（能返回值、不用 break）

```java
// 老 switch：啰嗦、易忘 break 穿透
int numLetters;
switch (day) {
    case MONDAY: case FRIDAY: numLetters = 6; break;
    default: numLetters = -1; break;
}

// 新 switch 表达式：箭头 + 返回值
int numLetters = switch (day) {
    case MONDAY, FRIDAY -> 6;
    case TUESDAY -> 7;
    default -> -1;
};
```

### Java 15：文本块（多行字符串）

```java
// 以前：拼字符串地狱
String json = "{\n  \"name\": \"tom\",\n  \"age\": 18\n}";

// 现在：三引号直接写
String json = """
        {
          "name": "tom",
          "age": 18
        }""";
```

对应 JS 的模板字符串。SQL/JSON/HTML 大片场景极其舒服。

### Java 16：instanceof 模式匹配 + record 回顾

```java
// 以前：先判断再强转，样板两行
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// 现在：判断 + 绑定一步
if (obj instanceof String s) {
    System.out.println(s.length());   // s 已绑定
}
```

`record` 见《Java 入门》record 详解——DTO 首选，一行顶几十行。

### Java 17：sealed 密封类（受限继承）

```java
// 只有指定的类能继承 Shape
public sealed class Shape permits Circle, Rectangle, Triangle { }

public final class Circle extends Shape { }
public final class Rectangle extends Shape { }
public final class Triangle extends Shape { }
```

用途：**框架作者控制继承体系**（如 JDK 的异常层级、未来的模式匹配穷尽性检查）。配合 `switch` 模式匹配，编译器能检查"所有子类都覆盖了没"。普通业务代码很少写，但读 JDK/框架源码会见到。

### Java 21：虚拟线程（高并发新利器）

```java
// 传统线程：一个线程 ≈ 1MB 栈，几千个就吃紧
Thread.startVirtualThread(() -> {
    System.out.println("跑在虚拟线程上");
});

// 配合结构化并发（预览）：起一批任务，等全部完成
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    scope.fork(() -> fetchUser());
    scope.fork(() -> fetchOrders());
    scope.join();          // 等两个都完成
}
```

**为什么重要**：Java 传统的"一请求一线程"模型，线程数受内存限制（几千到顶）。虚拟线程由 JVM 调度，**百万级**，阻塞时几乎零成本——Spring Boot 3.2+ 一行配置 `spring.threads.virtual.enabled=true` 即可开启。**面试加分项，也是未来高并发的主流方向**，详见《Java 并发编程》。

---

## 面试题速查

| 问题 | 一句话答案 |
|------|-----------|
| 什么是类型擦除 | 泛型只存在于编译期，运行后替换为上界/Object，`List<String>.getClass() == List<Integer>.getClass()` |
| PECS 原则 | 生产数据用 `? extends`，消费数据用 `? super` |
| 反射能干什么 | 运行时拿 Class 对象，创建实例、调方法、改字段、读注解 |
| 注解本身有逻辑吗 | 没有，注解是数据；框架用反射读取后才干活（类比装饰器） |
| `@Retention(RUNTIME)` 意思 | 注解保留到运行时，可被反射读取 |
| String 为什么不可变 | 安全、哈希缓存、线程安全、常量池复用 |
| `==` 和 equals 区别 | `==` 比引用，equals 比内容；String 比内容一律用 equals |
| 重写 equals 忘了 hashCode 会怎样 | 违反契约，对象当 HashMap key 时查不到 |
| StringBuilder vs StringBuffer | 前者非线程安全但快，后者 synchronized 安全但慢；单线程用 Builder |
| 循环里怎么拼字符串 | StringBuilder，别用 `+=`（O(n²)） |
| sealed 类干什么用 | 限制哪些类能继承，配合模式匹配做穷尽性检查 |

## 延伸阅读

- [Java 入门（JS 开发者视角）](/service/java/java-basics) - 语言基础、record、Stream
- [Java 集合源码](/service/java/java-collections) - 泛型容器 + equals/hashCode 实战
- [Spring 核心原理](/service/java/spring-principles) - 反射 + 注解 + 动态代理的集大成者
- [Java 并发编程](/service/java/java-concurrency) - 虚拟线程专题
- [Java IO/NIO 与序列化](/service/java/java-io) - 反射之外的另一块语言进阶
- [你不知道的 JS](/books/js-you-dont-know) - JS 侧的类型与对象基础

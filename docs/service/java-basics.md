# Java 入门（JS 开发者视角）

::: tip 背景
面向已有 Node.js/TypeScript 开发经验、快速转全栈的读者。本文不重复讲"编程是什么"，而是把 JS 概念映射到 Java，帮助最短时间建立 Java 心智模型。
:::

## 为什么学 Java

Java 是后端企业级应用的主流语言，Spring 生态在金融、电商、微服务领域占据主导地位。对全栈开发者而言，Java 补的是"企业级后端"这块拼图：

| 维度 | Node.js | Java |
|------|---------|------|
| 典型场景 | 快速迭代、BFF、中小规模服务 | 企业级、高并发、微服务、大型系统 |
| 生态 | npm 包生态 | Maven 中央仓库生态 |
| 就业市场 | 前端转全栈热门 | 后端岗位基本盘 |
| 性能模型 | 单线程 + 事件循环 | 多线程 + 线程池 |

---

## 语言基础：JS → Java 对照

### 变量与类型

```javascript
// JS：动态类型，运行时才知道是什么类型
let count = 1
count = 'abc'        // 合法
const name = 'x'
```

```java
// Java：静态强类型，编译期检查
int count = 1;
count = "abc";       // 编译报错
final String name = "x";  // final ≈ const

var count2 = 1;      // Java 10+ 类型推断，但一旦推断就固定类型
```

| JS | Java | 说明 |
|----|------|------|
| `let` | 类型 + `var` | `var count = 1` 是类型推断，不是动态类型 |
| `const` | `final` | 引用不可变 |
| `number` | `int` / `double` / `long` | JS 只有 number，Java 按字节数分多种 |
| `string` | `String` | 注意 Java 是 `String`（大写） |
| `boolean` | `boolean` | |
| `null` / `undefined` | `null` / `Optional` | 见下文 null 处理 |
| `object` / `array` | 类 / 集合 | 见下文 |

**核心差异**：JS 是动态类型（类型错误运行时才爆），Java 是静态强类型（编译期就拦截）。写 JS 时"偷懒不写类型"的坏习惯在 Java 里会被编译器教育。

### 类与对象

```javascript
// JS：对象字面量 + 原型
const user = { name: 'x', age: 18 }
```

```java
// Java：class 声明 + 构造器 + getter/setter
public class User {
    private String name;
    private int age;

    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() { return name; }
    public int getAge() { return age; }
}
```

Java 16+ 提供了 `record`，一步到位（对应 TS 的 interface + 数据类）：

```java
public record User(String name, int age) {}
// 自动生成：构造器、getter（name()）、equals、hashCode、toString
```

**record 是干什么的**：专门定义"纯数据类"——只装数据、没有业务方法的类（DTO、接口响应对象）。它解决 Java 最大的痛点：样板代码。传统写法要手写私有字段、构造器、访问器、`equals`/`hashCode`/`toString` 各一大段（几十行），record 一行全包，且字段自动 `final`（不可变，天然线程安全、可安全作 Map key）：

```java
User user = new User("张三", 18);
user.name();    // "张三"（注意访问器是 name()，不是 getName()）
user.toString(); // User[name=张三, age=18]
new User("张三", 18).equals(new User("张三", 18));  // true，自动按字段比较
```

需要业务方法时（如 `user.isAdult()`）退回普通 class；纯数据一律用 record。

| JS | Java | 说明 |
|----|------|------|
| 对象字面量 `{}` | class / record | record 是数据载体首选 |
| 原型链继承 | 类继承 + `interface` | Java 单继承 + 多实现接口 |
| `this` | `this` | 语义类似，无箭头函数绑定问题 |
| `Object.assign` | 无直接对应 | 手动写构造器或 builder 模式 |
| 解构 `{a, b} = obj` | 无直接对应 | record 的 `user.name()` 访问 |

#### record 详解（Java 16+ 的数据载体）

**它是语言级特性（不是 Spring/框架功能）**：JDK 16 正式引入，`javac` 编译器原生支持，不依赖任何 jar——Spring Boot 3 用 Java 17 所以天然可用。

**解决什么**：Java 最大的痛点——数据类的样板代码。手写一个只装数据的类要几十行（私有字段 + 构造器 + getter + equals/hashCode/toString），record 一行全包：

```java
// 手写（几十行）                          // record（一行）
public class User {                        public record User(String name, int age) {}
    private final String name;             // 自动生成：
    private final int age;                 //   final 字段（不可变）
    public User(String name, int age) {    //   全参构造器
        this.name = name;                  //   访问器 name() / age()（不是 getName）
        this.age = age;                    //   equals / hashCode（按字段值比较）
    }                                      //   toString
    public String name() { return name; }
    public int age() { return age; }
}
```

**使用与自动能力**：

```java
User u = new User("张三", 18);
u.name();                                   // 访问器是 name()，不是 getName()
u.age();
new User("张三", 18).equals(new User("张三", 18));   // true（按字段值比）
u.toString();                               // User[name=张三, age=18]
```

**record 还能带逻辑（不只是"纯一行"）**：

```java
public record UserSession(Long userId, String username, List<String> roles) {

    // ① compact constructor：省去参数声明，直接写校验 + 防御拷贝（record 特色语法）
    public UserSession {
        if (userId == null) throw new IllegalArgumentException("userId 不能为空");
        roles = List.copyOf(roles);          // 拷贝成不可变 List，防外部篡改
    }

    // ② 静态工厂（替代复杂构造，起语义名字）
    public static UserSession of(Long userId, String username, List<String> roles) {
        return new UserSession(userId, username, roles);
    }

    // ③ 可以有只读计算方法（不新增字段就行）
    public boolean isAdmin() { return roles.contains("超级管理员"); }
}

// ④ record 可以 implements 接口（如序列化标记/业务接口）
public record ApiResponse<T>(int code, String message, T data) implements java.io.Serializable { }

// ⑤ 支持泛型（上面的 ApiResponse<T>）；也支持嵌套（record 里放 record）
```

**record vs Lombok @Data 怎么选**：

| | record | Lombok @Data |
|--|--------|-------------|
| 谁提供 | Java 语言（JDK 16+） | 第三方库（Lombok 插件） |
| 可变性 | 不可变（字段 final，无 setter） | 可变（有 setter） |
| 适合 | DTO / 值对象（只读传输） | 实体 / 可变 Bean（MyBatis 实体要 set） |

**什么时候别用 record**：
- 需要**可变**（框架要 setter——MyBatis 实体类）
- 需要**继承**别的类（record 是 final，只能 implements 不能 extends）
- 需要无参构造（record 只有全参构造器，可用重载/静态工厂补充）

**JS 视角一句话**：record ≈ **"不可变的纯数据类语法糖"**——像 TS 里 `type User = { name: string; age: number }` + 自动实现值比较和克隆不可变对象，Java 用 `record` 关键字一个声明全给。

**实践建议**：后端**接口传输对象（DTO/响应体）一律用 record**；数据库实体、要赋值的 Bean 继续 class + Lombok。

### 接口与实现类（interface / implements）

TS 的 interface 只是类型约束；Java 的 interface 是"**契约 + 可多实现**"，配合实现类使用。

```typescript
// TS：interface 只是类型，没有实现
interface UserService {
  getByUsername(username: string): User
}
```

```java
// Java：interface 声明方法签名（"能做什么"），实现类写逻辑（"怎么做"）
public interface UmsAdminCacheService {
    void delAdmin(Long adminId);
    UmsAdmin getAdmin(String username);
}

public class UmsAdminCacheServiceImpl implements UmsAdminCacheService {
    public void delAdmin(Long adminId) { /* 真正的逻辑 */ }
    public UmsAdmin getAdmin(String username) { /* 真正的逻辑 */ }
}
```

| JS | Java |
|----|------|
| TS `interface`（纯类型） | `interface`（契约，可多实现） |
| 一个类 implements 多个接口 | 类似 TS：单继承类 + 多实现接口 |
| 直接 new 一个类 | 用接口类型声明，运行时是具体实现类 |

**为什么拆"接口 + 实现"（面试常问）**：
1. **解耦**：调用方只认接口，换实现不影响上游
2. **多实现**：一个接口多个实现类（如缓存：Redis 实现 / 本地实现，按环境切换）
3. **代理**：Spring 的 JDK 动态代理（事务/缓存切面）基于接口
4. **测试**：mock 接口比 mock 具体类更干净

**现代趋势**：接口+实现成对出现是**老风格**（2018 年前后，mall 就是这样）；单体新项目常直接 `@Service` 一个类搞定，只在确实需要多实现/跨模块解耦时才拆接口。

**接口 vs 抽象类**（面试加分）：
- 接口：纯契约，可多实现，字段只能是常量
- 抽象类：可含已实现方法 + 状态，单继承
- 一句话：接口侧重"能力约定"，抽象类侧重"部分共用实现"

### 集合框架

```javascript
// JS：数组 + 对象当 Map 用
const arr = [1, 2, 3]
const map = { a: 1, b: 2 }
```

```java
// Java：List + Map 接口，用实现类实例化
List<Integer> list = new ArrayList<>();
list.add(1); list.add(2); list.add(3);

Map<String, Integer> map = new HashMap<>();
map.put("a", 1); map.put("b", 2);
```

| JS | Java | 说明 |
|----|------|------|
| `[]` | `List`（`ArrayList`/`LinkedList`） | 接口 + 实现类 |
| `{}` 当 Map | `Map`（`HashMap`/`LinkedHashMap`） | 注意 JS 的 `{}` 键只能是字符串 |
| `Set`（ES6） | `Set`（`HashSet`） | 同名 |
| 泛型（TS） | 泛型 `<T>` | 概念一致 |

**高频坑**：Java 集合只能装引用类型，不能装原始类型（`List<int>` 报错，要写 `List<Integer>`）。

### 方法与 Lambda

**① 先认识方法（Method）**

```java
// JS：普通函数
function add(a, b) { return a + b; }
add(1, 2);                  // 3

// Java：方法必须住在类里
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
}
Calculator calc = new Calculator();
int result = calc.add(1, 2);
```

| JS | Java | 说明 |
|----|------|------|
| `function` 声明 | 类里的方法 | Java 方法必须属于某个类，不能独立存在 |
| 不写返回类型 | 必须写返回类型 | 没有返回值写 `void` |
| 参数无类型 | 每个参数都要声明类型 | 静态类型，编译期检查 |
| 直接调 `add(1, 2)` | `对象.方法()` | 声明 `static` 后用 `类名.方法()`（`main` 入口就是 static） |

**② 关键差异：Java 的"函数"不是值，要靠接口包装**

JS 里函数是一等公民，想传就传：

```javascript
const double = n => n * 2
const apply = (fn, x) => fn(x)
apply(double, 3)   // 6
```

Java 里**不能把方法直接当参数传**（能传的只有对象）。于是约定：用"只含一个抽象方法的接口"描述函数形状，把接口实现对象当参数传。这类接口叫**函数式接口**，JDK 预置了最常见的几种，不用自己定义：

| 接口 | 形状（参数 → 返回） | 例子 |
|------|---------------------|------|
| `Function<T, R>` | 一个输入 → 一个输出 | `n -> n * 2` |
| `Predicate<T>` | 一个输入 → `boolean` | `n -> n > 3` |
| `Consumer<T>` | 一个输入 → 无返回（消费掉） | `n -> System.out.println(n)` |
| `Supplier<T>` | 无输入 → 一个输出（提供者） | `() -> Math.random()` |

所以开头那行的意思是：声明一个"输入 `Integer`、输出 `Integer`"的函数：

```java
Function<Integer, Integer> doubleIt = n -> n * 2;
//      ↑输入类型              ↑输出类型
```

**为什么是 `Integer` 不是 `int`**：泛型参数只能是引用类型（前面集合一节说过 `List<int>` 会报错），`Integer` 是 `int` 的包装类，Java 会自动装箱/拆箱，平时不用管。

**③ Lambda 是匿名类的语法糖**

编译器看到 `n -> n * 2` 赋值给 `Function<Integer, Integer>`，会自动生成匿名对象，下面两行**完全等价**：

```java
// 需要 import java.util.function.Function;（IDEA 会自动补）
Function<Integer, Integer> doubleIt = n -> n * 2;

Function<Integer, Integer> doubleIt = new Function<>() {
    @Override
    public Integer apply(Integer n) { return n * 2; }
};
```

和 JS 箭头函数是 `function` 的简写一样，Lambda 只是"手写匿名类"的简写——理解这点，Java 函数式编程就不再神秘。

**④ Lambda 语法规则**

```java
(int a, int b) -> { return a + b; }  // 完整形态：参数列表 -> 代码块
(a, b) -> a + b                      // 参数类型可省略（编译器从接口推断）
n -> n * 2                           // 单参数可去掉括号
n -> n * 2                           // 表达式体：自动 return 结果
n -> { return n * 2; }               // 代码块体：必须手写 return
```

**⑤ 方法引用：`类名::方法名`**

当 Lambda 体只是"调用某个方法"时，可再简写为**方法引用**：

```java
u -> u.age()   // Lambda 写法
User::age      // 方法引用：≡ u -> u.age()

Math::max      // 静态方法：≡ (a, b) -> Math.max(a, b)
User::new      // 构造器：≡ () -> new User(...)
```

**⑥ Stream：Java 版的 map / filter / reduce**

```java
// JS：数组直接调高阶函数
const result = arr.map(n => n * 2).filter(n => n > 3)

// Java：先转 Stream（管道）→ 变换 → toList() 收口
List<Integer> result = arr.stream()
                          .map(n => n * 2)
                          .filter(n => n > 3)
                          .toList();
```

| JS | Java |
|----|------|
| `arr.map(f)` | `arr.stream().map(f).toList()` |
| `arr.filter(f)` | `arr.stream().filter(f).toList()` |
| `arr.reduce(f, init)` | `arr.stream().reduce(init, f)` |
| `arr.sort(cmp)` | `arr.stream().sorted(cmp).toList()` |

**三个关键差异**：

1. Java 的 List 没有 map/filter，必须先 `.stream()` 转成 Stream（想象成"管道"），变换后中间结果**仍是 Stream**，最后 `toList()` 收口成 List
2. Stream 是惰性的：`map`/`filter` 只登记"要做什么"，遇到终端操作（`toList()`/`forEach()`/`count()`）才真正执行
3. ⚠️ Java 16+ 的 `toList()` 返回**不可变** List（不能 add/remove）；要可变的用 `.collect(Collectors.toList())`

**示例：按年龄过滤并排序**：

```java
// JS: users.filter(u => u.age > 18).sort((a, b) => a.age - b.age)
users.stream()
     .filter(u -> u.age() > 18)                  // Predicate：留下成年人（record 访问器是 age()）
     .sorted(Comparator.comparingInt(User::age)) // 按 age 升序；User::age ≡ u -> u.age()
     .toList();
```

对照 JS 的 `sort((a, b) => ...)`（要自己写比较逻辑），Java 用 `Comparator.comparingInt(键提取)`——只需告诉它"按哪个字段比"，剩下交给 JDK。`async`/并发模型完全不同，见下文「异步与并发」小节。

### null 处理

```javascript
// JS：可选链，遇到 null/undefined 短路
const city = user?.address?.city
```

```java
// Java：Optional 链式处理
String city = Optional.ofNullable(user)
                      .map(User::address)
                      .map(Address::city)
                      .orElse("unknown");
```

| JS | Java | 说明 |
|----|------|------|
| `?.` 可选链 | `Optional.map()` | 概念对应 |
| `??` 空值合并 | `orElse()` / `orElseGet()` | 概念对应 |
| 不存在的属性 = `undefined` | 访问 null 对象直接 NPE | **Java 没有 undefined，空就是 null，访问即崩** |

**Java 最大新手杀手：NullPointerException（NPE）**。JS 里 `user.name` 是 undefined 还能忍，Java 里直接抛异常。习惯：方法参数/返回值明确是否可为 null，可用则用 `Optional`。

### 异常处理（Java 特色：受检异常）

JS 里 `throw` 随便抛、`catch` 随意接；Java 把异常分两类，**编译器强制管**。

```javascript
// JS：随便抛，没人强制你处理
function parse(s) {
  throw new Error('bad format')
}
try { parse('x') } catch (e) { /* 可写可不写 */ }
```

```java
// Java：受检异常必须处理（throws 声明 或 try-catch），否则编译不过
public void handle(HttpServletResponse response) throws IOException {
    response.getWriter().write("hello");   // 写 IO 可能失败 → 强制声明
}
```

| JS | Java |
|----|------|
| `throw new Error()` | `throw new RuntimeException(...)`（非受检，不用声明） |
| try/catch | try/catch（语法一样） |
| 无 | **受检异常**：必须 `throws` 声明或 `try-catch`（编译器强制） |

**两类异常**：

| 类型 | 例子 | 编译器态度 |
|------|------|-----------|
| 受检异常（checked） | `IOException`、`SQLException` | 必须处理（throws 或 try-catch） |
| 非受检异常（unchecked） | `NullPointerException`、`IllegalArgumentException` | 不用声明，随便抛 |

**`throws` 是什么**：方法签名上声明"我会抛这个异常，调用方负责"。方法里不 catch 就一直往上抛。

**实战套路（mall）**：
- **业务异常**：`Asserts.fail("密码不正确")` 抛一个 RuntimeException 子类 → 被全局异常处理器（`@RestControllerAdvice` + `GlobalExceptionHandler`）统一转成 JSON 返回
- **日常开发**：业务方法基本都 `throws` 往上抛，让全局处理器统一"收尸"，自己很少 try-catch
- **什么时候 try-catch**：确实要处理的场景（重试、降级、打日志）

**NPE 是最大的坑**：Java 没有 undefined，访问 null 对象直接抛 NPE（非受检异常）。用 `Optional` / 判空防御，见上文 null 处理。

### 异步与并发（最需要重构心智的地方）

```javascript
// JS：单线程 + 事件循环，IO 用 await 不阻塞
async function getData() {
  const res = await fetch('/api')
  return res.json()
}
```

```java
// Java 默认：同步阻塞。方法内直接调用，线程等着
public Data getData() {
    return fetchData();  // 当前线程阻塞等待，没有 await 关键字
}

// 需要异步时：CompletableFuture ≈ Promise
CompletableFuture.supplyAsync(() -> fetchData())
                 .thenApply(data -> process(data));
```

| 维度 | Node.js | Java |
|------|---------|------|
| 并发模型 | 单线程 + 事件循环（IO 多路复用） | 多线程 + 线程池（一请求一线程） |
| 异步语法 | `async/await`（一等公民） | 默认同步阻塞；异步用 `CompletableFuture` 或虚拟线程 |
| 阻塞 | 同步代码会卡死整个进程 | 阻塞只卡当前线程，线程池兜底 |
| 并发隐患 | 少（单线程） | 多线程共享变量、锁、线程安全 |

**必须接受的事实**：Java 的常规代码就是**同步阻塞**的——这在 Spring Boot 里完全够用（每个请求一个线程，Tomcat 默认 200 线程池）。不要上来就追求 `CompletableFuture`，99% 的业务代码同步写就好。

**线程安全速记**：JS 单线程不用考虑的问题（共享变量、并发修改），Java 里都要想。先记住三个字：`synchronized`、`ConcurrentHashMap`、`volatile`，用到再深入。

---

## 工程化：Maven（对应 npm）

| JS | Java | 说明 |
|----|------|------|
| `package.json` | `pom.xml` | 项目描述 + 依赖声明 |
| `npm install` | `mvn dependency:resolve` | 实际 `mvn compile` 会自动下载 |
| `npm run dev` | `mvn spring-boot:run` | 开发启动（Spring Boot 篇展开） |
| `npm run build` | `mvn package` | 产物：jar 包 |
| `node_modules` | 本地仓库 `~/.m2/repository` | 依赖缓存 |
| `npx` | Maven 插件 | 插件机制类似 |

**pom.xml 最小示例**：

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>0.0.1</version>

  <dependencies>
    <dependency>
      <groupId>com.mysql</groupId>
      <artifactId>mysql-connector-j</artifactId>
      <version>8.3.0</version>
    </dependency>
  </dependencies>
</project>
```

**标准目录结构**：

```
src/
├── main/
│   ├── java/com/example/   # 源代码
│   └── resources/          # 配置文件（application.yml 等）
└── test/java/              # 测试代码
```

**环境准备**：
- JDK 17+（LTS 版本，新项目直接用 21）
- IntelliJ IDEA（Java 开发的事实标准 IDE，自带 Maven 支持）

---

## 快速上手路径

1. **先跑通语法**：把上面的对照表过一遍，重点写几个类 + record + Stream 操作，体会静态类型和同步模型的差异
2. **装好 Maven 工程**：用 [Spring Initializr](https://start.spring.io) 生成一个空项目（和 `npm create vite` 类似），看懂 pom.xml
3. **重写一个 CRUD**：把你做过的任何一个 Node 小项目（比如 Koa + TypeORM 的接口）用 Spring Boot 重写一遍——这是最有效的迁移训练
4. **对照框架**：继续学习 [Spring Boot 入门](/service/spring-boot)，理解 IoC/DI 容器如何对应 NestJS 的依赖注入

## 延伸阅读

- [Spring Boot 入门](/service/spring-boot) - 框架篇：Controller/Service/Repository 分层与自动配置
- [Node.js 入门](/service/node-core) - 你已有的 JS 后端基础
- [TypeORM 用法](/service/typeorm) - 数据访问对照参考（Java 对应 MyBatis-Plus / Spring Data JPA）

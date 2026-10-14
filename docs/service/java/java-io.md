# Java IO/NIO 与序列化（JS 开发者视角）

> **优先级：P1（中高级岗会问）** — IO 流体系是 Java 的"老底色"，面试常考 BIO/NIO 区别、序列化原理；工程上则是 Netty、文件处理的必备前置。

::: tip 背景
Node 里 `fs.readFile` 一把梭，从不关心"流"——因为 V8 帮你封装了。Java 的 IO 体系暴露了更多细节：字节流/字符流、BIO/NIO/AIO 三种模型、缓冲区。理解它们才能读懂 Netty、理解为什么 Java 高并发服务底子是 NIO。本文用 Node 的 `fs`/`stream` 做锚点。
:::

## IO 流体系：字节流 + 字符流

### Node 对照

```javascript
// Node：读文件就一行，流式处理用 stream
const data = fs.readFileSync('a.txt', 'utf8');           // 全读进内存
fs.createReadStream('big.txt').pipe(process.stdout);     // 流式，边读边写
```

```java
// Java：两套流——字节流（一切数据的底座）+ 字符流（处理文本的糖）
byte[] data = Files.readAllBytes(Path.of("a.txt"));      // 对应 readFileSync
String text = Files.readString(Path.of("a.txt"));        // Java 11+，直接读成字符串
```

**现代 Java 工程中，`java.nio.file.Files` 的静态方法覆盖了 90% 的日常文件操作**，不用手写流。但流体系是理解 Java IO 的地基，面试也常问，必须知道骨架。

### 四大骨架类

```
字节流（处理二进制：图片、视频、任何文件）
├── InputStream        ← 读（抽象基类）
│   ├── FileInputStream          读文件
│   ├── BufferedInputStream      加缓冲（提速 10 倍）
│   └── ByteArrayInputStream     读内存数组
└── OutputStream      ← 写
    ├── FileOutputStream         写文件
    └── BufferedOutputStream     加缓冲

字符流（处理文本：按字符编解码）
├── Reader
│   ├── FileReader
│   └── BufferedReader           按行读 readLine()
└── Writer
    ├── FileWriter
    └── BufferedWriter
```

**核心分工**：字节流是底座，字符流是字节流 + 编码表（UTF-8/GBK）的封装。**处理文本用字符流，处理二进制用字节流**——用 `FileReader` 读图片就是典型错误（编码表会把二进制搅烂）。

### 装饰器模式：流是套娃的

Java IO 的经典设计——**流可以一层层套**，每层加一种能力：

```java
// 套三层：文件 → 缓冲 → 按行读
BufferedReader reader = new BufferedReader(new FileReader("a.txt"));
String line;
while ((line = reader.readLine()) != null) {
    System.out.println(line);
}
//     ↑ 装饰器     ↑ 被装饰的基础流
```

对应 Node：`fs.createReadStream('a.txt').pipe(zlib.createGunzip()).pipe(...)`，管道思想一致。

### 现代写法：Files 工具类（推荐）

```java
// 小文件，一把梭
String text = Files.readString(Path.of("a.txt"));
Files.writeString(Path.of("b.txt"), "hello");

// 大文件，流式逐行（对应 Node createReadStream）
try (Stream<String> lines = Files.lines(Path.of("big.txt"))) {
    lines.filter(l -> l.contains("ERROR"))
         .limit(100)
         .forEach(System.out::println);
}

// try-with-resources：Java 7+ 自动关流，告别 finally close 地狱
try (BufferedWriter w = Files.newBufferedWriter(Path.of("out.txt"))) {
    w.write("hello");
}   // 出了作用域自动 close，即使抛异常
```

**try-with-resources** 是 Java 的 RAII：任何实现了 `AutoCloseable` 的资源（流、连接、锁）放进 `try(...)` 都会自动关闭。Node 里你靠 `finally` 手动 `stream.destroy()`，Java 语言级解决。

---

## BIO / NIO / AIO：三种 IO 模型

这是 Java IO 的灵魂，也是**面试高频 + Netty 前置**。用一个生活类比：

> **BIO**：一桌一个服务员——来个客人（连接）就分配一个服务员（线程），客人点菜后服务员**傻等**在桌边直到菜上来。
> **NIO**：一个服务员跑全场——同时照看多桌，哪桌有动静（有事件）才过去处理，不等菜。
> **AIO**：客人点完菜自己去忙，菜好了服务员**送到桌**（操作系统通知你完成了）。

| 维度 | BIO（同步阻塞） | NIO（同步非阻塞） | AIO（异步非阻塞） |
|------|----------------|------------------|------------------|
| 模型 | 一连接一线程 | 一线程管多连接（Selector） | 事件驱动回调 |
| 等待 | 阻塞等数据就绪 | 不傻等，轮询事件 | 数据好了 OS 通知 |
| Java API | `Socket`/`ServerSocket` | `Channel`/`Selector`/`Buffer` | `AsynchronousSocketChannel` |
| 适用 | 连接少、简单 | **高并发（主流）** | 连接多但单连接流量大 |
| 现实地位 | 老代码 | **Netty 的底座** | JDK 实现不好，业界少用 |

### BIO：一个连接一个线程

```java
// 服务端：来一个连接起一个线程处理（经典老代码）
ServerSocket server = new ServerSocket(8080);
while (true) {
    Socket socket = server.accept();          // 阻塞：没连接来就一直等
    new Thread(() -> handle(socket)).start(); // 每个连接一个线程
}
```

问题：1000 个连接 = 1000 个线程，内存爆炸 + 线程切换开销大。**C10K 问题的解法就是 NIO**。

### NIO：三大件 Channel + Buffer + Selector

```
Selector（选择器）：一个线程，注册多个 Channel 的"关心的事件"
   ├── Channel A: 有数据可读 → 处理
   ├── Channel B: 可写 → 处理
   └── Channel C: 无事 → 跳过
Buffer（缓冲区）：数据必须先读进 Buffer 才能处理（Java NIO 一切数据都在 Buffer 里）
Channel（通道）：双向的（BIO 的流是单向的），文件/网络/管道都能用
```

心智转换（对前端最重要的一条）：

- **BIO 的流是单向管道**：InputStream 只能读，OutputStream 只能写
- **NIO 的 Channel 是双向的**：一个 Channel 既能读又能写，配合 Selector 实现"单线程伺候万连接"

```java
// NIO 服务端心智模型（简化）
Selector selector = Selector.open();
ServerSocketChannel serverChannel = ServerSocketChannel.open();
serverChannel.configureBlocking(false);                  // ① 关键：非阻塞模式
serverChannel.register(selector, SelectionKey.OP_ACCEPT); // ② 注册"有人连我"事件

while (true) {
    selector.select();                                    // ③ 阻塞直到有事发生
    for (SelectionKey key : selector.selectedKeys()) {
        if (key.isAcceptable()) { /* 新连接来了 */ }
        if (key.isReadable())  { /* 某连接有数据了，读 */ }
    }
}
```

**Node 开发者秒懂**：NIO 的 Selector ≈ **libuv 的事件循环 + epoll/kqueue**，Channel 上的事件 ≈ fd 上的可读/可写事件。Java NIO 就是把 Node 事件循环的机制"裸暴露"给业务代码写——写起来比 Node 麻烦得多，所以有了 Netty 封装。

### AIO：异步回调

```java
AsynchronousServerSocketChannel server = AsynchronousServerSocketChannel.open();
server.accept(null, new CompletionHandler<>() {   // 连接来了回调通知你
    public void completed(AsynchronousSocketChannel client, Object att) {
        // 读也是回调式：completed(byteCount, attachment)
    }
});
```

对应 Node 的 `server.on('connection', ...)` + `socket.on('data', ...)`。**但 JDK 的 AIO 在 Linux 上实现不成熟（底层 epoll 没暴露好），业界几乎不用**——要异步回调式网络编程，直接用 Netty。

---

## 序列化：把对象变成字节

### 是什么 & JS 对照

序列化 = 把内存里的对象图转成字节流（存文件/传网络），反序列化 = 字节流转回对象。JS 的 `JSON.stringify`/`parse` 是最朴素的序列化，但 JSON 只能表达纯数据。

```java
// Java 原生序列化
public class User implements Serializable {    // ① 实现标记接口（无方法）
    private String name;
    private transient String password;         // ② transient = 不序列化（敏感字段）
}

// 用
User u = new User("tom");
byte[] bytes = serialize(u);                   // 对象 → 字节
User back = (User) deserialize(bytes);         // 字节 → 对象
```

### 两个必须知道的点

**① serialVersionUID：版本兼容的保险丝**

```java
private static final long serialVersionUID = 1L;
```

类结构改了（加字段、改方法），旧字节流反序列化会校验 UID：不匹配直接抛 `InvalidClassException`。**显式声明 UID**，让"加个无关字段"这种小改动不炸反序列化。不声明则由 JVM 按类结构算，改一点就变，老数据全废。

**② Java 原生序列化的坑（面试常问"为什么不用它"）**

| 问题 | 说明 |
|------|------|
| 体积大 | 带一堆类元数据，比 JSON 大好几倍 |
| 慢 | 反射遍历对象图 |
| **安全漏洞** | 反序列化不可信字节流 = 远程代码执行后门（Apache Commons Collections 漏洞名震天下） |
| 跨语言差 | 只有 Java 能读 |

### 实际用什么

| 方案 | 场景 |
|------|------|
| **JSON**（Jackson） | HTTP 接口、配置文件——前后端交互事实标准 |
| **Protobuf / Kryo / Hessian** | 服务间 RPC（Dubbo 默认 Hessian2）、高性能内网传输——二进制、小、快 |
| Java 原生序列化 | **新项目别用**；RMI 等老系统在用 |

::: warning 安全红线
永远不要反序列化来自不可信来源（用户输入、公网请求）的 Java 原生字节流。这是 CVE 重灾区。
:::

---

## 面试题速查

| 问题 | 一句话答案 |
|------|-----------|
| 字节流和字符流区别 | 字节流处理二进制底座，字符流 = 字节流 + 编码表；文本用字符流，二进制用字节流 |
| Java IO 用了什么设计模式 | 装饰器模式——`new BufferedReader(new FileReader(...))` 一层层套能力 |
| BIO/NIO/AIO 区别 | BIO 一连接一线程阻塞；NIO 单线程 Selector 多路复用；AIO 回调式（JDK 实现不成熟） |
| NIO 三大件 | Channel（双向通道）+ Buffer（数据缓冲）+ Selector（事件多路复用） |
| NIO 和 Node 事件循环的关系 | Selector ≈ epoll/libuv 的裸暴露；Netty 才 ≈ Node 的 stream 封装 |
| try-with-resources 是什么 | Java 7+ 自动关闭 AutoCloseable 资源的语法，告别 finally |
| transient 关键字 | 标记字段不参与序列化（密码等敏感字段） |
| serialVersionUID 作用 | 序列化版本号，控制类演进后能否兼容旧字节流；不声明则按结构自动算 |
| 为什么实际不用 Java 原生序列化 | 体积大、慢、有反序列化安全漏洞、不能跨语言 |
| 对象怎么转 JSON | Jackson：`objectMapper.writeValueAsString(obj)` / `readValue(json, User.class)` |

## 延伸阅读

- [Java 语言进阶](/service/java/java-language-advanced) - 反射（序列化框架的底座）
- [Java 并发编程](/service/java/java-concurrency) - 线程模型与 IO 模型的配合
- [HTTP 与网络基础](/service/common/http-network-basics) - IO 模型的网络语境：TCP 握手/keep-alive
- [Netty 入门](/service/java/java-netty) - NIO 的工程封装，本文的直接后继
- [Java 服务部署最佳实践](/service/java/java-deployment) - 线上 JVM 与 IO 调优

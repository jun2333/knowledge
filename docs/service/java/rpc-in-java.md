# RPC 原理与 Java 生态（JS 开发者视角）

> **优先级：P1（微服务岗必问，中高级岗加分）** — 日常写业务接口用不到它，但"服务 A 怎么调服务 B"是微服务绕不开的命题。Dubbo、gRPC、Thrift 全是 RPC 框架，OpenFeign 算半个；不知道 RPC 的原理，看 Dubbo 源码会全程懵。

::: tip 背景
前端调后端，一直用 `axios.get('/api/user/1')`。你觉得这就是"调接口"，没什么玄学。

但后端服务之间调服务，也是"调接口"——为什么业界还要专门造一套叫 **RPC**（Remote Procedure Call，远程过程调用）的东西？

一句话：**RPC 的目标不是"传数据"，而是"让远程调用长得像本地调用"**。你要写 `orderService.getOrder(id)`，拿到一个 `Order` 对象；至于它背后走了 TCP 还是 HTTP/2、序列化成了 Protobuf 还是 JSON、失败了几次重试，框架全包了。

本文讲清三件事：**RPC 的原理**（怎么做到"像本地调用"）、**HTTP 和 RPC 到底什么关系**（前端最常搞混）、**Java 生态里怎么选和怎么用**（Dubbo / gRPC / OpenFeign 实战）。
:::

## 一、RPC 是什么：伪装的"本地方法调用"

### 先看它想伪装成什么样

```java
// 你的业务代码长这样 —— 这就是 RPC 的全部承诺
OrderDTO order = orderService.getOrder(1001L);
```

对比 REST 风格要写的：

```java
// REST 风格：URL、方法、状态码、JSON 解析、反序列化，全得自己操心
ResponseEntity<String> resp = restTemplate.getForEntity(
        "http://order-service/api/orders/1001", String.class);
if (resp.getStatusCode() == HttpStatus.OK) {
    OrderDTO order = objectMapper.readValue(resp.getBody(), OrderDTO.class);
}
```

RPC 把上面那一堆**全部藏进框架**，只留一行方法调用。代价是你必须接受框架的约束（要有接口定义、要有序列化协议、服务要能被发现）。

### 前端对照：你每天都在用 RPC 的"简化版"

其实前端调后端，本身就有 RPC 的影子：

| 前端写法 | RPC 对应物 | 差别 |
|---------|-----------|------|
| `axios.get('/api/user/1')` | Stub（服务调用桩） | 前端这层是**手搓**的：URL、参数、JSON.parse 都得自己写 |
| `fetch` 的 `body: JSON.stringify(data)` | 序列化 | 前端固定 JSON，没有协商空间 |
| 后端返回 JSON，前端 `res.json()` | 反序列化 | 同上 |
| `interface User { id: number }` + TS 类型 | 强类型契约 | 前端要手写类型并保持同步 |

**关键差异**：前端的"伪 RPC"只省了写法，没省传输——它底下就是明晃晃的 HTTP + JSON。而真正的 RPC 框架会连**传输层和序列化格式**一起换掉（换成 HTTP/2 + Protobuf），只保留"方法调用"的糖。

> 一个直观类比：**前端 axios ≈ 手动发快递**（自己填单号、自己打包、自己等）；**RPC ≈ 打电话**（你只说"帮我订个会议室"，对面负责沟通格式、地址、确认）。

## 二、一次 RPC 调用背后发生了什么（核心原理）

这是本文最重要的一节。RPC 框架做的事情，可以拆成**四层**：

```
① 代理层（Stub）    把方法调用变成请求报文
② 序列化层          对象 → 字节（跨进程只能传字节）
③ 传输层            字节 → 网络 → 字节
④ 派发层（Reflect） 字节 → 对象 → 反射调用真实方法
```

### 全链路时序

```
客户端                                        服务端
  │                                              │
  │  userService.getOrder(1001L)                  │
  │        ↓                                     │
  │  ① 动态代理拦截调用                            │
  │     取出方法名 getOrder + 参数 [1001L]          │
  │        ↓                                     │
  │  ② 序列化：OrderRequest 对象 → bytes          │
  │        ↓                                     │
  │  ③ 传输：写到 TCP 连接 / HTTP/2 帧            │
  │  ─────────────网络──────────────→            │
  │                                              │  收到 bytes
  │                                              │        ↓
  │                                              │  ② 反序列化：bytes → OrderRequest
  │                                              │        ↓
  │                                              │  ④ 派发：按方法名找到实现类
  │                                              │     反射调用 orderServiceImpl.getOrder(1001L)
  │                                              │        ↓
  │                                              │  ② 序列化返回值 OrderDTO → bytes
  │  ←────────────网络──────────────             │
  │  ② 反序列化：bytes → OrderDTO                 │
  │        ↓                                     │
  │  return orderDto;  ← 调用方拿到对象，无感      │
```

**一句话概括原理**：**客户端用动态代理把"方法调用"变成"一条数据"，服务端用反射把"一条数据"变回"方法调用"，中间那段就是网络传输。**

### 前端对照：这就是 Proxy + JSON

```javascript
// 前端拦截器 = 手写的"代理层"
axios.interceptors.request.use(config => {
  console.log('我要发请求了', config.url);   // 类似 Stub 记录方法名和参数
  return config;
});
axios.interceptors.response.use(res => {
  return res.data;                          // 类似"自动反序列化 + 拆信封"
});
```

区别在于：前端拦截器是你**手写**的、只做日志和拆信封；RPC 框架的代理层是**自动生成**的、还额外负责了"把参数打包成协议报文"和"选哪个服务、连哪台机器"。

## 三、动态代理：RPC 的"魔法"从哪来

RPC 让远程调用"像本地调用"，全靠 JDK 的**动态代理**。这段是面试高频，也是读源码必须懂的一步。

```java
// 服务提供方：定义接口（契约）
public interface OrderService {
    OrderDTO getOrder(Long id);
}

// 提供实现类
public class OrderServiceImpl implements OrderService {
    public OrderDTO getOrder(Long id) {
        return new OrderDTO(id, "PAID");
    }
}
```

客户端**不写实现类**，而是让 JDK 造一个：

```java
// 客户端拿到的"OrderService"其实是个假实现
OrderService proxy = (OrderService) Proxy.newProxyInstance(
    getClass().getClassLoader(),
    new Class[]{OrderService.class},      // 代理哪个接口
    (method, args, method2) -> {
        // 这里是 InvocationHandler —— 每次调用都会进这里
        String methodName = method.getName();          // "getOrder"
        Object[] params = args;                        // [1001L]
        byte[] request = serialize(methodName, params);// ② 序列化
        byte[] response = sendToServer(request);      // ③ 传输（Netty/HTTP2）
        return deserialize(response);                  // ② 反序列化
    });

// 用起来完全像本地方法
OrderDTO order = proxy.getOrder(1001L);
```

**关键理解**：`proxy.getOrder(1001L)` 这一行，**根本没有执行任何本地业务代码**——它被拦截器截走，转成了网络请求。字节码层面，这是 `invokeinterface` 走到 `Proxy` 生成的代理类，再回调 `InvocationHandler`。

Dubbo、gRPC 的 Java 客户端，底层都是这套机制（gRPC 生成的是 `OrderServiceBlockingStub`，内部一样是代理 + 拦截器）。

> **面试怎么答**：RPC 客户端通过 JDK 动态代理实现接口，把方法调用拦截下来，封装成协议报文发送；服务端反序列化后用反射调用真实实现，再把返回值序列化返回。Dubbo 的 `Invoker`、gRPC 的 `Channel` 都是这套流程的封装。

## 四、序列化选型：RPC 的第二战场

跨进程只能传字节，所以"怎么把对象变成字节"直接决定 RPC 的性能和兼容性。

| 序列化 | 体积 | 速度 | 跨语言 | 适用场景 |
|-------|------|------|--------|---------|
| **JDK 原生**（`Serializable`） | 大 | 慢 | ✅ | ❌ 生产禁用：慢、体积大、还有反序列化漏洞 |
| **JSON**（Jackson/Fastjson2） | 中 | 中 | ✅ | 通用、可读、调试友好；内网高频调用偏慢 |
| **Hessian2** | 小 | 快 | ❌（仅 Java） | Dubbo 2 默认，纯 Java 微服务够用 |
| **Protobuf** | 最小 | 最快 | ✅ | gRPC 默认、跨语言、高频调用首选 |
| **Kryo** | 小 | 最快 | ❌ | 极致性能要求，且能接受不通用 |

**为什么 Protobuf 快且小**：它不描述"字段叫什么"，只记录"第几个字段是什么类型"（字段编号 + wire type）：

```protobuf
message OrderRequest {
  string order_id = 1;      // 字段名不传，只传编号 1
  int64  amount   = 2;
}
```

序列化结果就是 `0x0A 0x04 ...` 这种紧凑二进制。**代价**：两端必须有同一份契约（`.proto` 文件），所以多了一条"契约先行"的流程——这也是 gRPC "contract-first" 的由来。

**Protobuf 三个必记的坑**：
1. **字段编号不能复用**——删掉的字段要用 `reserved` 占位，否则后来者复用编号会导致数据错乱
2. **字段编号一旦发布就不能改**——改了等于换了个字段
3. **两端序列化方式必须一致**——Provider 和 Consumer 配置的序列化器不匹配，会直接反序列化失败

**前端对照**：前端 JSON 是"自描述"的（字段名跟着数据走，谁都能看懂）；Protobuf 是"位置化"的（数据里只有编号，靠契约表还原字段名）。所以 Protobuf 省体积，但**必须两端共享同一份 schema**。

## 五、RPC vs HTTP/REST：最容易搞混的一组

先破除一个误解：**它们不是对立关系，是不同维度**。

| 维度 | 说明 |
|------|------|
| **HTTP** | 一个**传输协议**（应用层） |
| **gRPC** | 一个 RPC 框架，**跑在 HTTP/2 上** |
| **Dubbo2** | 一个 RPC 框架，跑在自定义 TCP 协议上 |
| **REST** | 一种**接口风格**（面向资源、用 HTTP 语义） |
| **RPC** | 一种**调用方式**（面向方法、强类型契约） |

所以：**gRPC 是 RPC，REST 不是 RPC，但 gRPC 也可以实现成 REST 风格**（gRPC-Web、Connect 协议就是干这个的）；**Dubbo3 的 Triple 协议也兼容 gRPC**。

### 怎么选

| 维度 | REST / HTTP + JSON | RPC（gRPC / Dubbo） |
|------|-------------------|-------------------|
| 契约 | 弱（靠文档 + 松散 JSON） | 强（IDL / 接口，编译期生成代码） |
| 调试 | ✅ 浏览器、curl 直接调 | ❌ 要 grpcurl / 专用工具（Triple 除外） |
| 跨语言 | ✅ 天然 | gRPC ✅ 多语言 / Dubbo2 ❌ 基本只有 Java |
| 浏览器直连 | ✅ | ❌ 浏览器发不了 gRPC（HTTP/2 二进制帧 + Protobuf），需 BFF 翻译 |
| 性能 | 中 | 高（HTTP/2 多路复用 + 二进制，小包高频场景优势明显） |
| 网关友好 | ✅ 任何网关透传 | Dubbo2 ❌（网关不认自定义协议）；Triple ✅ |
| 流式 | 弱（SSE 能做单向） | ✅ 四种调用模式，原生支持双向流 |
| 典型场景 | 对外开放 API、开放平台 | 内部服务间调用 |

**实战选型建议**：

- **对外 API（给前端 / 第三方）→ REST 或 gRPC-Web**，别硬上 gRPC，浏览器直连不了、调试也痛苦
- **内部服务间 → gRPC 或 Dubbo**，强契约 + 治理能力是核心价值
- **团队不大 / 内部工具 → OpenFeign**，声明式 HTTP，简单够用
- **已有 Dubbo 存量 → Dubbo3 + Triple**，兼容 gRPC 生态，网关友好，官方推荐

> **注意性能别神化**：gRPC 的优势在**高频小包**（序列化占比高）。传大文件时，差距会收窄到 3-5 倍而不是数量级差异——因为那时瓶颈在带宽而不是序列化。

## 六、Java 主流 RPC 框架全景

| 框架 | 出身 | 传输 | 序列化 | 强类型契约 | 服务治理 | 适合 |
|-----|------|------|--------|-----------|---------|------|
| **Dubbo 3** | 阿里 / Apache | TCP（dubbo2）、HTTP/2（Triple） | Hessian2 / Protobuf / JSON | Java 接口 | ✅ 极强（限流/降级/路由/标签） | 阿里系生态、大规模内部服务 |
| **gRPC** | Google | HTTP/2 | Protobuf | `.proto` | ⚠️ 弱（需自己接 Resilience4j 等） | 跨语言、契约优先、多语言团队 |
| **Thrift** | Facebook / Apache | TCP / HTTP | 自有协议 | `.thrift` | ⚠️ 弱 | 跨语言 + 高性能（学习曲线陡） |
| **Spring Cloud OpenFeign** | Spring | HTTP/1.1 | JSON（可换） | Java 接口 | ⚠️ 依赖 Sentinel/Resilience4j | 快速开发、Spring 体系内 |
| **Hessian** | 阿里（早期） | HTTP | Hessian2 | Java 接口 | ❌ | 基本被 Dubbo 取代 |

**Dubbo vs gRPC 的本质差异**：

- **Dubbo 是"框架"**：从注册中心、路由、限流、熔断到配置中心都给齐，你只写接口和实现
- **gRPC 是"协议 + 库"**：它只管把 RPC 调通，服务治理得自己接（Resilience4j / Sentinel）+ 自己做服务发现（K8s Service / Consul）

**Dubbo3 的 Triple 协议**值得单独说：它是基于 HTTP/2、**完全兼容 gRPC** 的协议，而且**不绑定 IDL**——可以直接用 Java 接口定义服务。这意味着：老 Dubbo 代码能平滑迁到 gRPC 生态，新项目也能选 Triple 拿到 gRPC 的跨语言能力。官方现在推荐新项目直接上 Triple。

## 七、实战一：Dubbo 3

### 依赖

```xml
<!-- API 模块：只有接口和 DTO，零业务依赖 -->
<dependency>
    <groupId>org.apache.dubbo</groupId>
    <artifactId>dubbo</artifactId>
    <version>3.3.x</version>
</dependency>
```

### 服务提供方

```java
@DubboService(version = "1.0.0")     // 暴露成 Dubbo 服务
public class OrderServiceImpl implements OrderService {
    @Override
    public OrderDTO getOrder(Long id) {
        return orderDao.findById(id);
    }
}
```

```yaml
dubbo:
  application:
    name: order-service
  registry:
    address: nacos://${NACOS_HOST}:8848     # 服务注册到 Nacos
  protocol:
    name: tri                               # Triple 协议（HTTP/2，兼容 gRPC），默认端口 50051
    port: -1                                # -1 = 自动分配（多端口暴露时用）
    serialization: protobuf                 # 显式指定序列化
  provider:
    serialization: protobuf                 # 提供方也要显式指定，两边必须一致
```

### 服务消费方

```java
@RestController
public class OrderController {

    @DubboReference(version = "1.0.0", timeout = 3000, retries = 0)
    private OrderService orderService;        // 注入的是代理，调用即远程调用

    @GetMapping("/api/orders/{id}")
    public OrderDTO get(@PathVariable Long id) {
        return orderService.getOrder(id);
    }
}
```

```yaml
dubbo:
  consumer:
    serialization: protobuf
    check: false                            # 启动时不检查服务是否存在（本地开发用）
```

### Dubbo 三个必须改的默认值

| 默认值 | 改成 | 原因 |
|-------|------|------|
| `timeout` = 1000ms | 按接口调（核心接口 500-1000ms，查询类可短） | 默认 1s 在跨机房调用里经常不够 |
| `retries` = **2** | **写操作必须设 0** | 默认重试 2 次（不含首次）= 一次请求放大成 3 次，下游故障时雪崩 |
| `check` = true | 生产环境按需 | 启动时强依赖注册中心，注册中心抖动会拖垮你的应用 |

> Dubbo 的集群容错策略（`cluster`）默认是 `failover`——失败后重试**其他节点**。写接口除了关重试，通常还把策略换成 `failfast`（只调一次立刻失败），语义更安全。

## 八、实战二：gRPC

### 契约先行

```protobuf
// src/main/proto/order.proto
syntax = "proto3";
option java_multiple_files = true;          // 避免生成一个巨型内部类，IDEA 编译会卡
option java_package = "com.example.order.grpc";

package order;

service OrderService {
  rpc GetOrder (GetOrderRequest) returns (OrderReply);
}

message GetOrderRequest {
  string order_id = 1;
}

message OrderReply {
  string order_id  = 1;
  string status    = 2;
  int64  amount    = 3;    // 用分存，别用 double 传金额
}
```

### Maven 生成代码

```xml
<plugin>
    <groupId>org.xolstice.maven.plugins</groupId>
    <artifactId>protobuf-maven-plugin</artifactId>
    <version>0.6.1</version>
    <configuration>
        <protocArtifact>com.google.protobuf:protoc:3.21.12:exe:${os.detected.classifier}</protocArtifact>
        <pluginId>grpc-java</pluginId>
        <pluginArtifact>io.grpc:protoc-gen-grpc-java:1.58.0:exe:${os.detected.classifier}</pluginArtifact>
    </configuration>
    <executions>
        <execution>
            <goals><goal>compile</goal><goal>compile-custom</goal></goals>
        </execution>
    </executions>
</plugin>
```

> `os-maven-plugin` 必须引入，否则 `${os.detected.classifier}` 解析不了，CI 上构建直接挂。

### 服务端实现

```java
@Service                        // grpc-spring-boot-starter 的注解
public class OrderGrpcService extends OrderServiceGrpc.OrderServiceImplBase {

    @Override
    public void getOrder(GetOrderRequest request,
                         StreamObserver<OrderReply> observer) {
        OrderDTO dto = orderService.getOrder(Long.valueOf(request.getOrderId()));

        observer.onNext(OrderReply.newBuilder()
                .setOrderId(String.valueOf(dto.getId()))
                .setStatus(dto.getStatus())
                .setAmount(dto.getAmount())
                .build());
        observer.onCompleted();     // 必须调用，否则客户端一直等不到结束
    }
}
```

### 客户端调用

```java
@Component
public class OrderClient {

    private final ManagedChannel channel = ManagedChannelBuilder
            .forAddress("order-service", 9090)
            .usePlaintext()                       // 生产环境别用 plaintext，走 TLS
            .build();

    private final OrderServiceGrpc.OrderServiceBlockingStub stub =
            OrderServiceGrpc.newBlockingStub(channel);

    public OrderDTO getOrder(Long id) {
        OrderReply reply = stub.getOrder(
                GetOrderRequest.newBuilder().setOrderId(String.valueOf(id)).build());
        return OrderDTO.from(reply);
    }
}
```

### gRPC 的几个要点

| 要点 | 说明 |
|------|------|
| **四种调用模式** | 一元 / 服务端流 / 客户端流 / 双向流——双向流适合实时推送、IM、LLM 流式输出 |
| **deadline** | gRPC 的总超时预算（区别于连接超时）；不设 deadline，下游卡住会拖死你的线程池 |
| **阻塞 stub 的坑** | `BlockingStub` 会阻塞调用线程，Web 容器线程会被占住；核心路径考虑 `FutureStub` |
| **状态码** | 用 gRPC Status 表达错误（`NOT_FOUND` / `DEADLINE_EXCEEDED`），不要把异常裸抛 |
| **调试** | `grpcurl -plaintext localhost:9090 list` 能像 curl 一样调，比浏览器方便但没浏览器方便 |

**什么时候用双向流**：AI 应用的流式输出、多端实时协同、大文件分块上传——这些场景 REST + SSE 也能凑合，但 gRPC 是原生的。

## 九、实战三：Spring Cloud OpenFeign

OpenFeign 是"半个 RPC"——它保留了方法调用的写法，但传输层就是普通 HTTP + JSON。

```java
@FeignClient(name = "order-service", path = "/api/orders")
public interface OrderClient {
    @GetMapping("/{id}")
    OrderDTO getOrder(@PathVariable Long id);
}
```

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:
            connectTimeout: 1000      # 连接超时（ms）
            readTimeout: 3000         # 读取超时（ms）
            loggerLevel: basic
```

**Feign 的定位**：Spring Cloud 体系内的"轻量 RPC"。优点是零心智负担（就是个被 `@FeignClient` 增强的接口），缺点是性能不如二进制序列化、契约弱（JSON 字段对不上要运行时才发现）。

**什么时候选 Feign**：团队已在 Spring Cloud 体系内、服务间调用量不大、团队不想引入 .proto 和代码生成流程。**什么时候别选**：高频调用、大 payload、多语言团队——这些场景 gRPC 更合适。

## 十、服务治理三件套：超时、重试、熔断降级

RPC 把自己伪装成"本地调用"，但**远程调用会失败**——这是它和本地调用最本质的区别。成熟的 RPC 框架必须提供这三件套。

### ① 超时（Timeout）

**没有超时的 RPC 是分布式系统的头号杀手**：下游卡住 → 你的线程池被占满 → 你的服务也挂 → 传染全链路。

```java
@DubboReference(timeout = 2000, retries = 0)   // Dubbo
@GrpcClient(...) // gRPC：配 deadline
```

**分层设定超时**（Dubbo）：全局默认 → 接口级 → 方法级，越具体优先级越高。全局一个值是最常见的偷懒，也是线上事故的常见原因。

### ② 重试（Retry）

重试能掩盖偶发抖动，但**会放大流量**：

```
1 次调用 + 2 次重试 = 下游收到 3 次请求
```

**铁律：写操作重试前，必须保证幂等。** 幂等怎么做：
- 用**唯一业务 ID**（订单号/请求 ID）做去重，下游见到相同 ID 直接返回上次结果
- 或者把重试限制在查询类接口

```java
// 重试必须带幂等键
String requestId = UUID.randomUUID().toString();
```

**Dubbo 默认 `retries=2` 是给幂等接口用的默认值**——你把 Dubbo 用在写接口上又不改这个配置，就是线上重复下单的经典原因。

### ③ 熔断降级（Circuit Breaker & Fallback）

```java
@FeignClient(name = "order-service",
             fallbackFactory = OrderClientFallback.class)   // 降级兜底
public interface OrderClient { ... }

@Component
public class OrderClientFallback implements FallbackFactory<OrderClient> {
    @Override
    public OrderClient create(Throwable cause) {
        return id -> OrderDTO.cached(id);     // 降级：返回缓存/默认值，不抛异常
    }
}
```

**熔断 vs 降级**（别再混）：
- **熔断是状态**：下游失败率超阈值 → 主动短路，**不再发请求**
- **降级是策略**：熔断触发后，返回什么兜底数据

**三者的配合顺序**：超时（单次调用别等太久）→ 重试（偶发失败重试，但限次）→ 熔断（持续失败直接放弃）→ 降级（放弃后给用户什么）。

## 十一、RPC 的常见坑（面试爱问实践部分）

| 坑 | 现象 | 解法 |
|----|------|------|
| **不设超时** | 线程池打满，故障扩散 | 三层超时（连接/读取/总），核心接口单独配 |
| **写接口默认重试** | 重复下单、重复扣款 | `retries=0` + 幂等键 |
| **序列化方式不一致** | 反序列化异常，报错信息还很迷惑 | Provider/Consumer 显式配置相同序列化 |
| **Protobuf 字段编号被复用** | 线上偶发数据错乱，极难排查 | 删字段用 `reserved` 占位 |
| **大对象走 RPC** | 序列化耗时暴涨、GC 压力 | 传 ID 让对方自己查，或走对象存储 |
| **阻塞 stub 占满 Web 线程** | Tomcat 线程耗尽 | 用异步 stub，或 RPC 调用移出请求线程 |
| **注册中心强依赖启动** | Nacos 抖动 → 应用起不来 | `check=false` + 合理的启动策略 |
| **接口无限膨胀** | 一个接口几百个方法，谁都不敢改 | 按业务域拆分接口，版本化管理 |
| **契约不集中管理** | 改 proto 字段号，跨团队服务连环挂 | 建统一的 proto 仓库 + CI 做 breaking change 检查 |

## 面试题速查

| 问题 | 一句话答案 |
|------|-----------|
| RPC 是什么 | 让远程调用像本地方法调用，核心是**动态代理 + 序列化 + 传输 + 反射派发** |
| RPC 的原理 | 客户端代理拦截方法调用→序列化→传输→服务端反序列化→反射调用真实方法→返回 |
| 动态代理在 RPC 中的作用 | 客户端不实现接口，靠 JDK 代理拦截调用转成网络请求；服务端反射执行真实逻辑 |
| RPC 和 HTTP 的关系 | HTTP 是传输协议，gRPC 是跑在 HTTP/2 上的 RPC 框架；Dubbo2 跑在自定义 TCP 上 |
| RPC 和 REST 怎么选 | 对外 API 用 REST（浏览器友好、易调试）；内部高频调用用 gRPC/Dubbo（强契约 + 治理 + 性能） |
| gRPC 为什么比 REST 快 | HTTP/2 多路复用（无 head-of-line 阻塞）+ Protobuf 二进制（体积小、解析快）+ 连接复用 |
| Protobuf 怎么保证兼容 | 字段编号不可复用、不可修改；删字段用 `reserved`；新增字段用新编号 |
| Dubbo 和 gRPC 区别 | Dubbo 是**全栈框架**（注册中心/治理/配置一体）；gRPC 是**协议+库**，治理要自己接 |
| Dubbo3 的 Triple 协议 | 基于 HTTP/2、**兼容 gRPC**、不绑定 IDL，官方推荐用于新项目和协议迁移 |
| RPC 的超时重试熔断怎么配 | 超时分层必设；重试仅幂等接口且限次；熔断按失败率阈值；熔断后走降级 |
| 为什么写接口不能随便重试 | 重试会放大请求量，且非幂等操作会重复执行——必须配幂等键 |
| 浏览器能直接调 gRPC 吗 | 不能（HTTP/2 二进制帧 + Protobuf），需要 gRPC-Web 或 BFF 层做协议转换 |

## 延伸阅读

- [Netty 入门](/service/java/java-netty) - Dubbo/gRPC 的传输层底座，理解 Pipeline 与编解码
- [Java IO/NIO 与序列化](/service/java/java-io) - 序列化体系的地基（Protobuf / Hessian 出现的位置）
- [Spring Cloud 微服务](/service/java/spring-cloud) - OpenFeign / Nacos / Sentinel 的组件全景
- [HTTP 与网络基础](/service/common/http-network-basics) - RPC 底下的 TCP / HTTP/2 知识
- [分布式基础](/service/common/distributed-basics) - CAP、分布式事务、超时重试的分布式视角
- [高并发高可用设计](/service/java/java-high-concurrency) - 限流算法、容量估算（RPC 是它们的主要应用场景）
- [BFF 模式](/service/bff) - 浏览器调不到 gRPC 时，协议转换层怎么落地
- [Java 并发编程](/service/java/java-concurrency) - 线程池与阻塞式 RPC 的配合关系

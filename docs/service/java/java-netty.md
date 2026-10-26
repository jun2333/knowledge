# Netty 入门（JS 开发者视角）

> **优先级：P1（中高级岗加分项）** — 日常写 Spring Boot 用不到它，但 Dubbo、RocketMQ、Elasticsearch、各种网关/IM/游戏服务器的底座都是 Netty。面试问到"了解过网络框架吗"，它是标准答案。

::: tip 背景
《Java IO/NIO》讲过：NIO 的 Selector 性能强但 API 难用，AIO 在 JDK 上又不成熟。Netty 就是**把 NIO 封装成"能写业务代码"的框架**——对前端开发者，它最像 Node 的 `net`/`http` 模块 + 中间件体系的合体。
:::

## Netty 是什么

一句话：**Java 领域最流行的 NIO 网络编程框架**，封装了 TCP/UDP/HTTP 协议栈，让你用写业务代码的方式处理高并发连接。

**它解决裸 NIO 的哪些痛**：

| 裸 NIO 的痛苦 | Netty 的方案 |
|--------------|-------------|
| Selector 事件循环要自己写，边角 case 巨多 | EventLoop 封装好，你只管注册 Handler |
| 半包/粘包（TCP 是字节流，没有消息边界） | 内置解码器（`LengthFieldPrepender` 等） |
| ByteBuffer 难用（flip/clear/compact 反人类） | `ByteBuf` 引用计数 + 池化 |
| 线程模型自己设计 | Reactor 模型开箱即用 |
| 内存泄漏难查（Buffer 用完要释放） | 池化 + 泄漏检测 |

## 演进：BIO → NIO → Netty

```
BIO：一连接一线程，阻塞等待
  → C10K 撑不住（1 万个连接 = 1 万个线程）
NIO：Selector 单线程管理万连接，性能够但 API 原始
  → 能跑但难写、难维护、坑多
Netty：Netty 把 NIO 封成框架 + 补全协议/线程/内存细节
  → 业界事实标准（Java 网络编程的"Express"）
```

**前端对照**：这个演进和 Node 一样——最初裸写 `net` 模块很痛苦，才有了 Express/Koa。Netty 就是 Java 网络层的 Express：帮你处理了协议解析、连接管理、线程调度，你写 Handler（类似中间件）就行。

## 核心概念：四件套

```
ServerBootstrap          ← 启动器（类似 app.listen()）
  └── EventLoopGroup     ← 线程组（boss 负责接连接，worker 负责读写）
        └── Channel      ← 一个连接（类似 socket）
              └── ChannelPipeline   ← 处理器链（洋葱模型！）
                    └── ChannelHandler ← 你的业务逻辑（类似中间件）
```

### ① EventLoop：事件循环（对应 Node 事件循环）

每个 EventLoop 是一个**单线程执行器**，绑定了一组 Channel，永远跑着一个循环：**有事件就处理，没事件就等**。它既是 Selector 的轮询线程，也是你业务的执行线程。

```java
// 心智模型：一个 EventLoop 线程 ≈ Node 的一个事件循环
while (true) {
    List<Event> events = selector.select();   // 等事件（epoll）
    for (Event e : events) { dispatch(e); }    // 分发给对应 Handler
}
```

**铁律**：一个 Channel 的读写永远在同一个 EventLoop 线程——所以**你的 Handler 不用考虑线程安全**（单线程内串行执行），这是 Netty 的线程模型精髓。

### ② ChannelPipeline + Handler：洋葱模型（重点）

 inbound/outbound 处理器串成一条链，数据像过洋葱一样一层层处理：

```java
new ServerBootstrap()
    .group(bossGroup, workerGroup)
    .channel(NioServerSocketChannel.class)
    .childHandler(new ChannelInitializer<SocketChannel>() {
        protected void initChannel(SocketChannel ch) {
            ch.pipeline()
                .addLast(new LengthFieldBasedFrameDecoder(1024, 0, 4))  // ① 拆包
                .addLast(new StringDecoder())                            // ② 字节→字符串
                .addLast(new MyBusinessHandler());                       // ③ 你的业务
        }
    });
```

**这链就是 Koa 中间件**：每个 Handler 处理一段（解码/鉴权/业务/编码），`ctx.fireChannelRead(msg)` 传给下一个——和 Koa 的 `next()` 一模一样：

```javascript
// Node 侧同构
app.use(lengthDecoder)   // 拆包
   .use(jsonParser)      // 解码
   .use(businessLogic)   // 业务
```

### ③ ByteBuf：更好用的 Buffer

比 NIO 的 `ByteBuffer` 好在：读写双索引不用 flip、支持池化（复用内存，降 GC 压力）、引用计数自动管理释放。**读 Buffer 就是读字节数组，业务开发基本不用直接碰它**（解码器都封装好了）。

## 最小示例：Echo 服务器

```java
public class EchoServer {
    public static void main(String[] args) throws Exception {
        EventLoopGroup boss = new NioEventLoopGroup(1);
        EventLoopGroup worker = new NioEventLoopGroup();   // 默认 2×CPU 核数

        new ServerBootstrap()
            .group(boss, worker)
            .channel(NioServerSocketChannel.class)
            .childHandler(new ChannelInitializer<SocketChannel>() {
                protected void initChannel(SocketChannel ch) {
                    ch.pipeline().addLast(new SimpleChannelInboundHandler<String>() {
                        protected void channelRead0(ChannelHandlerContext ctx, String msg) {
                            System.out.println("收到: " + msg);
                            ctx.writeAndFlush(msg);      // 原样写回（echo）
                        }
                    });
                }
            })
            .bind(8080).sync().channel().closeFuture().sync();
    }
}
```

30 行就是一个生产级高并发 TCP 服务器。换成裸 NIO，这个至少要写 200 行还一堆坑。

## 谁在用 Netty（知道生态地位就够）

| 产品 | 用 Netty 干什么 |
|------|----------------|
| **Dubbo** | RPC 通信（服务间调用就是 Netty 传字节） |
| **RocketMQ** | Broker 与客户端的通信 |
| **Elasticsearch** | 节点间传输层 |
| **Spring Cloud Gateway** | 基于 Netty 的响应式网关 |
| **游戏/IM/推送服务** | 长连接海量并发场景的标配 |

**认知建立**：微服务里"服务 A 调服务 B"看着是 HTTP，底下可能是 Netty 封的自定义二进制协议（更快更小）——这就是 RPC 的世界。

## 面试题速查

| 问题 | 一句话答案 |
|------|-----------|
| Netty 是什么 | 基于 NIO 的高性能网络编程框架，封装 Reactor 线程模型 + 协议编解码 |
| Netty 解决 NIO 什么问题 | API 难用、半包粘包、内存管理、线程模型——全封装好 |
| Netty 的线程模型 | Reactor 模式：boss 线程接连接，worker EventLoop 管 IO + 执行业务 |
| EventLoop 是什么 | 单线程事件循环（≈ Node 事件循环），一个 Channel 绑定一个，Handler 无线程安全问题 |
| Pipeline 和 Handler 什么关系 | Handler 串成责任链，数据像洋葱一样逐层处理（≈ Koa 中间件） |
| 半包/粘包是什么 | TCP 是字节流无消息边界，"一次发 10 字节却分两次收到"或"两次发送合成一次收到"；用帧解码器解决 |
| Netty 和 Spring Boot 什么关系 | Spring Boot 自带 Tomcat 处理 HTTP；Netty 用于 RPC/网关/长连接等自定义协议场景 |
| 有哪些零拷贝 | `DirectByteBuffer`（堆外直接读网卡）、`FileRegion`（文件传输不过用户态）、`CompositeByteBuf`（逻辑合并） |

## 延伸阅读

- [Java IO/NIO 与序列化](/service/java/java-io) - 本文的地基：Channel/Buffer/Selector
- [RPC 原理与 Java 生态](/service/java/rpc-in-java) - 本文在服务间调用场景的正式展开：Dubbo/gRPC 怎么用 Netty 传字节
- [HTTP 与网络基础](/service/common/http-network-basics) - Netty 处理的数据在网络层的来龙去脉
- [Java 并发编程](/service/java/java-concurrency) - EventLoop 的线程模型基础
- [Spring Cloud 微服务](/service/java/spring-cloud) - OpenFeign/Gateway 的 RPC 语境
- [浏览器 WebSocket](/browser/websocket) - 前端侧的长连接对照
- [Java 服务部署最佳实践](/service/java/java-deployment) - 网络服务上线全流程

# Spring Cloud 微服务

> **优先级：P1（微服务岗位必问）** — 了解微服务全家桶组件职责 + 能说清一个完整链路即可，不必背每个组件的 API。

::: tip 背景
微服务 = 把单体拆成多个独立部署的服务。Spring Cloud Alibaba 是国内主流全家桶。本文按"服务要解决什么问题"组织组件，而不是按组件背 API。
:::

## 微服务拆了什么，带来什么问题

```
单体：一个应用（用户/订单/库存都在）
微服务：用户服务 / 订单服务 / 库存服务 / 网关 ...

拆分的代价（每个都要解决）：
1. 服务之间怎么互相调用？       → OpenFeign（HTTP） / Dubbo（RPC）
2. 服务地址怎么互相知道？       → Nacos 注册中心
3. 服务挂了怎么不拖垮别人？     → Sentinel 熔断降级
4. 配置改了一个个重启？         → Nacos Config 配置中心
5. 请求从哪进？统一入口？       → Gateway 网关
6. 链路出问题怎么排查？         → SkyWalking / 日志链路 ID
```

## 组件全景图

```
客户端
  ↓
Gateway（网关：路由、鉴权、限流）
  ↓
Nacos（注册中心 + 配置中心）
  ↓ 服务发现
用户服务 ←→ OpenFeign → 订单服务 ←→ 库存服务
  ↓                ↑
Sentinel（熔断、限流、降级）在每个服务内部
  ↓
MySQL / Redis / MQ
```

| 组件 | 职责 | 对应单体时代 |
|------|------|-------------|
| **Nacos** | 注册中心（服务注册/发现）+ 配置中心 | 服务地址硬编码 → 动态发现 |
| **OpenFeign** | 声明式 HTTP 客户端，`@FeignClient` 接口调用 | 手动拼 HTTP 请求 |
| **Gateway** | 统一入口：路由转发、鉴权、限流、跨域、灰度 | 没有（单体直接访问） |
| **Sentinel** | 熔断、限流、系统保护 | 没有（挂了就挂了） |
| **Seata** | 分布式事务（AT/TCC 模式） | 数据库事务 |

> Gateway 是这堆组件里**唯一横切所有请求**的一环——鉴权、限流、日志、灰度都在它这里统一做，所以它的职责边界比其他组件更需要说清楚。详见 [API 网关深度篇](/service/java/spring-cloud-gateway)。

## 注册中心：Nacos

```
服务启动 → Nacos 注册（IP:端口 + 健康检查）
服务调用 → 问 Nacos 要目标服务地址列表 → 本地缓存 + 负载均衡（Ribbon/Spring Cloud LoadBalancer）
服务挂掉 → 健康检查失败 → 从注册列表剔除
```

**面试题：注册中心挂了服务还能调吗？**——能，本地有缓存的服务列表；只是新增/变更感知不到。这也是"AP 可用性优先"的设计。

**Nacos vs Eureka vs ZooKeeper**：
- Eureka：AP（挂了也能用），已停更
- ZooKeeper：CP（强一致，注册中心场景反而重）
- Nacos：**AP/CP 可切换**，国内主流

## 服务调用：OpenFeign

```java
@FeignClient(name = "order-service")          // 服务名（注册中心里的名字）
public interface OrderClient {
    @GetMapping("/api/orders/{id}")           // 路径
    OrderDTO getOrder(@PathVariable Long id); // 和本地方法一样调用
}
```

**面试题：Feign 和直接 HTTP 调用区别？**——Feign 声明式（接口即客户端）、自动集成负载均衡、可配置超时/重试/降级，不用手写 HTTP 请求。

> Feign 本质上是"跑在 HTTP 上的半个 RPC"——保留了方法调用的写法，但传输层仍是普通 HTTP + JSON。Dubbo / gRPC 这类真 RPC 的原理与选型，见 [RPC 原理与 Java 生态](/service/java/rpc-in-java)。

**降级**（服务挂了返回兜底）：

```java
@FeignClient(name = "order-service", fallbackFactory = OrderClientFallback.class)
```

## 熔断限流：Sentinel

| 概念 | 说明 |
|------|------|
| 限流 | 控制 QPS：超阈值直接拒绝（保护自己） |
| 熔断 | 下游失败率超阈值 → 快速失败（保护下游，不再狂打） |
| 降级 | 熔断后返回兜底数据（缓存数据/默认值） |

**面试题：熔断和降级区别？**——熔断是**状态**（下游故障，主动短路）；降级是**策略**（故障时给替代响应）。触发熔断后走降级逻辑。

**雪崩怎么防**：A 调 B 调 C，C 挂了 → B 的线程全部卡在等 C → B 的资源耗尽 → A 也挂 → 全链路挂。用 Sentinel 在 B 对 C 的调用处熔断，快速失败。

## 网关：Gateway

网关是所有请求进系统的第一道门。上面组件表里的"路由转发、统一鉴权、限流、日志、跨域"只是职责清单——**具体怎么实现的**，见 [API 网关深度篇](/service/java/spring-cloud-gateway)，本节先给出能上手的最小骨架和三个关键认知。

### 最小可用配置

```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:                    # ⚠️ 2025.x 起必须带这一层
          routes:
            - id: user-route
              uri: lb://user-service        # lb:// + 服务名，走注册中心负载均衡
              predicates:
                - Path=/api/user/**         # 路径匹配路由
              filters:
                - StripPrefix=1             # 去掉 /api 前缀再转发
```

> **版本坑**：Spring Cloud 2025.0 起 starter 改名 `spring-cloud-starter-gateway-server-webflux`，配置前缀改成 `spring.cloud.gateway.server.webflux.*`。旧写法在新版本里**不报错，路由直接静默失效**——升级后务必 `curl /actuator/gateway/routes` 确认路由真的加载了。

### 三个关键认知

**① 它是"路由表 + 中间件"，不是转发器。** 一条路由 = `Predicate`（要不要走这条）+ `Filter`（走之前/之后做什么）+ `uri`（去哪）。多个 Predicate 是 AND 关系；多条路由按配置顺序遍历，第一条匹配的命中——所以**具体路由必须写在宽泛路由前面**，否则被静默截胡。

**② 它跑在响应式栈上（Netty + Reactor），不能写阻塞代码。** 在过滤器里调 JDBC / `RestTemplate` / `Thread.sleep`，会卡住事件循环线程——**那一个慢查询能让整个网关的所有请求一起停摆**，不是"这个接口慢"，是"网关全挂"。

**③ 鉴权在网关统一做，但下游仍要复验。** 网关校验 JWT 后把用户身份注入 `X-User-Id` 转发给下游，下游直接读。网关上必须先 `RemoveRequestHeader=X-User-Id` 删掉客户端带来的同名头，否则客户端伪造一个 `X-User-Id: admin` 就是越权。

### 网关要不要开发者维护？

**大多数公司是"共享网关"模式——由平台/基础架构团队维护，业务团队只提需求（"给我加一条路由"），不碰网关代码。** 业务开发者的边界是：

| 你能做 | 谁来做 | 怎么落地 |
|--------|--------|---------|
| 加一条新路由 | 你提需求 → 平台配置 | 路由配置外置到 Nacos，改配置自动刷新，不发版 |
| 加一个通用过滤器 | 平台开发 + 你提需求 | 说明"要做什么"，平台做成通用件供多团队复用 |
| 改鉴权规则 | 平台 | 通常是配置化（白名单路径、密钥切换） |

**你绝对不该做的**：在网关过滤器里写业务逻辑（"订单金额 > 1 万要审批"）、做数据聚合（那是 [BFF](/service/bff) 的活）、改请求体字段（后端改个字段名就得发版网关，所有团队排队等平台）。

**判断标准一句话**：*团队改自己的服务行为，需不需要网关跟着发版？需要，就说明有东西放错地方了。*

**网关和 Nginx 的分工**：Nginx 解决"**连接和流量**"（TLS 终止、静态资源、扛万级连接），网关解决"**请求和身份**"（路由、鉴权、限流、灰度）。两者叠加，不是二选一——细节见 [API 网关深度篇](/service/java/spring-cloud-gateway)。

## 配置中心：Nacos Config

- 配置放 Nacos，服务启动/刷新时拉取（`@RefreshScope` 动态刷新）
- 解决：配置修改不用逐个服务重启
- 对应你的 `.env` / `application.yml`，只是集中管理 + 热更新

## 面试题速查

| 问题 | 一句话答案 |
|------|-----------|
| 微服务拆分原则 | 按业务域拆（DDD 思想），独立部署独立演进 |
| 注册中心作用 | 服务注册发现 + 健康检查，解耦服务地址 |
| Nacos 和 Eureka 区别 | Nacos 支持 CP/AP 切换 + 配置中心；Eureka 只做注册且已停更 |
| Feign 是什么 | 声明式 HTTP 客户端，接口即远程调用 |
| 熔断和降级区别 | 熔断是状态（短路），降级是策略（兜底） |
| 怎么防雪崩 | 熔断 + 限流 + 线程隔离（Sentinel） |
| 网关做什么 | 路由、鉴权、限流、跨域、灰度统一入口 |
| 网关和 Nginx 区别 | Nginx 解决连接和流量（TLS/静态/高并发），网关解决请求和身份；两者叠加 |
| 网关怎么路由 | Predicate 匹配 + Filter 加工 + uri 转发；多路由按顺序第一条命中，具体路由写前面 |
| 网关为什么不能写阻塞代码 | 跑在 Netty 事件循环上，一个阻塞调用会卡住整个网关的所有请求 |
| 网关鉴权怎么做 | 网关校验 JWT 后注入 `X-User-Id` 转发下游；注入前必须先删客户端同名字头防伪造；下游仍要复验 |
| 网关要不要业务开发者维护 | 共享网关由平台团队维护，业务只提需求；判据是"改业务要不要网关发版" |
| 分布式链路追踪 | 请求带 traceId 贯穿所有服务（SkyWalking/日志） |

## 延伸阅读

- [API 网关：Spring Cloud Gateway 深入](/service/java/spring-cloud-gateway) - 网关的路由/鉴权/日志/限流实现与职责边界
- [RPC 原理与 Java 生态](/service/java/rpc-in-java) - Feign / Dubbo / gRPC 的原理与选型
- [分布式基础](/service/common/distributed-basics) - CAP 理论、分布式事务
- [Docker 入门](/service/docker) - 微服务部署载体
- [权限设计](/service/permission-design) - 网关鉴权的落地

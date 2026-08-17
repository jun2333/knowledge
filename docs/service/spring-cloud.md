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
| **Gateway** | 统一入口：路由转发、鉴权、限流、跨域 | 没有（单体直接访问） |
| **Sentinel** | 熔断、限流、系统保护 | 没有（挂了就挂了） |
| **Seata** | 分布式事务（AT/TCC 模式） | 数据库事务 |

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

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-route
          uri: lb://user-service        # lb:// + 服务名，走注册中心负载均衡
          predicates:
            - Path=/api/user/**         # 路径匹配路由
          filters:
            - StripPrefix=1             # 去掉 /api 前缀再转发
```

职责：路由转发、统一鉴权（JWT 校验）、限流、日志、跨域。

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
| 网关做什么 | 路由、鉴权、限流、跨域统一入口 |
| 分布式链路追踪 | 请求带 traceId 贯穿所有服务（SkyWalking/日志） |

## 延伸阅读

- [分布式基础](/service/distributed-basics) - CAP 理论、分布式事务
- [Docker 入门](/service/docker) - 微服务部署载体
- [权限设计](/service/permission-design) - 网关鉴权的落地

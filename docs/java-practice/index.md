# Java 后端实战学习计划（以 mall 为主线）

> **定位**：把 service 模块的理论知识落到项目代码里，目标是**尽快达到能干活**——能独立在 Spring Boot 项目里完成业务接口开发，能读懂现有代码链路，能排查常见问题。
>
> **前置条件**：环境已就绪（JDK 17 + Maven + MySQL/Redis + IDEA），mall 项目已跑通（Swagger 可访问）。

## 一、目标定义：什么叫"能干活"

完成本计划的阶段 1-6 后，你应该能：

1. **独立开发一个业务接口**：建表 → 生成实体/Mapper → Service → Controller → 联调测试，一条龙
2. **读懂一个 Spring Boot 项目的代码**：拿到任何模块，能快速定位"请求从哪进、逻辑在哪、数据怎么落库"
3. **处理常见问题**：接口报错能看日志定位（全局异常、SQL 报错、空指针）；改配置能起服务
4. **有基本安全认知**：知道 JWT 鉴权怎么生效、接口怎么被保护

> 不需要：啃完 mall 所有服务（有很多），不需要背设计模式定义（service 模块已有），不需要自己造轮子。

## 二、学习原则

| 原则 | 说明 |
|------|------|
| **mall 打底，12306 进阶** | mall 是单体 Spring Boot，一条请求从 Controller 到 MySQL 链路最完整、最适合建立骨架认知；12306 是微服务，等你单体能写透再上 |
| **读代码 + 动手双轮驱动** | 每个阶段都有"读什么"和"动手任务"。只读不写 = 白读；只写不读 = 瞎写 |
| **以链路为单位读代码** | 不要按文件顺序读，要按"一个请求怎么走完"来读（Controller → Service → Mapper → SQL） |
| **理论随时查 service 模块** | 遇到概念（IoC、AOP、事务、Redis）回 service 对应文章查，文档和代码互相印证 |
| **用调试器当放大镜** | 不确定逻辑时打断点单步走，比猜快十倍 |

## 三、阶段总览

| 阶段 | 主题 | 核心目标 | 对应指南 |
|------|------|---------|---------|
| 0 | 环境与跑通 | 项目能启动、Swagger 能调接口 | 已完成 ✅ |
| 1 | 请求全链路 | 用**登录接口**把"一个请求怎么走完"读透（含 JWT） | [01 跑通与请求链路](/java-practice/01-run-and-trace-request) |
| 2 | CRUD 模块 | 读透商品模块的分页/查询/上下架，掌握三层架构写法 | [02 CRUD 模块实战](/java-practice/02-crud-module) |
| 3 | 数据访问与事务 | 读懂 MyBatis + Example 查询、事务注解、统一返回封装 | [03 数据访问与事务](/java-practice/03-data-access-transaction) |
| 4 | Redis 缓存 | 读懂缓存注解、缓存读写流程，理解缓存穿透/失效 | [04 Redis 缓存实战](/java-practice/04-redis-cache) |
| 5 | 安全与权限 | 读懂 JWT 过滤器、白名单、动态权限（RBAC） | [05 安全与权限](/java-practice/05-security-auth) |
| 6 | 动手开发 | 在 mall 里**新增一个完整功能模块**，走一遍真实开发流程 | [06 动手开发新功能](/java-practice/06-build-new-feature) |
| 7 | 12306 微服务（可选） | 了解微服务拆分、注册中心、网关、分布式锁 | [07 12306 微服务进阶](/java-practice/07-microservice-12306) |

> 📌 **实战收获记录**：在 mall 实战中沉淀的收获与踩坑，持续追加 → [harvest.md](/java-practice/harvest)

## 四、阶段详解

### 阶段 0：环境与跑通（已完成 ✅）
- JDK 17 + Maven（阿里云镜像）+ MySQL 8（Docker）+ Redis（Docker）+ IDEA
- mall 项目启动成功，`http://localhost:8080/swagger-ui/index.html` 可访问
- 数据库 `mall` 已导入 76 张表

### 阶段 1：请求全链路（最重要，打地基）
**目标**：能完整说出一条请求的旅程，包括中间件过滤器和异常处理。

**读**（用调试器在 `POST /admin/login` 打断点，单步走）：
- `UmsAdminController.login()` → `UmsAdminServiceImpl.login()` → `JwtTokenUtil.generateToken()`
- 中间穿插：`CommonResult`（统一返回）、`GlobalExceptionHandler`（异常兜底）、`JwtAuthenticationTokenFilter`（为什么登录接口不需要 token）

**动手**：在 Swagger 里调通 `POST /admin/login`（admin/macro123），拿到 token；再用 token 调一个受保护接口，观察 401 和成功的区别。

**验收**：能画出一条请求的完整链路图（过滤器 → Controller → Service → Mapper → DB），并解释为什么登录接口不用带 token。

### 阶段 2：CRUD 模块实战
**目标**：掌握三层架构 + 分页 + 状态变更的标准写法。

**读**：
- `PmsProductController` → `PmsProductServiceImpl` → `PmsProductMapper.xml`
- 重点：`list()` 分页查询（CommonPage 封装）、`updateStatus()` 状态更新、`delete()`

**动手**：在 Swagger 里对商品模块做一次完整的增删改查 + 分页查询。

**验收**：能在纸上写出一个标准 CRUD 接口的代码骨架（Controller + Service + Mapper）。

### 阶段 3：数据访问与事务
**目标**：理解 MyBatis 的工作方式（接口 + XML）、Example 动态 SQL、事务边界。

**读**：
- `PmsProductMapper.xml`（看一条 select/update 的 SQL 怎么写，Example 的条件拼接）
- `UmsAdminServiceImpl` 里带 `@Transactional` 的方法（如登录记录日志）

**动手**：在数据库中手动执行一条 mapper XML 里的 SQL，对比 Java 代码调用效果；故意造一个事务回滚场景（抛异常观察数据是否回滚）。

**验收**：能解释"为什么 Mapper 接口没有实现类也能被调用"（MyBatis 动态代理），能说明事务注解失效的常见原因。

### 阶段 4：Redis 缓存实战
**目标**：理解缓存在项目里怎么落地、缓存和 DB 的一致性怎么处理。

**读**：
- `RedisCacheAspect`（`@CacheException` 切面，失败降级）
- `UmsAdminCacheServiceImpl`（为什么 admin 信息要缓存）
- `mall-common/RedisService`（Redis 封装）

**动手**：在 IDEA 里用 Redis 客户端看 mall 的缓存 key；调接口后观察缓存写入；手动删一个缓存 key 再看接口回源。

**验收**：能解释缓存穿透/击穿/雪崩，并说出 mall 里的应对手段。

### 阶段 5：安全与权限
**目标**：理解 JWT 无状态鉴权 + Spring Security 过滤器链 + RBAC 动态权限。

**读**：
- `JwtTokenUtil`（token 生成/解析/过期）
- `SecurityConfig` + `IgnoreUrlsConfig`（白名单机制，还记得 `/swagger-ui/` 那个 401 吗）
- `JwtAuthenticationTokenFilter`（过滤器怎么把用户塞进上下文）
- `DynamicAuthorizationManager`（动态权限：角色/资源）

**动手**：改造白名单加一个新接口（或去掉一个白名单），观察 401/403 变化。

**验收**：能画出"带 token 请求"和"不带 token 请求"分别经过哪些过滤器，在哪个环节被放行/拦截。

### 阶段 6：动手开发新功能（毕业设计）
**目标**：完整走一遍真实开发流程，交付一个可用功能。

**任务**：在 mall 里新增一个业务模块（如"优惠券发放"或任意你感兴趣的功能），要求：
1. 建表 + 写 SQL
2. 生成/手写实体 + Mapper
3. 写 Service（含事务、分页、统一异常）
4. 写 Controller（RESTful + Swagger 注解）
5. Swagger 里自测通过

**验收**：新功能能跑、代码风格和 mall 一致、能给别人讲清你每一步为什么这么写。

### 阶段 7：12306 微服务进阶（可选，进阶目标）
**目标**：从单体到微服务，理解拆分、注册、网关、分布式锁。

**读**：
- `nageoffer/12306` 的 `services/` 模块划分
- 注册中心（Nacos）、网关、分布式锁（Redis）的落地

**动手**：本地启动 1-2 个 12306 服务，走通一条业务请求（如查票）。

**验收**：能说出 mall（单体）和 12306（微服务）在架构上的关键差异。

## 五、学习方法论

### 怎么读代码（按链路，不按文件）
1. **先找入口**：Controller 里的方法（Swagger 里能看到 URL → 点进源码）
2. **跟调用链**：方法名逐个跳转（`Cmd+点击`），Service → Mapper → XML
3. **画链路图**：看完用 Mermaid 画一遍（项目约定用 Mermaid），画不出来就是没读透
4. **用调试器验证**：打断点单步，亲眼看到数据流

### 怎么用调试器（IDEA）
- 在方法行号左侧点红点 → 点 Debug 按钮（虫子图标）启动
- `Step Over (F8)`：执行当前行，不进入方法
- `Step Into (F7)`：进入方法内部
- `Step Out (Shift+F8)`：跳出当前方法
- 观察 Variables 窗口的变量变化

### 怎么查资料
- 概念类：回 service 模块找对应文章（Java 并发、Spring 原理、MQ…）
- 报错类：复制异常关键词搜索，先看**最后一个 Caused by**
- API 类：看源码注释或官方文档，别背

## 六、常用命令速查

```bash
# 启动/停止 MySQL、Redis（Docker）
docker start mysql8 redis
docker stop mysql8 redis
# 连 MySQL
docker exec -it mysql8 mysql -uroot -proot mall
# 看 MySQL 日志
docker logs mysql8 --tail 50
# 后端启动（IDEA 里运行 MallAdminApplication，或命令行）
cd ~/Documents/Jun/code/mall/mall-admin && mvn spring-boot:run
# Swagger 接口文档
# 浏览器打开 http://localhost:8080/swagger-ui/index.html
```

## 七、参考
- [Service 模块理论文章](/service/roadmap) — 所有概念的对应理论
- [mall 官方文档](https://www.macrozheng.com/) — 项目作者写的教程，遇到不懂的模块可查

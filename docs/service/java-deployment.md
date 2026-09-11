# Java 服务部署最佳实践

> **定位**：Spring Boot 服务从"代码能跑"到"线上稳定运行"的完整流程。与 [Node.js 服务部署](/service/node-deployment) 对照阅读——两者思路一致，差异集中在 **JVM 调优**和**打包方式**。
> 配套阅读：[Docker 入门](/service/docker)、[mall 项目部署实操](/java-practice/09-deployment-practice)（本文的"具体案例版"）。

## 部署全景

```
本地开发                  CI/CD                     线上服务器
┌──────────┐        ┌──────────────┐        ┌──────────────────────┐
│ 写代码    │  push  │ 测试 → 打包   │  部署   │ nginx (80/443)       │
│ IDEA 调试 │ ─────→ │ mvn package  │ ─────→ │  ├─ 前端静态资源      │
└──────────┘        │ 打镜像       │        │  └─ 反代 → App:8080   │
                    └──────────────┘        │      ↓               │
                                            │  java -jar (JVM)     │
                                            │      ↓               │
                                            │  MySQL / Redis / MQ  │
                                            └──────────────────────┘
```

**与 Node 部署的核心差异**：

| 维度 | Node.js | Java（Spring Boot） |
|------|---------|---------------------|
| 产物 | 源码 / 打包后的 JS | **可执行 jar**（内嵌 Tomcat，`java -jar` 即启动） |
| 运行时 | V8，单线程 + 事件循环 | **JVM**，多线程 + 堆内存管理 |
| 性能调优点 | 事件循环阻塞、cluster 多核 | **JVM 参数、GC、堆大小** |
| 启动速度 | 快（百毫秒） | 慢（几秒 ~ 几十秒，需预热） |
| 内存占用 | 小（几十 ~ 几百 MB） | 大（JVM 基础开销 + 堆） |
| 进程管理 | PM2 / systemd / Docker | systemd / Docker（**不用 PM2**，JVM 自己管线程） |

## 一、打包与多环境

**打可执行 jar**（`spring-boot-maven-plugin` 会把依赖一起打进去）：

```bash
mvn clean package -DskipTests
java -jar target/mall-admin-1.0-SNAPSHOT.jar --spring.profiles.active=prod
```

**多环境配置**（Spring Boot 的 profile 机制）：

```
src/main/resources/
├── application.yml            # 公共配置
├── application-dev.yml        # 本地开发
├── application-test.yml       # 测试环境
└── application-prod.yml       # 生产(host 用容器名/内网域名)
```

```bash
# 启动时指定 profile(优先级高于配置文件)
java -jar app.jar --spring.profiles.active=prod
# 或用环境变量(容器部署更常用)
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

**上线前必配两项**：

```yaml
# ① 健康检查(供 nginx / K8s / 监控探活)
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized

# ② 优雅停机(Spring Boot 2.3+):收到 SIGTERM 后先处理完存量请求
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

> **为什么需要优雅停机**：滚动更新时容器会被 kill，没有它正在处理的请求直接 502。原理与 Node 的 `SIGTERM` 处理一致。

## 二、服务器与环境

| 项 | 建议 |
|----|------|
| **JDK 版本** | 与编译版本一致（如 Java 17/21）；**生产用 JRE 或 jlink 精简镜像**即可，不需要完整 JDK |
| **运行用户** | 专用普通用户（如 `deploy`），**别用 root** |
| **目录规范** | 应用 `/opt/<app>`、日志 `/var/log/<app>`、堆转储 `/data/dump` |
| **时区** | 容器默认 UTC → 用 `-Duser.timezone=Asia/Shanghai` 或 `TZ` 环境变量，**否则日志和业务时间差 8 小时** |
| **文件句柄** | 高并发服务要调 `ulimit -n`（默认 1024 容易不够） |
| **防火墙** | 只开 80/443，DB/Redis 端口走内网 |

## 三、JVM 参数与调优（Java 部署的核心）

```bash
java -jar app.jar \
  -Xms2g -Xmx2g \                          # 堆初始 = 最大,避免动态扩容抖动
  -XX:MaxMetaspaceSize=256m \              # 元空间上限(防类加载泄漏)
  -XX:+UseG1GC \                           # GC 选择(JDK 9+ 默认 G1)
  -XX:MaxGCPauseMillis=200 \               # 目标停顿时间
  -XX:+HeapDumpOnOutOfMemoryError \        # OOM 时自动 dump,便于事后分析
  -XX:HeapDumpPath=/data/dump/ \
  -Xlog:gc*:file=/var/log/app/gc.log:time,uptime:filecount=5,filesize=50M \  # GC 日志(JDK 9+ 语法)
  -Duser.timezone=Asia/Shanghai
```

**关键认知**：

| 要点 | 说明 |
|------|------|
| **`-Xms` = `-Xmx`** | 生产建议设成一样，避免堆动态伸缩带来的性能抖动 |
| **堆不是越大越好** | 堆越大，Full GC 停顿越长；且要给**堆外内存**（元空间、线程栈、直接内存）留空间 |
| **容器感知** | JDK 10+ 默认开启 `UseContainerSupport`，会自动按容器 limit 算堆；但仍建议**显式指定** `-Xmx`（默认只用到 1/4） |
| **GC 选择** | 一般用 G1；追求极低延迟（如交易系统）可用 ZGC（JDK 15+ 生产可用） |
| **OOM 排查** | `-XX:+HeapDumpOnOutOfMemoryError` + MAT / VisualVM 分析 dump |

> **最经典的坑**：容器 limit 是 1G，JVM 却按物理机内存算堆 → 堆 + 堆外超限 → **容器被 OOMKilled（不是 Java OOM，日志里看不到异常）**。所以：**显式设 `-Xmx`，且留出 ~30% 给堆外和系统**。

## 四、进程管理：两种方式

| 方式 | 命令 | 适用 |
|------|------|------|
| **systemd** | `systemctl start app` | 裸机 / 虚拟机 |
| **Docker**（推荐） | `docker compose up -d` | 生产环境 |

**systemd 示例**：

```ini
# /etc/systemd/system/mall-admin.service
[Unit]
Description=mall-admin
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/mall-admin
EnvironmentFile=/opt/mall-admin/.env
ExecStart=/usr/bin/java -Xms2g -Xmx2g -jar /opt/mall-admin/app.jar --spring.profiles.active=prod
SuccessExitStatus=143          # SIGTERM(143) 视为正常退出(优雅停机)
Restart=always
RestartSec=5
StandardOutput=append:/var/log/mall-admin/out.log
StandardError=append:/var/log/mall-admin/err.log

[Install]
WantedBy=multi-user.target
```

> Java 服务**不需要 PM2**——JVM 本身是多线程的，进程守护交给 systemd 或容器编排即可（对比 [Node 用 PM2 的 cluster 模式](/service/pm2)）。

## 五、容器化部署

**多阶段构建**（构建用 JDK，运行用 JRE）：

```dockerfile
# ---------- 构建阶段 ----------
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B          # 先下依赖,利用层缓存
COPY src ./src
RUN mvn clean package -DskipTests

# ---------- 运行阶段 ----------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app     # 非 root 用户
COPY --from=builder /build/target/*.jar app.jar
USER app
ENV TZ=Asia/Shanghai
EXPOSE 8080
ENTRYPOINT ["java", "-Xms512m", "-Xmx512m", "-jar", "app.jar"]
```

**更优：Spring Boot 分层**（利用 Docker 层缓存，改代码不用重传依赖）：

```bash
# 启动时先把 jar 按"变化频率"解成 4 层
java -Djarmode=layertools -jar app.jar extract
# dependencies/  spring-boot-loader/  snapshot-dependencies/  application/
```

```dockerfile
COPY --from=builder /build/dependencies/ ./
COPY --from=builder /build/spring-boot-loader/ ./
COPY --from=builder /build/snapshot-dependencies/ ./
COPY --from=builder /build/application/ ./
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

**收益**：依赖层很少变，改业务代码只重建最后一层，镜像构建和推送时间大幅缩短。

```yaml
# docker-compose.yml
services:
  mall-admin:
    image: mall/mall-admin:1.0.3          # 明确版本号,便于回滚
    restart: always
    env_file: .env
    ports: ["8080:8080"]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s                    # Java 启动慢,给足预热时间
```

> 具体到 mall 项目的 compose / nginx / ELK 配置，见 [mall 部署实操](/java-practice/09-deployment-practice)。

## 六、反向代理：nginx

```nginx
upstream mall_admin {
    server 127.0.0.1:8080;
    keepalive 32;                          # 保持长连接,减少握手开销
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        root /opt/web/dist;
        try_files $uri $uri/ /index.html;
    }

    location /admin/ {
        proxy_pass http://mall_admin/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";                    # 配合 keepalive
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;                            # 长请求(报表/导出)按需调大
    }

    gzip on;
    gzip_types application/json text/css application/javascript;
}
```

## 七、配置管理

| 配置类型 | 放哪 |
|---------|------|
| 非敏感（端口、日志级别、连接池大小） | `application-prod.yml` |
| 敏感（DB 密码、JWT Secret、第三方 Key） | **环境变量 / 配置中心**，绝不进 Git |
| 多环境差异 | profile + 环境变量覆盖 |
| 动态配置（改了要生效） | 配置中心：Nacos / Apollo / Spring Cloud Config |

```yaml
# 用占位符从环境变量读,给默认值方便本地跑
spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/mall}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:root}
```

> 配置中心的价值：**改配置不用重新打包发布**（改完推送即生效），适合开关、阈值这类需要随时调整的参数。

## 八、日志

| 原则 | 做法 |
|------|------|
| **分级** | logback 配 `root level=INFO`，按包调（如 `com.macro.mall=DEBUG`） |
| **切割** | `RollingFileAppender`：按天 + 按大小切割，保留 N 天 |
| **结构化 / 集中** | logback 的 Logstash appender 发到 ELK（配置见 [mall 部署实操](/java-practice/09-deployment-practice)） |
| **脱敏** | 不记密码、token、身份证；日志里用 MDC 带上 `traceId` 串链路 |
| **容器场景** | 输出到 stdout 交给 Docker/K8s 收集，而不是自己写文件 |

```xml
<!-- logback-spring.xml 关键片段:按天+大小切割,保留 30 天 -->
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
  <file>logs/app.log</file>
  <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
    <fileNamePattern>logs/app.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
    <maxFileSize>100MB</maxFileSize>
    <maxHistory>30</maxHistory>
    <totalSizeCap>10GB</totalSizeCap>       <!-- 总量上限,防写满磁盘 -->
  </rollingPolicy>
</root>
```

## 九、监控与告警

**Actuator + Prometheus + Grafana** 是标准组合：

```xml
<!-- 暴露 Prometheus 格式指标 -->
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

```yaml
management:
  endpoints.web.exposure.include: health,info,prometheus,metrics
  metrics.tags.application: mall-admin        # 多服务时区分
```

**要盯的关键指标**：

| 层 | 指标 | 异常信号 |
|----|------|---------|
| **JVM** | 堆使用率、GC 次数/停顿、线程数 | 堆持续上涨不回落 = 内存泄漏；Full GC 频繁 = 堆太小或有泄漏 |
| **应用** | QPS、P95/P99 耗时、错误率 | P99 突然抬升 = 下游变慢或锁竞争 |
| **依赖** | 连接池使用率、Redis 命中率、外部 API 耗时 | 连接池打满 = 慢 SQL 或连接泄漏 |
| **系统** | CPU、内存、磁盘、文件句柄 | 磁盘 80% 就该处理（日志/数据） |

**告警分级**（同 [Node 部署](/service/node-deployment)）：P0 服务不可用 → 电话；P1 错误率飙升 → 即时消息；P2 资源预警 → 邮件。

## 十、发布策略与回滚

| 策略 | 做法 | 特点 |
|------|------|------|
| **停机发布** | 停旧 → 起新 | 最简单，**有中断**（小项目可接受） |
| **滚动发布** | 逐个替换实例 | K8s 默认；需优雅停机配合 |
| **蓝绿发布** | 新旧两套环境，切流量 | 回滚最快（切回旧环境），成本翻倍 |
| **灰度 / 金丝雀** | 先放 5% 流量验证 | 风险最小，需要网关支持按比例分流 |

**回滚**：

```bash
# 镜像 tag 回退(前提:每次发布用明确版本号,别用 latest)
docker compose up -d --no-deps mall-admin     # 配合 image: mall/mall-admin:1.0.2
```

> **数据库变更要向后兼容**（这条比应用回滚更重要）：先加字段（代码兼容新旧）→ 发代码 → 再删旧字段。否则一删字段，回滚时旧代码直接崩。

## 常见坑

| 坑 | 现象 | 解决 |
|----|------|------|
| **时区不对** | 日志 / 业务时间差 8 小时 | `-Duser.timezone=Asia/Shanghai` 或 `TZ` 环境变量 |
| **容器 OOMKilled** | 进程莫名重启，日志无异常 | JVM 堆 + 堆外超容器 limit → 显式设 `-Xmx` 并留 30% 余量 |
| **健康检查失败** | 容器一直重启 | Java 启动慢 → healthcheck 加 `start_period`；确认 `/actuator/health` 已暴露 |
| **连接池打满** | 请求排队、超时 | 查慢 SQL / 连接泄漏；合理设 `maximum-pool-size` |
| **字符集乱码** | 中文存成 `???` | JDBC URL 加 `characterEncoding=utf8`，库/表用 `utf8mb4` |
| **优雅停机没生效** | 滚动更新时 502 | 配 `server.shutdown=graceful` + `SuccessExitStatus=143` |
| **内存泄漏** | 堆持续上涨 | `HeapDumpOnOutOfMemoryError` + MAT 分析；查静态集合 / 缓存无上限 |
| **启动慢被误判挂掉** | K8s 反复重启 | 调大 `initialDelaySeconds` / `start_period`，或用启动探针 |

## 相关

- [mall 项目部署实操](/java-practice/09-deployment-practice) - 具体项目的 compose / nginx / ELK 配置
- [Node.js 服务部署最佳实践](/service/node-deployment) - 对照阅读
- [Docker 入门](/service/docker) - Dockerfile / compose / 数据持久化
- [Spring Boot 入门](/service/spring-boot) - 打包与 profile 机制
- [Linux 常用命令](/service/linux-basics) - 服务器排查基础

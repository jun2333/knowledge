# mall 项目的部署流程 & 最佳实践

> **定位**：以 mall 项目实际部署文件为蓝本，讲清"一个 Spring Boot 项目从代码到线上"的完整流程。mall 部署相关文件分散在 `document/` 下，本文把它们串成一条可操作的流水线。

## 一、部署全景（要部署哪些东西）

```
基础设施（中间件）           应用服务              入口/日志
┌─────────────────┐   ┌──────────────────┐   ┌──────────────┐
│ mysql (3306)     │   │ mall-admin  (8080) │   │ nginx (80)    │
│ redis (6379)     │   │ mall-search (8081) │   │ logstash (4560 │
│ rabbitmq (5672)  │   │ mall-portal (8085) │   │  ~4563)       │
│ es (9200)        │   └──────────────────┘   │ kibana (5601)  │
│ mongo (27017)    │                          └──────────────┘
│ minio (9000/9001)│
└─────────────────┘
```

对应 mall 的部署文件：

| 文件 | 管什么 |
|------|--------|
| `document/docker/docker-compose-env.yml` | 基础设施全家桶（中间件） |
| `document/docker/docker-compose-app.yml` | 应用服务（admin/search/portal） |
| `document/docker/nginx.conf` | 统一入口（前端 + API 反代） |
| `document/sh/run.sh` / `mall-*.sh` | 应用"手动部署"脚本（不用 compose 时） |
| `document/sh/Dockerfile` | 应用镜像的构建定义 |
| `document/elk/logstash.conf` | 日志收集配置（logstash → ES） |

## 二、前置：基础设施先起来

**硬前提**：应用启动前，它依赖的中间件容器必须存在（应用靠 `--link` / `external_links` 按主机名连它们）。

**方式 A：docker-compose 一键**（推荐）

```bash
docker-compose -f document/docker/docker-compose-env.yml up -d
# 一口气起 mysql/redis/nginx/rabbitmq/es/logstash/kibana/mongo/minio
```

**方式 B：手动起**（只要跑 mall-admin 就够）

```bash
docker start mysql8 redis    # 或用 docker run 起 mysql/redis 两个
```

> **不一定非用 env 文件**，但"中间件容器必须在"是铁前提。env 只是最省事的"一键全套"。

## 三、应用镜像从哪来

镜像不是拉现成的，是**自己打**的：`openjdk:17 基础镜像 + 应用 jar`。

```
镜像名 mall/mall-admin:1.0-SNAPSHOT
        │      │            │
      仓库前缀 模块名      = maven 版本（${project.version}）
```

**两种打法**（产物等价）：

```bash
# ① Maven 插件自动打（root pom 的 docker-maven-plugin，package 时执行）
mvn package
# 镜像名由 pom 配置：mall/${project.name}:${project.version}
# 基础镜像：<from>openjdk:17</from>，入口：java -jar xxx.jar

# ② 手工 Dockerfile（document/sh/Dockerfile，和①等价）
cd document/sh   # 把 mall-admin-1.0-SNAPSHOT.jar 放这
docker build -t mall/mall-admin:1.0-SNAPSHOT .
```

## 四、部署应用（两种方式）

**方式 A：docker-compose-app.yml**（配合方式一的环境）

```bash
docker-compose -f document/docker/docker-compose-app.yml up -d
```

应用容器通过 `external_links` 连 env 起的中间件（按容器名解析）：
- mall-admin → mysql + redis（**注意：admin 依赖 redis**，原版 app.yml 漏了，已补）
- mall-search → es + mysql
- mall-portal → redis + mongo + mysql + rabbitmq

**方式 B：run.sh 手动**（admin 示例，各模块有对应脚本）

```bash
./document/sh/run.sh
# 内部：停旧容器 → 删旧镜像 → docker build → docker run
# docker run -p 8080:8080 --link mysql:db --link redis:redis -e spring.profiles.active=prod ...
```

**判断服务依赖的经验**：compose 里"没写"不等于"不依赖"——**以代码实际用了什么为准**（如 grep `RedisService` 就能证明 admin 用 redis）。

## 五、nginx 统一入口

部署后用 nginx（env 里那个或自配的）统一对外：

```
浏览器 → nginx:80
  ├─ /             → 前端静态页面（mall-admin-web 打包产物）
  └─ /admin/...    → 反代到 mall-admin:8080
```

配置见 `document/docker/nginx.conf`（静态资源目录 + API 反代）。对应前端：**构建后产物丢 nginx 静态目录，API 走 nginx 反代到后端**。

## 六、ELK 日志接入（可选）

```
应用（logback）→ TCP 发 4560-4563 → Logstash → ES → Kibana
```

- 应用侧：`logback-spring.xml` 已有 Logstash appender，开关是 `logstash.enableInnerLog`（默认 false）
- 部署侧：Logstash 的 input/output 在 `document/elk/logstash.conf`（监听 4560-4563，输出到 ES `localhost:9200`）
- env 的 docker-compose 已含 es/logstash/kibana；logstash.conf 挂载为 `/mydata/logstash/logstash.conf`

开启日志平台：把 prod 配置的 `logstash.enableInnerLog` 设为 true 即可。

## 七、端口速查

| 端口 | 谁 | 说明 |
|------|-----|------|
| 8080 | mall-admin | 后台 API |
| 8081 | mall-search | 搜索 API |
| 8085 | mall-portal | 前台 API |
| 80 | nginx | 统一入口 |
| 3306 / 6379 | mysql / redis | 基础 |
| 9200 / 5601 | es / kibana | ELK |
| 4560-4563 | logstash | 收日志 |
| 9000/9001 | minio | 文件存储 |

## 八、部署顺序 & 最佳实践

**标准顺序**：

```bash
# ① 起基础设施
docker-compose -f docker-compose-env.yml up -d

# ② 打应用镜像（mvn package 或 docker build）
mvn -pl mall-admin -am package

# ③ 起应用
docker-compose -f docker-compose-app.yml up -d
# 或手动 ./document/sh/run.sh

# ④ nginx 入口 + （可选）开 ELK 日志
```

**最佳实践清单**：

| 实践 | 说明 |
|------|------|
| 服务依赖以**代码/配置**为准 | compose 文件可能过时（admin 依赖 redis 就曾漏写） |
| 镜像版本和 maven 版本绑定 | `1.0-SNAPSHOT` 标识，升级代码要同步 tag |
| 数据卷挂载持久化 | mysql/redis 数据挂到 `/mydata/*`，容器删了数据不丢 |
| 环境变量区分 prod | `-e spring.profiles.active=prod`，配置和代码分离 |
| 日志别只进容器 | 应用日志卷挂到宿主机，或接 ELK |
| 部署前验证镜像 | `docker images` 确认有 `mall/mall-admin:1.0-SNAPSHOT` |
| 基础镜像用 openjdk:17 | 和 mall 的 Java 17 一致，别用旧 JDK 镜像 |

## 九、和本地开发的区别

| | 本地开发 | 生产部署 |
|--|---------|---------|
| 中间件 | docker start mysql8 redis | env compose 全家桶或自建 |
| 应用 | IDEA 里 Debug（dev profile） | 容器跑 jar（prod profile） |
| 配置 | application-dev.yml | application-prod.yml（host 用容器名） |
| 前端 | npm run dev（8090，代理 8080） | 打包产物给 nginx |
| 日志 | 控制台 | 文件/ELK |

## 相关

- [收获记录](/java-practice/harvest) - 日志链路（logback → Logstash → ES）的配置细节
- [Elasticsearch 入门](/service/elasticsearch) - ELK 里 ES 的角色
- [Spring Boot 入门](/service/spring-boot) - 打包部署一节（jar 内嵌 Tomcat）

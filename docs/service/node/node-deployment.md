# Node.js 服务部署最佳实践

> **优先级：P0** — 从"代码能跑"到"线上稳定运行"的完整流程。上线前必读。
>
> **定位**：涵盖上线前准备、服务器环境、进程管理、反向代理、容器化、配置密钥、日志、监控、CI/CD、上线清单与回滚。
> 配套阅读：[PM2 进程管理](/service/node/pm2)、[Docker 入门](/service/docker)、[Node.js 入门](/service/node/node-core)。

## 部署全景

```
本地开发                  CI/CD                    线上服务器
┌──────────┐        ┌──────────────┐        ┌─────────────────────┐
│ 写代码    │  push  │ 测试 → 构建   │  部署   │ nginx (80/443)      │
│ 本地验证  │ ─────→ │ 打镜像/产物   │ ─────→ │  ├─ 静态资源(前端)   │
└──────────┘        └──────────────┘        │  └─ 反代 → Node:3000 │
                                            │      ↓              │
                                            │  PM2 / Docker       │
                                            │      ↓              │
                                            │  MySQL / Redis      │
                                            └─────────────────────┘
```

**要部署的东西**（别只想着"把 Node 跑起来"）：

| 部分 | 说明 |
|------|------|
| Node 服务 | 业务 API（本文重点） |
| 前端静态资源 | `npm run build` 产物，交给 nginx |
| 反向代理 | nginx：静态资源 + API 转发 + HTTPS |
| 中间件 | MySQL / Redis / MQ（容器或独立部署） |
| 进程管理 | PM2 / systemd / Docker（守护与集群） |

## 一、上线前准备

| 项 | 做法 | 为什么 |
|----|------|--------|
| **代码检查** | `npm run lint && npm run test && tsc --noEmit` | 把错误拦在上线前，而不是被用户发现 |
| **依赖锁定** | 用 `npm ci`（严格按 `package-lock.json`） | `npm install` 可能装到不兼容的新版本 |
| **Node 版本固定** | `.nvmrc` + `package.json` 的 `engines` | 避免"本地能跑、线上报错" |
| **环境变量分离** | 代码读 `process.env`，配置不进 Git | 同一份代码跑多环境 |
| **健康检查接口** | 暴露 `GET /health` 返回 `{status:'ok'}` | 供 nginx / K8s / 监控探活 |
| **优雅退出** | 监听 `SIGTERM`，停止接新请求 + 关连接池 | 容器滚动更新时不断正在处理的请求 |

```js
// 健康检查 + 优雅退出（生产必备）
app.get('/health', (ctx) => { ctx.body = { status: 'ok', uptime: process.uptime() } })

process.on('SIGTERM', async () => {
  server.close()          // 停止接收新连接,存量请求继续处理
  await closeDb()         // 关数据库连接池 / Redis
  process.exit(0)
})
```

> 原理详见 [Node.js 入门 · 优雅退出](/service/node/node-core)。

## 二、服务器与环境

**安装 Node**（三种方式，按场景选）：

```bash
# ① nvm(推荐用于单机,能自由切换版本)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20 && nvm use 20

# ② 系统包管理(NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ③ Docker(推荐用于生产,环境完全可控)
# 见下方"容器化部署"
```

**服务器规范**：

| 项 | 建议 |
|----|------|
| **运行用户** | 用专用普通用户（如 `deploy`），**别用 root 跑应用**（被攻破就是整机沦陷） |
| **目录规范** | 应用 `/opt/<app>`、日志 `/var/log/<app>`、数据 `/data/<app>` |
| **时区** | 统一 UTC 存储、展示时再转（容器默认 UTC，注意别混用） |
| **文件权限** | 应用目录属主是运行用户，日志目录可写 |
| **防火墙** | 只开放 80/443，数据库端口**不要暴露公网** |

## 三、进程管理：三种方式

| 方式 | 命令 | 适用 | 特点 |
|------|------|------|------|
| **PM2** | `pm2 start ecosystem.config.js` | 裸机 / 虚拟机 | 守护 + 集群 + 日志开箱即用（[详见](/service/node/pm2)） |
| **systemd** | `systemctl start my-api` | 裸机（不想引入 PM2） | 系统原生、日志走 journald；**不做集群** |
| **Docker** | `docker compose up -d` | 生产推荐 | 环境一致、易回滚；守护交给编排层 |

**systemd 示例**（不引入 PM2 时的最小方案）：

```ini
# /etc/systemd/system/my-api.service
[Unit]
Description=My Node API
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/my-api
Environment=NODE_ENV=production
EnvironmentFile=/opt/my-api/.env
ExecStart=/usr/bin/node /opt/my-api/dist/app.js
Restart=always              # 挂了自动拉起
RestartSec=3
StandardOutput=append:/var/log/my-api/out.log
StandardError=append:/var/log/my-api/err.log

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now my-api
```

## 四、反向代理：nginx

Node 服务**不要直接暴露给公网**，前面挂一层 nginx：

```nginx
server {
    listen 80;
    server_name api.example.com;

    # ① 前端静态资源(构建产物)
    location / {
        root /opt/web/dist;
        try_files $uri $uri/ /index.html;      # SPA 路由回退
        expires 7d;                             # 静态资源缓存(带 hash 的文件可以更久)
    }

    # ② API 反代到 Node
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;              # 让 Node 拿到真实 IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;                               # 长请求(如 LLM 流式)要调大
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

**要点**：

- `X-Real-IP` / `X-Forwarded-For` 必须传——否则 Node 里拿到的是 nginx 的 IP
- **SSE / 流式响应**（如 LLM 接口）要关掉缓冲：`proxy_buffering off;`
- HTTPS 用 certbot 一键签证书：`certbot --nginx -d api.example.com`

## 五、容器化部署（生产推荐）

**Node 的 Dockerfile（多阶段构建）**：

```dockerfile
# ---------- 构建阶段 ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                              # 用 ci 保证和 lock 文件一致
COPY . .
RUN npm run build                       # 编译 TS / 打包前端

# ---------- 运行阶段 ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev                   # 只装生产依赖
COPY --from=builder /app/dist ./dist
USER node                               # 不用 root 运行
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

```bash
# .dockerignore(必加!否则 node_modules/.git 会被打进镜像)
node_modules
.git
dist
*.log
.env
```

**收益**：镜像只含运行必需（多阶段丢弃了构建工具和 devDependencies），体积可从 ~1GB 降到 ~150MB。

```yaml
# docker-compose.yml
services:
  api:
    image: my-registry/my-api:1.2.3          # 用明确版本号,便于回滚
    restart: always
    env_file: .env
    ports: ["3000:3000"]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
  redis:
    image: redis:7-alpine
    restart: always
```

> 容器内**一般不再用 PM2**（`restart: always` 已经负责守护），详见 [PM2 · 什么时候不需要它](/service/node/pm2)。
> Dockerfile / compose 细节见 [Docker 入门](/service/docker)。

### 容器化如何充分利用多核（重点）

Node 单进程只用一个核——这是 V8 的架构事实，**容器化改变不了它**。容器化改变的只是"**谁来把多个核组织起来**"：

| | 裸机 / 虚拟机 | 容器化（Compose / K8s） |
|---|---|---|
| 组织多核的主体 | 进程内：PM2 cluster fork N 个 worker 共享端口 | **编排层：起 N 个容器副本**，前置 LB 分发 |
| 一个实例吃几个核 | N 个 worker 吃 N 个核 | 1 个容器 = 1 个进程 = 1 个核 |
| 扩容动作 | `pm2 scale`（重启 worker） | 改副本数（起新容器，不影响老容器） |
| 能否跨机器 | 不能，只能吃本机核 | **能**——这是容器化相对裸机最大的价值 |
| 崩溃自愈 | PM2 拉起 worker | 编排层重建 Pod / 容器 |
| 无状态要求 | cluster 下必须无状态 | 多副本下必须无状态（更严格） |

> **一句话结论**：容器化下"利用多核"的主力是**多副本（水平扩展）**，不是"容器内多进程"。
> 这不是风格偏好——多副本能跨机器、能独立滚动更新、能被 HPA 自动扩缩；容器内多进程只能吃单机。

**路线 A（主力方案）：多副本 + 负载均衡**

Docker Compose 侧：

```bash
# 起 4 个副本（单机）
docker compose up -d --scale api=4
```

三个必踩的坑：

1. **固定宿主端口不能多副本**。`ports: ["3000:3000"]` 时第二个容器会 bind 失败。生产做法是：业务服务只 `expose`（仅容器网络内可见），前面单独放一个 nginx 容器当 LB，由它独占 `80:80`：

   ```yaml
   services:
     api:
       image: my-registry/my-api:1.2.3
       expose: ["3000"]            # 不映射到宿主机
       environment:
         WEB_CONCURRENCY: "1"       # 单容器单进程，多核靠副本数
     lb:
       image: nginx:alpine
       ports: ["80:80"]             # 只有 LB 对外
       volumes: ["./nginx.conf:/etc/nginx/conf.d/default.conf:ro"]
   ```

   nginx 里 `upstream` 写**服务名**而不是 IP：`proxy_pass http://api:3000;`——Docker 内嵌 DNS 会把服务名解析到全部副本 IP，客户端再自己轮询。

2. **`deploy.replicas` 是 Swarm / 平台语义**。官方文档明确：`deploy.replicas` 只对 swarm 下的服务生效，普通 `docker compose up` 忽略它并使用 `--scale`（Compose 规范里 `deploy` 是一段"给平台看的可选元数据"）。多机集群用 `docker stack deploy`（Swarm）或直接上 K8s。

3. **别写 `container_name`**。容器名必须唯一，写了就多副本起不来。

K8s 侧（生产主流）：

```yaml
# Deployment：副本数交给 HPA，这里写 3 只是兜底下限
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api
          resources:
            requests: { cpu: "500m", memory: "512Mi" }   # requests 必填：HPA 按它的百分比算
            limits:   { cpu: "1000m", memory: "512Mi" }   # 内存 limit 要设，且和 request 对齐
```

```yaml
# HPA：CPU 利用率超 70% 自动加副本
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

**路线 B：容器内 cluster（用 Node 内置模块，不需要 PM2）**

什么时候用：单个服务 CPU 密集、要把一台大机器吃满；或想减少实例数/内存开销。这时用 Node 自带的 `cluster`（PM2 只是它的封装，容器里直接用内置模块更干净）。

**最关键的一条：worker 数必须显式指定，绝不能用 `os.cpus().length`。**

```js
// cluster.js
const cluster = require('node:cluster')
const os = require('node:os')

// 优先级：环境变量 > availableParallelism > 1
const WORKERS = Number(process.env.WEB_CONCURRENCY) || os.availableParallelism?.() || 1

if (cluster.isPrimary) {
  for (let i = 0; i < WORKERS; i++) cluster.fork()

  cluster.on('exit', (worker, code, signal) => {
    console.error(`worker ${worker.process.pid} 退出(${signal || code})，重新拉起`)
    cluster.fork()
  })

  // 容器 stop 时 SIGTERM 只发给 PID 1（primary），worker 收不到 → 必须转发
  process.on('SIGTERM', () => {
    for (const id of Object.keys(cluster.workers)) cluster.workers[id].process.kill('SIGTERM')
    setTimeout(() => process.exit(0), 10000)
  })
} else {
  require('./app').listen(3000)
}
```

容器内 cluster 的坑（每一条都踩过血）：

| 坑 | 现象 | 正确做法 |
|---|---|---|
| 用 `os.cpus().length` 算 worker 数 | 容器只给 2 核却起 64 个 worker → 内存爆 / 上下文切换抖动，吞吐反而下降 | 用 `os.availableParallelism()`（Node ≥ 18.14 / 19.4），生产再叠一层 `WEB_CONCURRENCY` 显式指定 |
| `availableParallelism()` 的版本坑 | Node 22.12~22.16、24.0~24.1（内含 libuv 1.49.1 / 1.50）在 **cgroup v2 + 未设 CPU requests** 时恒返回 1，白白只用一个核；libuv 1.51.0（Node 22.17+ / 24.2+）才对齐 Rust 的算法 | 不赌运行时版本：显式给 `WEB_CONCURRENCY`；同时给 Pod 设 `requests.cpu` |
| `CMD ["npm", "start"]` | npm 不转发 SIGTERM，容器 stop 时正在处理的请求被砍（exit 137） | `CMD ["node", "dist/app.js"]`，或用 tini 当 PID 1 |
| primary 不转发 SIGTERM | 容器停时 worker 收不到信号，10s 宽限期后被 SIGKILL | primary 捕获后转发给所有 worker（见上） |
| 每个 worker 是独立进程、独立堆 | N 个 worker 各自占一份 old-space → 容器内存超限 OOMKilled | 内存 limit ÷ N 作为 `--max-old-space-size` |
| worker 之间内存不共享 | session 掉登录、缓存不一致 | session / 缓存外置 Redis（cluster 和多副本同理） |
| 一次 crash 引发无限 fork 循环 | 端口没释放就 fork，worker 起不来又重启，打满 CPU | 统计重启次数，超阈值停止 respawn 并告警 |

**第三条路：`worker_threads` —— 解决"单个请求里的重计算"，不是"服务并发"**

`cluster` 横向分请求，`worker_threads` 纵向拆单个任务（图像处理、加密、大 JSON 解析）。两者常一起用：cluster 分发流量，重的活再丢给 worker 线程池。线程数也用 `os.availableParallelism()` 决定。

**CPU limit 与 throttle：Node 特有的坑**

- K8s 的 CPU limit 靠 cgroup **CFS quota** 强制：每 100ms 一个周期，只给 `limit 核 × 100ms` 的 CPU 时间；用超了整个容器被**冻结**到下个周期（不是"稍微变慢"，是直接挂起）。
- Node 进程不只有 JS 主线程：libuv 线程池（默认 4 个，`UV_THREADPOOL_SIZE`）跑 crypto / zlib / 文件 IO，V8 还有并发 GC 和 JIT 线程。这些会**瞬时**用掉额外核。
- 典型症状：**平均 CPU 使用率只有 60%，P99 延迟却飙到几百毫秒**——因为某些周期内配额被用光，进程被冻结。
- 对策：① 延迟敏感的 Node 服务，`limits.cpu` 要比 `requests.cpu` 高一截，别贴着设；② 或者只设 requests 不设 CPU limit（AWS EKS 最佳实践同样建议 Node 服务不设 CPU limit），把弹性交给 HPA；③ 内存 limit 必须设、且和 request 对齐——内存是**不可压缩**资源，超了直接 OOMKill，不像 CPU 还能限流。
- 监控指标：看 `container_cpu_cfs_throttled_periods_total / container_cpu_cfs_periods_total`，throttle 比例超过 5% 就该调 limit 了。

**选型速查**

| 场景 | 选谁 |
|---|---|
| IO 密集 API，流量会涨 | **多副本 + 负载均衡**（Node 主力方案） |
| 单服务 CPU 密集，要吃满一台大机器 | 容器内 `cluster`（或 PM2 cluster）+ 显式 `WEB_CONCURRENCY` |
| 单个请求里有重计算 | `worker_threads` 丢出去算 |
| 要 sticky session / 长连接 | 别用 cluster（连接会绑死在某个 worker），用多副本 + 网关层做路由 |

> **和 Java 对照**：Java 容器里一个 JVM 就是多线程（Tomcat 线程池），天然就能吃满多核，所以 Java 更适合"少副本 + 大容器"；Node 单线程一核，天然适合"多副本 + 小容器"。这不只是风格差异，直接决定了扩容成本模型——详见 [Node.js vs Java 后端选型](/service/node/node-vs-java)。

## 六、配置与密钥

| 配置类型 | 放哪 | 注意 |
|---------|------|------|
| 非敏感配置（端口、日志级别） | 环境变量 / `.env` | `.env` 加进 `.gitignore` |
| 敏感配置（DB 密码、JWT Secret、API Key） | 密钥管理服务（Vault / KMS）/ CI 的 Secret | **绝不进 Git、不进镜像** |
| 多环境差异 | `NODE_ENV` + 配置层（如 `config/prod.js`） | 代码里不写 `if (env === 'prod')` 散落各处 |

```js
// 启动时校验必需的环境变量,缺了直接退出(fail-fast,比运行时才发现好)
const REQUIRED = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']
const missing = REQUIRED.filter(k => !process.env[k])
if (missing.length) {
  console.error('缺少环境变量:', missing.join(', '))
  process.exit(1)
}
```

## 七、日志

| 原则 | 做法 |
|------|------|
| **结构化** | 输出 JSON（`{level, time, msg, traceId}`），便于检索 |
| **输出到 stdout** | 容器规范：日志交给 Docker/K8s 收集，而不是自己写文件 |
| **分级** | debug / info / warn / error，生产默认 info |
| **切割** | 裸机用 `pm2-logrotate` 或 logrotate，别让日志写满磁盘 |
| **脱敏** | **不记密码、token、身份证、手机号**（脱敏后再打） |
| **链路追踪** | 每个请求带 `traceId`，跨服务串起来（排查慢请求的关键） |

```js
// 用 pino 输出结构化日志(生产比 console 强太多)
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })
logger.info({ traceId, userId, path: ctx.path, ms: 42 }, 'request done')
```

## 八、监控与告警

**监控三层**：

| 层 | 指标 | 工具 |
|----|------|------|
| **进程** | CPU、内存、重启次数 | PM2 monit / `docker stats` |
| **应用** | QPS、P95/P99 耗时、错误率、事件循环延迟 | Prometheus + Grafana（`prom-client`） |
| **依赖** | DB 连接数、Redis 命中率、外部 API 耗时 | 各自的 exporter |

**告警要"及时且不打扰"**：

- **分级**：P0（服务不可用）打电话；P1（错误率飙升）企业微信；P2（磁盘 80%）邮件
- **基线对比**：按"同比昨天 / 上周"告警，而不是拍一个固定阈值
- **要有处置动作**：每条告警都写清"谁看、看什么、怎么办"

## 九、CI/CD 自动化

```mermaid
flowchart LR
    A[push / merge] --> B[安装依赖]
    B --> C[lint + 测试]
    C --> D[构建产物]
    D --> E[打镜像 + 推仓库]
    E --> F[部署到服务器]
    F --> G[健康检查]
    G -->|失败| H[自动回滚]
    G -->|成功| I[通知]
```

**关键实践**：

- 镜像 tag 用 **git commit sha 或版本号**（别用 `latest`，否则回滚时找不到旧版本）
- 部署后必须**自动验证**（调 `/health` + 关键接口冒烟），失败自动回滚
- 数据库变更（migration）要**向后兼容**（先加字段、再改代码、最后删旧字段），否则无法回滚

> 流水线细节见 [CI/CD](/engineering/cicd)。

## 十、上线检查清单与回滚

**上线前 checklist**：

- [ ] lint / 测试 / 类型检查全绿
- [ ] 环境变量已配置（尤其新增的）
- [ ] 数据库 migration 已执行且向后兼容
- [ ] 健康检查接口可用
- [ ] 日志级别、脱敏确认
- [ ] 关键接口冒烟通过
- [ ] **回滚方案就绪**（上一个可用版本的 tag 已知）

**回滚**（越简单越好）：

```bash
# Docker:改回上一个 tag 重启
docker compose up -d --no-deps api    # 配合 image: my-api:1.2.2

# PM2:切回上一个版本目录再 reload
ln -sfn /opt/my-api/releases/1.2.2 /opt/my-api/current && pm2 reload my-api
```

> 回滚的前提是**部署过程可重复、版本可追溯**——所以镜像 tag、配置文件都要版本化。

## 常见坑

| 坑 | 现象 | 解决 |
|----|------|------|
| `NODE_ENV` 没设 | 依赖库（Express/React 等）走开发分支，**性能差几倍** | 生产必须 `NODE_ENV=production` |
| 只监听 `localhost` | 容器外访问不到 | `app.listen(3000, '0.0.0.0')` |
| 内存超限被杀 | 容器 OOMKilled | 设 `--max-old-space-size`，容器内存限制留余量 |
| 时区错乱 | 日志 / 业务时间差 8 小时 | 容器设 `TZ=Asia/Shanghai`，或统一 UTC |
| 静态资源没缓存 | 每次刷新都重新下载 | 文件名带 hash + `expires` 长缓存，HTML 不缓存 |
| 依赖没锁版本 | 重新构建就报错 | `npm ci` + 提交 `package-lock.json` |
| 忘了优雅退出 | 滚动更新时用户请求 502 | 监听 SIGTERM（见第一章） |
| 数据库端口暴露公网 | 被扫库 / 勒索 | 防火墙只开 80/443，DB 走内网 |

## 相关

- [PM2 进程管理](/service/node/pm2) - 进程守护与 cluster 模式
- [Docker 入门](/service/docker) - Dockerfile / compose / 数据持久化
- [Node.js 入门](/service/node/node-core) - 事件循环、优雅退出、内存管理
- [CI/CD](/engineering/cicd) - 自动化流水线
- [Java 服务部署最佳实践](/service/java/java-deployment) - 对照另一套技术栈的部署方式
- [Node 服务端知识地图](/service/node/) - 全部篇目导航与三阶段学习路径

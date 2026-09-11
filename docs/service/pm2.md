# PM2 进程管理

> **定位**：Node 服务上线的"进程管家"，解决三件事——**进程守护**（挂了自动拉起）、**多核利用**（cluster 模式）、**日志与监控**。裸机 / 虚拟机部署 Node 服务时的标准配置。

## 为什么需要 PM2

直接用 `node app.js` 起服务有三个致命问题：

| 问题 | 后果 |
|------|------|
| 进程崩了没人管 | 服务永久挂掉，直到人工发现 |
| 只用一个 CPU 核 | 8 核机器只发挥 1/8 的性能 |
| 日志直接打屏 | 断开终端就丢，没有切割、无法追溯 |

PM2 把这些一次性解决：**守护 + 集群 + 日志 + 监控 + 开机自启 + 零停机重载**。

> 和别的方案对比：
> - `nohup node app.js &` —— 只能"不随终端退出"，进程崩了照样死
> - `systemd` —— 能做守护和开机自启，但不做集群、日志管理弱
> - **PM2** —— Node 生态最省事的方案，一条命令搞定守护 + 集群

## 安装与基本命令

```bash
npm install -g pm2

pm2 start app.js --name my-api      # 启动并命名
pm2 list                            # 列表(状态 / CPU / 内存 / 重启次数)
pm2 logs my-api                     # 实时日志
pm2 logs my-api --lines 100         # 最近 100 行
pm2 restart my-api                  # 重启
pm2 reload my-api                   # 零停机重载(cluster 模式下才有意义)
pm2 stop my-api                     # 停止
pm2 delete my-api                   # 从列表移除
pm2 monit                           # 实时监控面板(CPU/内存/日志)
pm2 describe my-api                 # 查看详情
```

**`restart` vs `reload`**（面试常问）：

| | `restart` | `reload` |
|---|---|---|
| 行为 | 杀掉所有进程再重新拉起 | **逐个**重启，始终有进程在服务 |
| 服务中断 | 有几秒不可用 | **零停机** |
| 适用 | 单进程模式 | cluster 模式（`-i` 启动的） |

## ecosystem.config.js（生产用配置文件）

命令行参数多了不好维护，生产环境统一用配置文件：

```js
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-api',
    script: './src/app.js',
    instances: 'max',             // 按 CPU 核数起满(cluster 模式)
    exec_mode: 'cluster',         // 多进程共享端口
    watch: false,                 // 生产必须关闭(改文件自动重启只用于开发)
    max_memory_restart: '500M',   // 超 500M 自动重启,防内存泄漏拖垮机器
    env: { NODE_ENV: 'development', PORT: 3000 },
    env_production: { NODE_ENV: 'production', PORT: 3000 },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,             // cluster 模式下合并多进程日志
  }],
}
```

```bash
pm2 start ecosystem.config.js --env production
```

## cluster 模式：榨干多核

Node 单进程只能用一个 CPU 核。cluster 模式让 PM2 起多个进程、**共享同一个端口**（底层就是 Node 的 `cluster` 模块）：

```
                  ┌─ worker 1 ─┐
请求 → 端口 3000 ──┼─ worker 2 ─┼→ PM2 主进程分发(round-robin)
                  └─ worker 3 ─┘
```

```bash
pm2 start app.js -i max     # 按 CPU 核数起满
pm2 start app.js -i 4       # 起 4 个
pm2 scale my-api 8          # 在线扩容到 8 个
```

**关键副作用**：cluster 模式下各进程**内存不共享**，所以——

| 不能做的事 | 正确做法 |
|-----------|---------|
| 用进程内变量做计数器 / 缓存 | 用 Redis |
| 用内存存 session | session 外置到 Redis（否则请求被分发到别的进程会"掉登录"） |
| 内存里存定时任务状态 | 用分布式锁，避免每个进程都跑一遍 |

## 日志管理

```bash
pm2 logs                      # 查看所有日志
pm2 flush                     # 清空日志
pm2 install pm2-logrotate     # 日志切割插件(生产必装!)
```

> 不装 `pm2-logrotate`，日志会无限增长直到把磁盘写满。安装后可按大小 / 时间自动切割：

```bash
pm2 set pm2-logrotate:max_size 100M    # 单文件最大 100M
pm2 set pm2-logrotate:retain 30        # 保留 30 份
pm2 set pm2-logrotate:compress true    # 压缩旧日志
```

## 开机自启

```bash
pm2 start ecosystem.config.js --env production
pm2 save              # ① 保存当前进程列表(重启后按这份列表恢复)
pm2 startup           # ② 生成开机自启脚本(按提示执行它输出的命令)
```

> **顺序别搞反**：先 `start` → 再 `save` → 最后 `startup`。否则重启后进程列表是空的。

## 环境变量

```bash
pm2 start ecosystem.config.js --env production   # 使用 env_production
pm2 restart my-api --update-env                  # 改了环境变量后重启生效
```

> PM2 的 `env` 只适合放**非敏感**配置。密钥、数据库密码用系统环境变量或密钥管理服务，**别写进 ecosystem 文件提交到 Git**。

## PM2 的局限：什么时候不需要它

| 场景 | 建议 |
|------|------|
| 单机 / 虚拟机部署 Node 服务 | ✅ PM2 是最省事的选择 |
| 已经用 Docker / K8s | ⚠️ **容器内通常不需要 PM2**——编排层（K8s 的 replicas、Docker 的 restart policy）已负责守护和扩容，容器内再加 PM2 会多一层，健康检查和日志也会打架 |
| 需要灰度 / 滚动发布 | 用 K8s Deployment 更合适 |

> 一句话：**PM2 是"裸机 / 虚拟机部署 Node 服务"的最优解；上了容器编排就交给编排层**。如果容器内一定要用，建议 `instances: 1`（只保留守护和日志能力，不做集群）。

## 常见问题

| 问题 | 原因 / 解决 |
|------|------------|
| 重启次数一直涨 | 应用启动就崩（看 `pm2 logs`）；或内存超 `max_memory_restart` 被重启 |
| cluster 下登录状态丢失 | session 存在进程内存里 → 外置到 Redis |
| 日志把磁盘写满 | 装 `pm2-logrotate` |
| 改了代码没生效 | 生产 `watch: false`，要手动 `pm2 reload` |
| 端口被占用 | 旧的 node 进程没退：`lsof -i:3000` 查出来 kill 掉 |
| `pm2 startup` 后重启没恢复 | 忘了 `pm2 save` |

## 相关

- [Node.js 服务部署最佳实践](/service/node-deployment) - 完整的上线流程
- [Node.js 入门](/service/node-core) - cluster 模块、进程与线程原理
- [Docker 入门](/service/docker) - 容器化部署
- [Linux 常用命令](/service/linux-basics) - 服务器上排查问题的基础

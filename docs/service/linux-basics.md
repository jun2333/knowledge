# Linux 常用命令

> **优先级：P2（日常必备）** — 不直接考，但部署、排查、面试聊项目都会用到。你日常用 Mac（类 Unix），大部分命令通用，本文只补后端高频场景。

## 文件与目录

```bash
ls -la          # 列表（含隐藏文件、详情）
cd /var/log     # 切换目录
pwd             # 当前路径
mkdir -p a/b/c  # 递归创建
cp -r src dst   # 递归复制
mv a b          # 移动/重命名
rm -rf dir      # 删除（慎用！）
find . -name "*.log"          # 按名查找
grep -r "ERROR" /app/logs/    # 递归搜内容
```

## 查看文件（后端高频）

```bash
tail -f app.log          # 实时跟踪日志（排障首选）
tail -100 app.log        # 看最后 100 行
head -20 app.log         # 看开头
less app.log             # 分页浏览（q 退出，/ 搜索）
cat app.log              # 全量输出（小文件）
grep "Exception" app.log | tail -50   # 过滤最近异常
```

## 进程与系统状态

```bash
ps -ef | grep java       # 找 Java 进程（拿 PID）
top                      # 实时看 CPU/内存（按 P 按 CPU 排序，按 M 按内存）
free -h                  # 内存概览
df -h                    # 磁盘空间
uptime                   # 负载（1/5/15 分钟）

# 杀进程（慎用，先确认）
kill <pid>               # 优雅终止
kill -9 <pid>            # 强制终止（最后手段）

# 端口排查（部署必用）
lsof -i :8080            # 谁占了 8080 端口
netstat -tlnp            # 监听端口列表
```

## 日志筛选组合拳（排障标准姿势）

```bash
# 按时间 + 关键字筛日志
grep "2026-08-13 10:" app.log | grep -i "error"

# 统计错误出现次数
grep -c "ERROR" app.log

# 看日志中出现次数最多的 IP
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10
```

## 压缩与传输

```bash
tar -czf app.tar.gz ./app       # 打包压缩
tar -xzf app.tar.gz             # 解压
zip -r app.zip ./app            # zip 打包
scp app.jar user@host:/opt/app  # 上传文件到服务器
rsync -av ./dist user@host:/opt/web  # 增量同步（部署常用）
```

## 权限（部署踩坑重灾区）

```bash
chmod +x start.sh       # 加执行权限
chmod 755 file          # rwxr-xr-x
chown -R app:app /opt/app  # 改属主（启动失败先查这个）
```

**常见报错**：`Permission denied` → 检查文件属主/权限，不要无脑 `chmod 777`（安全）。

## 后台运行（部署关键）

```bash
# 1. nohup + &：关终端进程不退出
nohup java -jar app.jar > app.log 2>&1 &

# 2. 说明
#    nohup: 忽略挂断信号
#    > app.log: 输出重定向到日志
#    2>&1: 错误输出也进同一个日志
#    &: 后台运行

# 3. systemd 管理（生产标准做法，简单版）
systemctl start myapp
systemctl status myapp      # 看状态和最近日志
systemctl restart myapp
```

**面试常问**：nohup 和 & 什么区别？——`&` 只是放后台（关终端可能被杀）；`nohup` 让进程忽略挂断信号，两者配合才能在关终端后继续跑。

## 排查网络

```bash
ping host              # 通不通
telnet host 3306       # 端口通不通（老工具）
nc -vz host 3306       # 端口探测
curl -v http://localhost:8080/api   # 看请求响应详情（排接口问题神器）
```

## 面试题速查

| 问题 | 答案 |
|------|------|
| 怎么看实时日志 | `tail -f` |
| 怎么找 Java 进程 | `ps -ef \| grep java` |
| 谁占用了端口 | `lsof -i :8080` |
| 后台跑一个 jar | `nohup java -jar app.jar > log 2>&1 &` |
| 看内存/磁盘 | `free -h` / `df -h` |
| 筛选日志错误 | `grep -i error app.log` |
| 上传文件到服务器 | `scp` 或 `rsync` |

## 延伸阅读

- [线上问题排查](/service/troubleshooting) - jps/jstack/jmap 等 Java 专用工具
- [Docker 入门](/service/docker) - 容器化部署（服务器上跑项目的新姿势）
- [Spring Cloud 微服务](/service/spring-cloud) - 多服务部署场景

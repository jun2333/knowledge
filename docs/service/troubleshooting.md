# 线上问题排查

> **优先级：P1（面试加分 + 实战必备）** — 面试聊项目时，"线上 OOM 你怎么排查"是区分中级和高级的经典题。本文给一套可操作的排查流程。

::: tip 背景
JS 侧排查线上问题靠 devtools + pm2 logs；Java 侧靠 JDK 自带工具链（jps/jstack/jmap/jstat）+ 日志。套路是固定的：先看现象 → 定位进程 → 抓现场 → 分析根因。
:::

## 排查工具链

| 命令 | 作用 | 常用场景 |
|------|------|---------|
| `jps` | 列出 Java 进程 | 找到目标进程 PID（或 `ps -ef \| grep java`） |
| `jstack <pid>` | 线程栈快照 | 死锁、线程卡死、CPU 飙高时看线程在干嘛 |
| `jmap -heap <pid>` | 堆内存概况 | 内存占用异常时看堆配置和用量 |
| `jmap -dump:format=b,file=heap.hprof <pid>` | 堆快照 dump | OOM 时抓现场，用 MAT 分析 |
| `jstat -gc <pid> 1000` | GC 统计（每秒） | 看 GC 频率/耗时，判断是否频繁 Full GC |
| `jcmd` | 综合诊断命令 | JDK 8+ 替代部分 jmap 功能 |

```
# 常用组合
jps -l                       # 找进程
jstack 12345 > thread.txt    # 抓线程栈
jmap -dump:format=b,file=heap.hprof 12345   # 抓堆快照
```

## 场景一：OOM（内存溢出）排查（必考）

**现象**：日志出现 `OutOfMemoryError: Java heap space`，或服务重启。

**排查流程**：

```
1. 确认堆内存参数：jmap -heap <pid> 看 -Xmx 配置是否合理
2. 抓堆快照：OOM 前 dump（生产配置 -XX:+HeapDumpOnOutOfMemoryError 自动抓）
3. 用 MAT / JProfiler 分析 hprof 文件：
   - 看 Dominator Tree（支配树）：哪个对象占内存最多
   - 看 GC Roots 引用链：谁还持有这些对象（常见：缓存 Map 无限增长、ThreadLocal 没 remove）
4. 定位代码：集合类静态变量、连接未关闭、大对象
```

**三类典型 OOM**：

| 类型 | 常见原因 | 排查方向 |
|------|---------|---------|
| Heap space | 对象堆积（缓存不淘汰、list 无限 add） | MAT 看大对象 |
| Metaspace | 动态生成类太多（CGLIB/反射） | 检查代理生成量 |
| Direct buffer memory | NIO 堆外内存泄漏 | 检查 ByteBuffer 释放 |

## 场景二：CPU 飙高（必考）

```
1. top 找 CPU 高的进程 PID
2. top -Hp <pid> 找 CPU 高的线程 TID
3. printf '%x' <TID> 转 16 进制
4. jstack <pid> | grep -A 20 <16进制TID>   # 看该线程在干嘛
```

**常见根因**：
- 死循环 / while(true) 无 sleep
- 频繁 Full GC（内存不足，GC 线程吃 CPU）→ 配合 jstat 确认
- 正则回溯、大循环内做重计算
- 线程池配置过大，疯狂创建线程

**答题模板**：top 找 PID → top -Hp 找 TID → 转 16 进制 → jstack 定位代码行。这条链路是面试加分细节。

## 场景三：接口变慢 / 卡死

```
1. 先看是不是 DB 慢：慢查询日志 + explain（见 MySQL 篇）
2. 看是不是锁等待：jstack 找 BLOCKED 状态的线程，看等哪把锁
3. 看是不是连接池耗尽：druid/连接池监控，活跃连接满
4. 看是不是 GC 停顿：jstat -gc 观察 Full GC 频率
5. 看外部调用超时：Feign/HTTP 调用无超时时间 → 线程挂满
```

**线程状态速记**：`RUNNABLE`（跑/等待 IO）、`BLOCKED`（等锁）、`WAITING`/`TIMED_WAITING`（等条件）、`DEAD`。

## 场景四：死锁排查

```
jstack <pid> | grep -A 20 "Found one Java-level deadlock"
```

jstack 直接会输出死锁检测结果：哪些线程互相持锁等待。解决：统一加锁顺序、避免嵌套锁。

## 日志与监控（常规手段）

| 手段 | 用途 |
|------|------|
| 应用日志（Logback） | ERROR/WARN 分级，关键业务打日志 |
| **链路 ID（traceId）** | 请求入口生成，贯穿日志（MDC），排查跨服务问题 |
| 指标监控（Prometheus + Grafana） | CPU/内存/QPS/GC 曲线，报警 |
| 告警 | 错误率/延迟/QPS 异常触发（钉钉/邮件） |

**面试题：线上出问题怎么定位？**——分层：先监控看现象（哪个服务/接口异常）→ 看日志（traceId 串链路）→ 根据异常类型走对应工具（OOM→jmap，CPU→jstack）。

## 面试题速查

| 问题 | 一句话答案 |
|------|-----------|
| OOM 怎么排查 | HeapDumpOnOutOfMemoryError + MAT 分析大对象与引用链 |
| CPU 高怎么排查 | top → top -Hp → TID 转 16 进制 → jstack 定位代码 |
| jstack 能查什么 | 线程状态、死锁、卡在哪 |
| 接口变慢先查什么 | 慢 SQL → 锁等待 → 连接池 → GC → 外部调用超时 |
| 怎么定位死锁 | jstack 自带死锁检测输出 |
| 生产怎么防 OOM | 参数合理 + 缓存有界 + 连接释放 + 压测验证 |

## 延伸阅读

- [JVM 入门](/service/java-jvm) - OOM 的内存分区背景
- [MySQL 进阶](/service/mysql-advanced) - 慢 SQL 排查
- [Spring Cloud 微服务](/service/spring-cloud) - 链路追踪 traceId

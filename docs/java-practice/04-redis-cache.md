# 阶段 4：Redis 缓存实战

> **目标**：理解缓存在项目里怎么落地——缓存哪些数据、怎么读写、缓存挂了会怎样。
>
> **前置**：阶段 1-3 完成。Redis 容器已启动（`docker ps` 能看到 `redis`）。

## 一、验收标准（做完自检）

- [ ] 能说出 mall 里缓存了什么数据（admin 用户信息），为什么缓存它
- [ ] 能在 Redis 里看到 mall 的缓存 key，理解 key 的命名规律
- [ ] 能解释 `RedisCacheAspect` 的作用（缓存异常不拖垮主流程）
- [ ] 完成动手任务 3（删缓存 key，观察 DB 回源）

## 二、缓存了什么、为什么

打开 `UmsAdminServiceImpl`（登录逻辑里），登录后用户信息会缓存在 Redis，**目的是：之后每次请求校验 token 时不用反复查数据库**（数据库是瓶颈，Redis 是内存）。

缓存读写都封装在 `mall-common/.../service/RedisService.java`（对 Jedis 的薄封装）：

```java
// 缓存的 key 规律
private String getCacheKey(String username) {
    return "ums:admin:" + username;
}
// 缓存 admin，带过期时间
redisService.set(key, admin, REDIS_EXPIRE);
// 读缓存（优先缓存，没有再查库）
UmsAdmin admin = (UmsAdmin) redisService.get(key);
if (admin != null) return admin;
return getAdminByUsername(username);  // 回源 DB
```

## 三、操作步骤

### Step 1：看 Redis 里到底有什么

1. 先在 Swagger 调一次 `POST /admin/login`（确保缓存被写入）
2. 打开终端连 Redis：
   ```bash
   docker exec -it redis redis-cli
   ```
3. 查看所有 key：
   ```
   keys *
   ```
   能看到类似 `ums:admin:admin` 的 key
4. 看 key 的值和过期时间：
   ```
   type ums:admin:admin      # hash
   hgetall ums:admin:admin   # 所有字段
   ttl ums:admin:admin       # 剩余过期秒数
   ```

> 这是**第一次直观看到"缓存"长什么样**。想想：这个 key 存的就是数据库里 `ums_admin` 表的一行，只是放进了内存。

### Step 2：理解"先查缓存，再查库"的流程

打开 `UmsAdminServiceImpl.getAdminByUsername()`（或缓存实现 `UmsAdminCacheServiceImpl`），看完整逻辑：

```
1. 拼 key = "ums:admin:" + username
2. redisService.get(key)
3. 缓存有 → 直接返回（不碰数据库）
4. 缓存没有 → 查 MySQL（回源）→ 写回缓存（带过期时间）
```

**给 Redis 客户端验证**：调登录后，在 MySQL 里改 admin 密码，再调登录接口——观察返回的还是旧数据（因为走的是缓存）。这就是缓存和 DB 的**一致性问题**。

### Step 3：理解缓存异常降级（RedisCacheAspect）

打开 `mall-security/.../aspect/RedisCacheAspect.java`：

```java
@Around("cacheAspect()")
public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
    // ... 执行方法（比如 getAdmin 查缓存）
    // catch 住异常：
    //   方法上有 @CacheException 注解 → 异常继续抛（缓存必选场景）
    //   否则 → 吞掉异常，降级为查库
}
```

**意义**：Redis 挂了不能让业务也挂。缓存只是加速，DB 才是真相。面试题"缓存挂了怎么办"的答案就在这个类里。

## 四、动手任务

1. 清空 Redis：`docker exec -it redis redis-cli flushall`，再调一次登录接口，观察它重新查库并写缓存
2. 在 `UmsAdminServiceImpl` 的缓存读代码处打断点，看"缓存命中 vs 未命中"走的两个分支
3. **缓存穿透实验**：调一个**不存在的用户名**登录（如 `admin12345`），观察它每次都查库（缓存里没有，就每次都穿透到 DB）——想想怎么防（答案：缓存空值 / 布隆过滤器，见延伸阅读）

## 五、常见问题

**Q：Redis 的 key 为什么要 `ums:admin:` 前缀？**
A：多业务/多模块共用 Redis 时用前缀隔离，避免 key 冲突。这也是规范。

**Q：`keys *` 在生产环境能用吗？**
A：不能，会阻塞。生产用 `scan`。这里学习无妨。

**Q：缓存和数据库不一致怎么办？**
A：mall 的做法是**设置过期时间**（过期自然淘汰）+ 更新时主动删 key。极端一致性要求再考虑其他方案（见延伸阅读）。

## 六、关联理论

- [Redis 入门](/service/redis-intro) — Redis 数据类型、过期策略
- [分布式基础](/service/distributed-basics) — 缓存一致性、缓存穿透/击穿/雪崩

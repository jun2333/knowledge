---
title: RESTful API 设计
date: 2026-07-30
---

# RESTful API 设计

RESTful 是一种 API 设计风格，核心思想是**用 HTTP 方法表达对资源的操作**，让接口直观、可预测、易理解。

## 核心原则

| 原则 | 说明 |
|------|------|
| **资源导向** | URL 代表资源（名词），不是动作（动词） |
| **HTTP 方法** | GET/POST/PUT/DELETE 表达操作类型 |
| **无状态** | 每个请求包含所有必要信息，服务端不保存会话。客户端每次请求都要带上身份凭证（如 Token），服务端不记住"这个连接是谁"。好处是任意服务器都能处理任意请求，方便水平扩展 |
| **统一接口** | 相同操作使用相同的方式 |
| **分层系统** | 客户端不知道请求最终由哪台服务器处理 |

## URL 设计规范

### 用名词，不用动词

```
# 好的设计
GET    /api/users          # 获取用户列表
GET    /api/users/1        # 获取 ID 为 1 的用户
POST   /api/users          # 创建用户
PUT    /api/users/1        # 更新用户
DELETE /api/users/1        # 删除用户

# 不好的设计
GET    /api/getUsers
POST   /api/createUser
POST   /api/deleteUser/1
```

### 资源嵌套表达关系

嵌套层级不要超过 2 层，超过会导致 URL 过长、难以维护。

```
✅ 1 层嵌套（推荐）
GET /api/users/1/posts          # 用户 1 的所有文章
GET /api/posts/5/comments       # 文章 5 的所有评论

✅ 2 层嵌套（可以接受）
GET /api/users/1/posts/5        # 用户 1 的第 5 篇文章

❌ 3 层及以上（不推荐）
GET /api/users/1/posts/5/comments/3/replies  # 太深了，难以理解和维护

💡 替代方案：超过 2 层时，把资源提到顶层，用查询参数关联
GET /api/comments?post_id=5&user_id=1
GET /api/replies/3?comment_id=xxx
```

### 复数形式

统一使用复数名词：`/users`、`/posts`、`/comments`，保持一致性。

## HTTP 方法详解

| 方法 | 语义 | 是否安全 | 是否幂等 | 示例 |
|------|------|----------|----------|------|
| **GET** | 获取资源 | 是 | 是 | 获取用户列表 |
| **POST** | 创建资源 | 否 | 否 | 创建新用户 |
| **PUT** | 全量更新 | 否 | 是 | 替换用户全部信息 |
| **PATCH** | 部分更新 | 否 | 否 | 只修改用户邮箱 |
| **DELETE** | 删除资源 | 否 | 是 | 删除用户 |

**幂等**：多次执行结果相同。PUT 和 DELETE 是幂等的（删除一个不存在的资源，结果一样），POST 不是（每次调用都创建新资源）。

## HTTP 状态码

不要全部返回 200，合理使用状态码让客户端能程序化处理响应。

### 成功类

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| **200** | OK | GET/PUT/PATCH 成功 |
| **201** | Created | POST 创建资源成功 |
| **204** | No Content | DELETE 成功，无返回体 |

### 客户端错误类

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| **400** | Bad Request | 请求参数有误 |
| **401** | Unauthorized | 未登录/Token 无效 |
| **403** | Forbidden | 已登录但无权限 |
| **404** | Not Found | 资源不存在 |
| **409** | Conflict | 资源冲突（如用户名已存在） |
| **422** | Unprocessable Entity | 参数校验失败 |
| **429** | Too Many Requests | 请求频率超限 |

### 服务端错误类

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| **500** | Internal Server Error | 服务端未知错误 |
| **502** | Bad Gateway | 上游服务不可用 |
| **503** | Service Unavailable | 服务暂时不可用（维护/过载） |

## 统一响应格式

```javascript
// 成功响应
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "username": "alice"
  }
}

// 列表响应（带分页）
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      { "id": 1, "username": "alice" },
      { "id": 2, "username": "bob" }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}

// 错误响应
{
  "code": 40001,
  "message": "用户名已存在",
  "errors": [
    { "field": "username", "message": "该用户名已被注册" }
  ]
}
```

## 分页

```
GET /api/users?page=1&pageSize=20
GET /api/users?cursor=abc123&limit=20    # 游标分页（适合大数据量）
```

**偏移分页 vs 游标分页：**

| 方式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 偏移分页（offset） | 可跳页 | 数据量大时慢 | 后台管理列表 |
| 游标分页（cursor） | 性能稳定 | 不能跳页 | 信息流、聊天记录 |

## 过滤、排序、搜索

```
# 过滤
GET /api/users?role=admin&status=active

# 排序
GET /api/users?sort=created_at&order=desc

# 搜索
GET /api/users?q=alice

# 字段选择（减少响应体积）
GET /api/users?fields=id,username,email
```

## 版本管理

API 会演进，需要版本管理避免破坏已有客户端。

```
# URL 路径版本（最常见）
GET /api/v1/users
GET /api/v2/users

# 请求头版本
GET /api/users
Header: API-Version: 2

# 查询参数版本
GET /api/users?version=2
```

**建议：** 小团队用 URL 路径版本，直观简单。

## 错误处理最佳实践

```javascript
// Koa 示例：统一错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    const status = err.status || 500
    ctx.status = status
    ctx.body = {
      code: status * 100 + (err.code || 0),
      message: err.message || 'Internal Server Error',
      errors: err.errors || [],
    }

    // 生产环境不暴露堆栈
    if (status === 500 && process.env.NODE_ENV === 'production') {
      ctx.body.message = 'Internal Server Error'
    }

    // 记录日志
    console.error(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url}`, err)
  }
})

// 业务中抛出错误
router.get('/users/:id', async (ctx) => {
  const user = await findUser(ctx.params.id)
  if (!user) {
    const err = new Error('用户不存在')
    err.status = 404
    throw err
  }
  ctx.body = user
})
```

## 安全相关

```javascript
// 1. CORS 跨域
const cors = require('@koa/cors')
app.use(cors({
  origin: 'https://your-frontend.com',
  credentials: true,
}))

// 2. 请求频率限制
const rateLimit = require('koa-ratelimit')
app.use(rateLimit({
  duration: 60 * 1000,   // 1 分钟
  max: 100,              // 最多 100 次
}))

// 3. 请求体大小限制
app.use(bodyParser({ jsonLimit: '1mb' }))

// 4. Helmet 安全头（自动设置 X-Frame-Options、CSP 等安全响应头，防点击劫持、XSS 等）
const helmet = require('koa-helmet')
app.use(helmet())
```

## RESTful vs GraphQL

| 维度 | RESTful | GraphQL |
|------|---------|---------|
| **端点** | 多个 URL | 单一 `/graphql` |
| **数据获取** | 固定返回结构 | 客户端按需声明 |
| **版本管理** | 需要 v1/v2 | Schema 演进，无需版本 |
| **缓存** | HTTP 缓存天然支持 | 需要额外方案 |
| **适用场景** | CRUD 为主、资源边界清晰 | 数据关系复杂、多端适配 |

**建议：** 大部分项目用 RESTful 就够了，数据关系特别复杂或需要多端适配时再考虑 GraphQL。

## 完整示例：用户管理 API

```
GET    /api/v1/users              # 用户列表（分页+过滤）
GET    /api/v1/users/:id          # 用户详情
POST   /api/v1/users              # 创建用户
PUT    /api/v1/users/:id          # 更新用户
DELETE /api/v1/users/:id          # 删除用户
GET    /api/v1/users/:id/posts    # 用户的文章列表
POST   /api/v1/users/:id/avatar   # 上传头像
```

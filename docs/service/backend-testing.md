---
title: 后端测试实践
date: 2026-07-30
---

# 后端测试实践

后端测试比前端测试更重要——前端出错影响体验，后端出错直接影响数据和资金。本文介绍 Node.js 后端的测试方法。

## 为什么后端需要测试

| 场景 | 无测试 | 有测试 |
|------|--------|--------|
| 修改核心逻辑 | 怕改坏，不敢动 | 跑一遍测试，放心改 |
| 新人加入 | 靠人肉 review | 测试即文档 |
| 线上 Bug | 手动复现，耗时 | 写个测试用例，永久覆盖 |
| 重构 | 全量回归靠 QA | 自动化回归 |

## 测试分类

```mermaid
graph TD
    A[测试金字塔] --> B[单元测试]
    A --> C[集成测试]
    A --> D[端到端测试]

    B --> B1[比例最大<br>速度快<br>测单个函数/模块]
    C --> C1[比例适中<br>测模块间协作<br>如 API + 数据库]
    D --> D1[比例最小<br>速度慢<br>模拟真实用户流程]
```

| 类型 | 测什么 | 速度 | 数量 |
|------|--------|------|------|
| **单元测试** | 单个函数/类的逻辑 | 毫秒级 | 最多 |
| **集成测试** | 多个模块协作（API + DB） | 秒级 | 适中 |
| **端到端测试** | 完整用户流程 | 分钟级 | 最少 |

**建议：** 后端重点写单元测试和集成测试，端到端测试交给前端或 QA。

## Jest 基础

Jest 是 Node.js 生态最流行的测试框架，零配置开箱即用。

### 安装

```bash
npm install -D jest
```

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 基本用法

```javascript
// utils.js
function add(a, b) {
  return a + b
}

function divide(a, b) {
  if (b === 0) throw new Error('除数不能为 0')
  return a / b
}

module.exports = { add, divide }
```

```javascript
// utils.test.js
const { add, divide } = require('./utils')

describe('add', () => {
  test('两个正数相加', () => {
    expect(add(1, 2)).toBe(3)
  })

  test('负数相加', () => {
    expect(add(-1, -1)).toBe(-2)
  })
})

describe('divide', () => {
  test('正常除法', () => {
    expect(divide(10, 2)).toBe(5)
  })

  test('除以 0 抛出错误', () => {
    expect(() => divide(10, 0)).toThrow('除数不能为 0')
  })
})
```

### 常用匹配器

```javascript
expect(value).toBe(3)                  // 严格相等（===）
expect(value).toEqual({ a: 1 })        // 深度相等
expect(value).toBeTruthy()             // 真值
expect(value).toBeFalsy()              // 假值
expect(value).toBeNull()               // null
expect(value).toBeUndefined()          // undefined
expect(value).toBeDefined()            // 非 undefined
expect(value).toBeGreaterThan(3)       // > 3
expect(value).toBeGreaterThanOrEqual(3) // >= 3
expect(value).toBeLessThan(5)          // < 5
expect(string).toMatch(/regex/)        // 正则匹配
expect(array).toContain('item')        // 数组包含
expect(object).toHaveProperty('key')   // 对象有属性
expect(fn).toThrow('error message')    // 函数抛出错误
```

### Mock 函数

Mock 用于替换依赖，隔离测试目标。

```javascript
// 模拟函数调用
const mockFn = jest.fn()
mockFn('hello')
mockFn('world')

expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('hello')
expect(mockFn.mock.calls).toEqual([['hello'], ['world']])

// 模拟返回值
mockFn.mockReturnValue(42)
expect(mockFn()).toBe(42)

// 模拟异步返回值
mockFn.mockResolvedValue({ id: 1 })
await expect(mockFn()).resolves.toEqual({ id: 1 })
```

### Mock 模块

```javascript
// db.js
async function findUser(id) {
  // 实际会查数据库
}
module.exports = { findUser }

// user-service.js
const { findUser } = require('./db')

async function getUserDisplayName(id) {
  const user = await findUser(id)
  return user ? user.username : null
}
module.exports = { getUserDisplayName }

// user-service.test.js
jest.mock('./db')  // Mock 整个模块
const { findUser } = require('./db')
const { getUserDisplayName } = require('./user-service')

describe('getUserDisplayName', () => {
  test('用户存在时返回用户名', async () => {
    findUser.mockResolvedValue({ id: 1, username: 'alice' })
    const name = await getUserDisplayName(1)
    expect(name).toBe('alice')
  })

  test('用户不存在时返回 null', async () => {
    findUser.mockResolvedValue(null)
    const name = await getUserDisplayName(999)
    expect(name).toBeNull()
  })
})
```

### 生命周期钩子

```javascript
describe('数据库操作', () => {
  beforeAll(async () => {
    // 整个 describe 块执行前，运行一次
    await connectDB()
  })

  beforeEach(async () => {
    // 每个 test 执行前都运行
    await clearTestData()
  })

  afterEach(async () => {
    // 每个 test 执行后清理
  })

  afterAll(async () => {
    // 整个 describe 块执行后，运行一次
    await disconnectDB()
  })

  test('用例 1', () => {})
  test('用例 2', () => {})
})
```

## Supertest：API 接口测试

Supertest 专门用于测试 HTTP 接口，模拟请求并验证响应。

### 安装

```bash
npm install -D supertest
```

### 测试 Koa 应用

```javascript
const request = require('supertest')
const Koa = require('koa')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')

// 创建测试用的 app（和线上同一个实例）
const app = new Koa()
const router = new Router()

app.use(bodyParser())

router.get('/api/users', async (ctx) => {
  ctx.body = [
    { id: 1, username: 'alice' },
    { id: 2, username: 'bob' },
  ]
})

router.get('/api/users/:id', async (ctx) => {
  const user = { id: Number(ctx.params.id), username: 'alice' }
  ctx.body = user
})

router.post('/api/users', async (ctx) => {
  const { username } = ctx.request.body
  if (!username) {
    ctx.throw(400, '用户名不能为空')
  }
  ctx.status = 201
  ctx.body = { id: 3, username }
})

app.use(router.routes())

// 测试
describe('Users API', () => {
  test('GET /api/users 返回用户列表', async () => {
    const res = await request(app.callback())
      .get('/api/users')
      .expect(200)

    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toHaveProperty('username')
  })

  test('GET /api/users/:id 返回单个用户', async () => {
    const res = await request(app.callback())
      .get('/api/users/1')
      .expect(200)

    expect(res.body.id).toBe(1)
  })

  test('POST /api/users 创建用户', async () => {
    const res = await request(app.callback())
      .post('/api/users')
      .send({ username: 'charlie' })
      .expect(201)

    expect(res.body.username).toBe('charlie')
  })

  test('POST /api/users 缺少用户名返回 400', async () => {
    await request(app.callback())
      .post('/api/users')
      .send({})
      .expect(400)
  })
})
```

### 测试需要认证的接口

```javascript
test('未登录访问 profile 返回 401', async () => {
  await request(app.callback())
    .get('/api/profile')
    .expect(401)
})

test('携带有效 Token 可以访问 profile', async () => {
  // 先登录获取 Token
  const loginRes = await request(app.callback())
    .post('/api/login')
    .send({ username: 'alice', password: '123456' })
    .expect(200)

  const token = loginRes.body.token

  // 用 Token 访问
  const res = await request(app.callback())
    .get('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  expect(res.body.user.username).toBe('alice')
})
```

## 测试数据库操作

测试数据库相关代码时，关键是**隔离**——每个测试用例使用独立的数据，互不干扰。

### 方案：每个测试用例用独立事务

```javascript
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  // 开启事务
  await prisma.$executeRaw`BEGIN`
})

afterEach(async () => {
  // 回滚事务，数据不持久化
  await prisma.$executeRaw`ROLLBACK`
})

afterAll(async () => {
  await prisma.$disconnect()
})

test('创建用户', async () => {
  const user = await prisma.user.create({
    data: { username: 'test-user', email: 'test@example.com' },
  })
  expect(user.username).toBe('test-user')

  // 事务回滚后，数据不会留在数据库中
})
```

### 方案：使用测试数据库

```javascript
// .env.test
DATABASE_URL="postgresql://user:pass@localhost:5432/myapp_test"

// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterSetup: ['./tests/setup.js'],
}

// tests/setup.js
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL + '_test'
```

## 测试覆盖率

```bash
npx jest --coverage
```

输出示例：

```
----------|---------|----------|---------|---------|
File      | % Stmts | % Branch | % Funcs | % Lines |
----------|---------|----------|---------|---------|
All files |   85.71 |    75.00 |   83.33 |   85.71 |
 utils.js |   85.71 |    75.00 |   83.33 |   85.71 |
----------|---------|----------|---------|---------|
```

| 指标 | 说明 |
|------|------|
| **Stmts** | 语句覆盖率——多少行代码被执行了 |
| **Branch** | 分支覆盖率——多少 if/else 分支走到了 |
| **Funcs** | 函数覆盖率——多少函数被调用了 |
| **Lines** | 行覆盖率——多少行被执行了 |

**建议目标：** 核心业务逻辑 80%+，工具函数 90%+。不要为了覆盖率而写无意义的测试。

## 测试最佳实践

### 1. 测试行为，不测试实现

```javascript
// 不好：测试内部实现细节
test('调用了 findUser 方法', () => {
  expect(mockFindUser).toHaveBeenCalled()
})

// 好：测试外部行为
test('传入有效 ID 返回用户名', async () => {
  const name = await getUserDisplayName(1)
  expect(name).toBe('alice')
})
```

### 2. 每个测试独立

```javascript
// 不好：测试之间有依赖
test('先创建用户', () => { createUser() })
test('再查询用户', () => { const u = findUser() })  // 依赖上一个测试

// 好：每个测试自包含
test('创建并查询用户', async () => {
  await createUser({ username: 'test' })
  const user = await findUserByName('test')
  expect(user.username).toBe('test')
})
```

### 3. 测试边界情况

```javascript
describe('分页查询', () => {
  test('第一页', () => {})
  test('最后一页', () => {})
  test('空结果', () => {})
  test('page=0 或负数', () => {})
  test('pageSize 超大', () => {})
})
```

### 4. 测试命名清晰

```javascript
// 不好
test('应该可以工作', () => {})

// 好：描述场景 + 期望结果
test('用户名已存在时返回 409 冲突错误', async () => {
  // ...
})
```

## 完整项目测试结构

```
src/
├── controllers/
│   ├── user.controller.js
│   └── user.controller.test.js    # 控制器测试
├── services/
│   ├── user.service.js
│   └── user.service.test.js       # 服务层测试
── utils/
│   ├── validator.js
│   └── validator.test.js          # 工具函数测试
├── middleware/
│   ├── auth.js
│   └── auth.test.js               # 中间件测试
tests/
├── setup.js                       # 全局测试配置
├── api/
│   ── user.api.test.js           # API 集成测试
└── fixtures/
    ── users.json                 # 测试数据
```

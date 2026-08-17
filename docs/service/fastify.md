---
title: Fastify 入门
date: 2026-08-11
---

# Fastify 入门

Fastify 是一个**高性能**的 Node.js Web 框架：社区驱动（OpenJS 基金会项目），API 风格接近 Express，但更快、更规范。定位是 Express 的"性能升级版"。

## 核心特点

| 特点 | 说明 |
|------|------|
| **高性能** | 靠 JSON Schema 驱动的校验 + 序列化优化，吞吐显著高于 Express |
| **Schema 校验** | 请求/响应用 JSON Schema 声明，自动校验 + 自动序列化 |
| **插件体系** | 官方维护大量插件（cors、jwt、multipart、websocket），生态质量高 |
| **内置日志** | 默认集成 Pino（最快的 Node.js 日志库） |
| **TS 友好** | 类型推导完善，也支持纯 JS |

## 快速开始

### 安装

```bash
npm init -y
npm install fastify
```

### Hello World

```javascript
const Fastify = require('fastify');
const app = Fastify({ logger: true });  // 内置日志

app.get('/', async (request, reply) => {
  return { hello: 'world' };  // 返回对象自动 JSON 序列化
});

app.listen({ port: 3000 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log('Server running on http://localhost:3000');
});
```

**注意**：handler 里 `return` 的值就是响应体（对象自动转 JSON），不需要手动 `ctx.body = ...`——这是 Fastify 和 Koa/Express 最直观的区别。

## 路由

### 基础路由

```javascript
app.get('/user/:id', async (request) => {
  return { id: request.params.id };   // 路径参数
});

app.post('/user', async (request) => {
  return { data: request.body };      // 请求体（JSON 自动解析）
});

app.get('/search', async (request) => {
  return { q: request.query.q };      // query 参数
});
```

### Schema 校验（Fastify 的灵魂）

用 JSON Schema 声明请求格式，Fastify 自动校验 + 失败自动返回 400：

```javascript
app.post('/user', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: { type: 'string' },
        age: { type: 'integer', minimum: 0 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  },
}, async (request) => {
  // 走到这里说明 body 已通过校验
  return { id: '123' };
});
```

**收益**：① 非法请求自动 400（省手写校验）；② 响应序列化走编译后的快路径（性能提升的来源之一）；③ 自动生成 OpenAPI 文档（配合 `@fastify/swagger`）。

## 钩子（Hooks）：Fastify 的"中间件"

Fastify 没有 Koa 那种洋葱模型中间件，而是**生命周期钩子**——按请求处理流程分阶段挂逻辑：

```mermaid
graph LR
    A[onRequest] --> B[preParsing]
    B --> C[preHandler]
    C --> D[handler 业务处理]
    D --> E[onSend]
    E --> F[onResponse]
```

```javascript
// 记录请求耗时（对应 Koa 的洋葱外层）
app.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
});

app.addHook('onResponse', async (request, reply) => {
  app.log.info(`${request.method} ${request.url} - ${Date.now() - request.startTime}ms`);
});

// 鉴权（对应 Koa 的中间件拦截）
app.addHook('preHandler', async (request, reply) => {
  const token = request.headers.authorization;
  if (!token) {
    reply.code(401).send({ error: 'unauthorized' });
  }
});
```

> 相比洋葱模型，钩子更"结构化"：每个阶段职责明确，不会出现"后置代码写在 await next() 后面"的隐晦写法。

## 插件化

Fastify 的一切都是插件：封装功能 → 注册 → 使用。插件有**作用域**（封装上下文），用 `fastify-plugin` 打破封装供全局使用：

```javascript
// 插件：给 app 挂一个业务方法
const fp = require('fastify-plugin');

async function myPlugin(app, opts) {
  app.decorate('greet', (name) => `hello ${name}`);
}

// 全局注册（打破作用域封装）
app.register(fp(myPlugin));

// 任何地方直接用 app.greet
app.get('/', async () => ({ msg: app.greet('fastify') }));
```

官方生态常用插件：

| 插件 | 用途 |
|------|------|
| `@fastify/cors` | 跨域 |
| `@fastify/jwt` | JWT 认证 |
| `@fastify/multipart` | 文件上传 |
| `@fastify/websocket` | WebSocket |
| `@fastify/swagger` | 自动生成 API 文档 |

## 与 NestJS 的关系

NestJS 默认底层用 Express，也可以切换成 Fastify（`platform-fastify`）——拿到 Nest 的工程化 + Fastify 的性能。所以两者不是二选一，可以组合。

**切换成本极低**：业务代码（Controller/Service/守卫/管道/模块）平台无关、不用动，只在 `main.ts` 换适配器：

```typescript
// main.ts —— 唯一要改的地方
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),   // 把默认 Express 换成 Fastify
);
```

**需要额外处理的只有"直接碰 Express 生态"的地方**：文件上传（multer → `@fastify/multipart`）、cookie（→ `@fastify/cookie`）、静态文件、以及 `@Req()`/`@Res()` 拿到的对象类型从 Express 变成 Fastify。其余 95% 代码不用动，所以可以"先用 Express，遇到性能瓶颈再切"。

## 框架定位对比

| 框架 | 定位 | 适合场景 |
|------|------|---------|
| Express | 事实标准，生态最全 | 默认选择、教程/原型 |
| Koa | 轻量洋葱模型 | 学习、轻量服务 |
| **Fastify** | 高性能 + Schema 规范 | 高并发 API 服务 |
| NestJS | 企业级全家桶 | 大型工程、团队协作 |
| Hono | 多运行时（Edge） | Serverless、边缘计算 |

## 小结

- 记住 Fastify 三板斧：**return 即响应**、**Schema 自动校验**、**钩子代替中间件**
- 国内热度一般，但国外是高性能 API 的主流选择
- 主线学 NestJS 的话，Fastify 知道定位即可；想体验性能优势，把 NestJS 底层换成 `platform-fastify` 就行

---
title: Express.js 入门
date: 2026-08-12
---

# Express.js 入门

Express 是 Node.js 后端框架的**事实标准**：2010 年诞生，npm 下载量长期第一，生态最全（任何功能都有现成中间件）。你学的 Koa 是 Express 作者 TJ 后来做的改进版，两者血缘最近——学完 Express 再理解 Koa/Nest（Nest 底层就是 Express）会非常顺。

## 快速开始

```bash
mkdir my-express-app && cd my-express-app
npm init -y
npm install express
```

```javascript
// app.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(3000, () => console.log('listening on 3000'));
```

```bash
node app.js   # 访问 http://localhost:3000
```

## 路由

```javascript
app.get('/users', listHandler);        // 查列表
app.post('/users', createHandler);     // 新增
app.get('/users/:id', showHandler);    // 路径参数
app.put('/users/:id', updateHandler);  // 更新
app.delete('/users/:id', destroyHandler);  // 删除

// 路径参数和查询参数
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });     // GET /users/1 → { id: '1' }
});

app.get('/search', (req, res) => {
  res.json({ keyword: req.query.q });  // GET /search?q=vue → { keyword: 'vue' }
});
```

响应方法常用：`res.send()`（字符串/HTML）、`res.json()`（JSON）、`res.status()`（状态码）、`res.redirect()`（重定向）。

## 中间件（Express 的核心）

请求从进入到响应发出，会**依次经过中间件链**。中间件形态：`(req, res, next) => {}`，处理完必须调 `next()` 放行。

```javascript
// 应用级中间件
app.use(express.json());              // 内置：解析 JSON 请求体
app.use((req, res, next) => {         // 自定义：日志中间件
  console.log(`${req.method} ${req.url}`);
  next();                             // 不放行，请求就卡在这里
});

// 路由级中间件：只对这条路由生效
app.get('/admin', authMiddleware, (req, res) => {
  res.json({ secret: 'admin only' });
});
```

> 注意：Express 中间件是**线性链**（单向传递），不是 Koa 的洋葱模型——`next()` 之后的代码没有"响应原路返回"的约定，中间件只管请求进来这一段。

## 错误处理

Express 5（当前默认版本）起，**async 处理器抛错会自动进入错误中间件**，不用手动 try/catch：

```javascript
// 错误处理中间件：必须有 4 个参数（err 在第一个），Express 靠参数个数识别它
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message });
});

// async 抛错自动被捕获
app.get('/users/:id', async (req, res) => {
  const user = await db.find(req.params.id);
  if (!user) throw { status: 404, message: 'User not found' };
  res.json(user);
});
```

错误中间件必须注册在**所有路由之后**（它是最外层的兜底）。机制：正常请求根本不会执行它；**任一中间件抛错或调 `next(err)` 时，Express 跳过之后的所有普通中间件，直达第一个错误中间件**——所以它注册在最后 = 整个链路的出错出口。错误中间件之间也可以分层（如 404 处理在前、500 兜底在后）。

## 静态文件

```javascript
app.use(express.static('public'));  // public/ 目录下的文件直接可访问
// http://localhost:3000/logo.png → public/logo.png
```

## 生态：中间件就是一切

Express 的核心资产不是框架本身（它只做路由和中间件两件事），而是**围绕中间件长出的生态**——几乎所有 Web 功能都有现成中间件，接入方式统一为两步：装包 + `app.use()`：

| 分类 | 中间件 | 用途 | 一句话用法 |
|------|--------|------|-----------|
| **日志** | morgan | HTTP 请求日志 | `app.use(morgan('dev'))` |
| **跨域** | cors | 开启 CORS | `app.use(cors())` |
| **压缩** | compression | gzip 压缩响应 | `app.use(compression())` |
| **Cookie** | cookie-parser | 解析 Cookie | `app.use(cookieParser())` |
| **会话** | express-session | 登录态会话 | `app.use(session({ secret: 'xxx' }))` |
| **鉴权** | passport | 策略式登录（本地/JWT/OAuth） | `passport.authenticate('jwt')` |
| **上传** | multer | 文件上传 | `upload.single('avatar')` |
| **安全** | helmet | 设置安全响应头 | `app.use(helmet())` |
| **限流** | express-rate-limit | 接口限流防刷 | `app.use(rateLimit({ limit: 100 }))` |
| **校验** | express-validator | 请求参数校验 | `validationResult(req)` |
| **模板** | ejs / pug | 服务端渲染页面 | `app.set('view engine', 'ejs')` |
| **配置** | dotenv | 读取 .env 环境变量 | `require('dotenv').config()` |
| **开发** | nodemon | 改代码自动重启 | `nodemon app.js` |
| **部署** | PM2 | 生产守护、多实例、日志 | `pm2 start app.js` |

（请求体解析 `express.json()`、静态文件 `express.static()` 已内置，不用装。）

**这就是 Express 与 Koa 生态差距的由来**：Koa 连路由、静态文件都要自己找中间件组合；Express 生态"什么都有、且久经验证"。Nest 底层选 Express 也是这个原因——Nest 的守卫、管道解决工程化问题，上传、会话、静态文件这些"杂活"直接透传给 Express 生态，**你学的 Express 生态在 Nest 里照样用**。

对比 Egg/Nest 的"框架内置"思路，Express 是**按需装包**：项目小就装两三个中间件，项目大就多装几个，灵活但选型、升级、组合都由你自己负责——这正是它"简单但自由"的定位。

## Express vs Koa

| 维度 | Express | Koa |
|------|---------|-----|
| **关系** | 事实标准，TJ 主导（4.x） | TJ 后来做的"改进版" |
| **中间件模型** | 线性链（单向） | 洋葱（`await next()` 有进入/退出两段） |
| **内置能力** | 路由、静态文件、模板 | 极简，几乎全靠中间件 |
| **生态** | 最全，事实标准 | 可复用 Express 生态 |
| **适用** | 默认选择、原型、教程 | 学习中间件模型、轻量服务 |

**选择建议**：
- 默认/求稳/生态优先 → Express
- 想理解洋葱模型、写轻量服务 → Koa
- 企业级工程 → NestJS（底层就是 Express，学的直接复用）

## 小结

- Express 三板斧：**路由 + 中间件 + 错误处理**
- 生态最全：上传（multer）、会话（express-session）、鉴权（passport）都有现成中间件
- 它是 Koa 和 Nest 的"源头"，学它等于给后面两个框架打地基

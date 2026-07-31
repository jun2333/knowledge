---
title: Serverless 入门
date: 2023-03-08
---

# Serverless 入门

Serverless（无服务器）是一种云计算执行模型，开发者只需编写和部署代码，无需管理服务器基础设施。

## 核心概念

| 概念 | 说明 |
|------|------|
| **FaaS** | Function as a Service，函数即服务 |
| **BaaS** | Backend as a Service，后端即服务 |
| **冷启动** | 函数首次调用时的初始化延迟 |
| **按量付费** | 只为实际执行时间付费 |

## 架构对比

### 传统架构

```mermaid
graph TB
    subgraph 服务器
        A1[操作系统]
        A2[运行时环境]
        A3[应用代码]
        A4[Web 服务器]
    end

    subgraph 运维
        B1[监控]
        B2[扩容]
        B3[安全补丁]
    end

    A1 --> A2 --> A3 --> A4
    B1 --> A1
    B2 --> A1
    B3 --> A1
```

### Serverless 架构

```mermaid
graph TB
    subgraph 开发者
        A1[函数代码]
    end

    subgraph 云平台
        B1[自动扩缩容]
        B2[负载均衡]
        B3[监控告警]
    end

    A1 -->|部署| B1
    B1 --> B2 --> B3
```

**核心区别：** 开发者只关心代码，平台负责一切基础设施。

## 主流平台

| 平台 | 提供商 | 特点 |
|------|--------|------|
| **AWS Lambda** | Amazon | 最成熟，生态丰富 |
| **Cloud Functions** | Google | 与 GCP 深度集成 |
| **Azure Functions** | Microsoft | 企业级支持 |
| **Vercel Functions** | Vercel | 前端友好，Next.js 集成 |
| **Cloudflare Workers** | Cloudflare | 边缘计算，低延迟 |
| **阿里云函数计算** | 阿里云 | 国内服务，中文支持 |

## 快速开始

### Vercel Functions（最简单）

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 初始化项目
vercel init my-app
cd my-app

# 3. 创建 api 目录（该目录下的文件自动成为函数）
mkdir -p api
```

```javascript
// api/hello.js
export default function handler(req, res) {
  const { name = 'World' } = req.query;
  res.status(200).json({ message: `Hello ${name}!` });
}
```

```bash
# 4. 本地开发（自动检测 api 目录）
vercel dev

# 5. 部署到 Preview 环境（测试）
vercel

# 6. 部署到 Production 环境（生产）
vercel --prod

# 7. 查看部署状态
vercel ls
```

**部署后访问：**
```
# Preview 环境（每次部署生成独立 URL）
https://my-app-git-feature-xxx.vercel.app/api/hello

# Production 环境（固定域名）
https://my-app.vercel.app/api/hello?name=Alice
# 返回：{ "message": "Hello Alice!" }
```

> **Vercel 环境区分：**
> | 环境 | 触发方式 | URL | 用途 |
> |------|---------|-----|------|
> | **Development** | `vercel dev` | localhost:3000 | 本地开发 |
> | **Preview** | `vercel` 或 git push 到非主分支 | `my-app-git-xxx.vercel.app` | 测试/Code Review |
> | **Production** | `vercel --prod` 或合并到主分支 | `my-app.vercel.app` | 线上生产 |
>
> 每个 Preview 环境有独立 URL，互不干扰，适合 PR 预览。

> **Vercel 部署原理：**
> - `api/` 目录下的每个文件自动成为一个 Serverless 函数
> - 文件名即路由：`api/hello.js` → `/api/hello`
> - 支持动态路由：`api/user/[id].js` → `/api/user/123`
> - 每次 git push 自动触发部署

> **环境变量配置：**
>
> **方式 1：命令行**
> ```bash
> # 添加环境变量（交互式选择环境）
> vercel env add DATABASE_URL
> # 选择环境：Production / Preview / Development
> # 输入值：mysql://user:pass@prod-db:3306/mydb
>
> # 查看已配置的环境变量
> vercel env ls
>
> # 删除环境变量
> vercel env rm DATABASE_URL
> ```
>
> **方式 2：Dashboard**
> 项目 → Settings → Environment Variables → 添加
>
> **方式 3：本地开发（.env 文件）**
> ```bash
> # .env.local（本地开发用，不提交到 Git）
> DATABASE_URL=mysql://localhost:3306/mydb
> API_KEY=dev-key-123
> ```
>
> **在函数中使用：**
> ```javascript
> // api/hello.js
> export default function handler(req, res) {
>   const dbUrl = process.env.DATABASE_URL;  // 自动注入
>   const apiKey = process.env.API_KEY;
>   
>   res.status(200).json({ dbUrl, apiKey });
> }
> ```
>
> **环境隔离：** 同一个变量可以为不同环境设置不同值，如 `DATABASE_URL` 在 Production 指向生产库，在 Preview 指向测试库。

### AWS Lambda

```bash
npm install -g serverless
serverless create --template aws-nodejs --path my-function
```

```javascript
// handler.js
module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from Lambda!',
      input: event
    })
  };
};
```

```yaml
# serverless.yml
service: my-function
provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1

functions:
  hello:
    handler: handler.hello
    events:
      - http:
          path: hello
          method: get
```

```bash
# 部署
serverless deploy

# 本地测试
serverless invoke local --function hello
```

### Cloudflare Workers

```bash
npm install -g wrangler
wrangler init my-worker
```

```javascript
// src/index.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const name = url.searchParams.get('name') || 'World';
    
    return new Response(JSON.stringify({
      message: `Hello ${name}!`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

```bash
# 本地开发
wrangler dev

# 部署
wrangler deploy
```

## 函数触发方式

| 触发方式 | 说明 | 示例 |
|---------|------|------|
| **HTTP 请求** | API 网关触发 | REST API、Webhook |
| **定时任务** | Cron 表达式 | 数据清理、报表生成 |
| **事件驱动** | 云服务事件 | 文件上传、消息队列 |
| **数据库变更** | 数据变化触发 | 缓存更新、索引重建 |

### 定时任务示例

```yaml
# serverless.yml
functions:
  cleanup:
    handler: handler.cleanup
    events:
      - schedule: rate(1 day)  # 每天执行一次
```

```javascript
// handler.js
module.exports.cleanup = async (event) => {
  // 清理过期数据
  await db.query('DELETE FROM logs WHERE created_at < NOW() - INTERVAL 30 DAY');
  
  return { statusCode: 200, body: 'Cleanup completed' };
};
```

### 事件驱动示例

```yaml
# AWS S3 文件上传触发
functions:
  processImage:
    handler: handler.processImage
    events:
      - s3:
          bucket: my-uploads
          event: s3:ObjectCreated:*
```

```javascript
// handler.js
module.exports.processImage = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  
  // 处理上传的图片
  await imageProcessor.resize(bucket, key);
  
  return { statusCode: 200 };
};
```

## 冷启动优化

冷启动是 Serverless 的主要性能问题。

### 冷启动流程

```mermaid
graph LR
    A[请求到达] --> B{实例存在?}
    B -->|是| C[执行函数]
    B -->|否| D[创建实例]
    D --> E[加载代码]
    E --> F[初始化运行时]
    F --> C
    C --> G[返回响应]
```

### 优化策略

| 策略 | 说明 |
|------|------|
| **减少包体积** | 只打包必要依赖 |
| **使用轻量运行时** | Node.js > Java |
| **预热函数** | 定时调用保持实例活跃 |
| ** provisioned concurrency** | 预留实例（AWS） |
| **边缘部署** | Cloudflare Workers 无冷启动 |

```javascript
// 预热函数（每 5 分钟调用一次）
module.exports.warmup = async () => {
  console.log('Keeping function warm');
  return { statusCode: 200 };
};
```

## 与 BFF 结合

Serverless 非常适合做 BFF 层。

```javascript
// Vercel Functions 做 BFF
// api/product/[id].js
export default async function handler(req, res) {
  const { id } = req.query;

  // 并行调用多个微服务
  const [product, reviews] = await Promise.allSettled([
    fetch(`http://product-service/products/${id}`).then(r => r.json()),
    fetch(`http://review-service/reviews?productId=${id}`).then(r => r.json())
  ]);

  if (product.status === 'rejected') {
    return res.status(500).json({ error: 'Product not found' });
  }

  res.status(200).json({
    ...product.value,
    reviews: reviews.status === 'fulfilled' ? reviews.value : []
  });
}
```

**优势：**
- 无需管理服务器
- 自动扩缩容
- 按调用次数付费
- 全球边缘部署

## 适用场景

| 场景 | 是否适合 |
|------|---------|
| **API 接口** | ✅ 非常适合 |
| **定时任务** | ✅ 非常适合 |
| **事件处理** | ✅ 非常适合 |
| **BFF 层** | ✅ 非常适合 |
| **高并发场景** | ✅ 自动扩容 |
| **长连接/WebSocket** | ⚠️ 有限制 |
| **计算密集型** | ⚠️ 有超时限制 |
| **有状态服务** | ❌ 不适合 |

## 总结

| 维度 | 传统服务器 | Serverless |
|------|-----------|-----------|
| **运维成本** | 高 | 无 |
| **扩容** | 手动/自动配置 | 全自动 |
| **付费** | 按服务器时长 | 按调用次数/执行时间 |
| **冷启动** | 无 | 有（可优化） |
| **适用场景** | 长期运行服务 | 事件驱动、API |

**核心思想：** 把基础设施交给云平台，开发者只关注业务逻辑。

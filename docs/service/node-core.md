---
title: Node.js 核心模块
date: 2026-07-30
---

# Node.js 核心模块

Node.js 提供了丰富的内置模块，无需安装第三方包即可使用。理解这些核心模块是后端开发的基础。

## 与浏览器环境的差异

| 维度 | 浏览器 | Node.js |
|------|--------|---------|
| **全局对象** | `window` | `global` |
| **DOM/BOM** | 有 | 无 |
| **文件系统** | 受限（File API） | 完整访问（`fs`） |
| **网络** | 只能发 HTTP 请求 | 可创建 TCP/HTTP 服务器 |
| **模块系统** | ES Modules | CommonJS + ES Modules |
| **进程控制** | 有限 | 完整（`process`） |

## process 模块

`process` 提供了当前 Node.js 进程的信息和控制能力，无需 `require` 即可直接使用。

### 常用属性

```javascript
process.argv          // 命令行参数数组 ['node', 'script.js', 'arg1']
process.env           // 环境变量对象
process.cwd()         // 当前工作目录
process.pid           // 进程 ID
process.platform      // 操作系统：'darwin' | 'linux' | 'win32'
process.version       // Node.js 版本
process.memoryUsage() // 内存使用情况
```

### 常用方法

```javascript
process.exit(0)       // 退出进程，0 表示正常
process.nextTick(fn)  // 在当前事件循环末尾执行（比 setTimeout 更快）
process.on('SIGINT', () => {
  console.log('收到 Ctrl+C，优雅退出')
  process.exit(0)
})
```

### 环境变量实践

`process.env` 中的变量**不会自动从 `.env` 文件加载**，来源有以下几种：

```bash
# 方式 1：命令行传入（启动时注入）
PORT=3000 NODE_ENV=production node app.js

# 方式 2：操作系统已有环境变量（shell 中 export 的变量会自动传入）
export DB_HOST=localhost
node app.js
```

```javascript
// 方式 3：用 dotenv 库从 .env 文件加载（最常用）
// 先安装：npm install dotenv
require('dotenv').config()  // 读取项目根目录的 .env 文件，赋值到 process.env

// 方式 4：代码中直接赋值
process.env.MY_VAR = 'hello'
```

```javascript
// .env 文件示例（不要提交到 git，通过 .gitignore 排除）
// PORT=3000
// NODE_ENV=production
// DB_HOST=localhost

// 加载后使用
const port = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'
```

## path 模块

处理文件路径的跨平台工具，避免手动拼接路径导致的兼容问题。

```javascript
const path = require('path')

path.join('/foo', 'bar', 'baz/')    // '/foo/bar/baz/'
path.resolve('www', 'html')         // 从 cwd 解析为绝对路径
path.dirname('/foo/bar/baz.js')     // '/foo/bar'
path.basename('/foo/bar/baz.js')    // 'baz.js'
path.extname('/foo/bar/baz.js')     // '.js'
path.parse('/foo/bar/baz.js')
// { root: '/', dir: '/foo/bar', base: 'baz.js', ext: '.js', name: 'baz' }
```

**`join` vs `resolve`：**
- `join` 只是拼接路径字符串
- `resolve` 会解析为绝对路径，类似 `cd` 的效果

## fs 模块

文件系统操作，后端开发最常用的模块之一。

### 回调风格（旧）

```javascript
const fs = require('fs')

fs.readFile('./data.txt', 'utf8', (err, data) => {
  if (err) throw err
  console.log(data)
})
```

### Promise 风格（推荐）

```javascript
const fs = require('fs/promises')

async function main() {
  // 读取文件
  const data = await fs.readFile('./data.txt', 'utf8')

  // 写入文件（覆盖）
  await fs.writeFile('./output.txt', 'Hello World')

  // 追加内容
  await fs.appendFile('./log.txt', 'new line\n')

  // 创建目录
  await fs.mkdir('./uploads', { recursive: true })

  // 删除文件
  await fs.unlink('./temp.txt')

  // 读取目录
  const files = await fs.readdir('./src')

  // 检查文件是否存在
  try {
    await fs.access('./config.json')
    console.log('文件存在')
  } catch {
    console.log('文件不存在')
  }

  // 获取文件信息
  const stat = await fs.stat('./data.txt')
  console.log(stat.size)      // 文件大小（字节）
  console.log(stat.isFile())  // true
  console.log(stat.isDirectory()) // false
}
```

### 流式读写（大文件）

`fs.readFile` 会把整个文件一次性加载到内存。文件比内存大时直接崩溃。流式读写**分块处理**，每次只加载一小块（默认 64KB），内存占用恒定。

```
普通读写：1GB 文件 → 占用 1GB+ 内存 → 大文件直接 OOM
流式读写：1GB 文件 → 内存始终 ~64KB → 文件大小无上限
```

**选择建议：** 几 KB 到几 MB 用 `readFile` 就够了；几百 MB 以上或文件大小不确定时，用流。

```javascript
const fs = require('fs')

// 读取流
const readStream = fs.createReadStream('./big-file.txt', {
  encoding: 'utf8',
  highWaterMark: 64 * 1024  // 每次读 64KB
})

readStream.on('data', (chunk) => {
  console.log('收到数据块:', chunk.length)
})

readStream.on('end', () => {
  console.log('读取完成')
})

// 管道：读取 → 压缩 → 写入
const zlib = require('zlib')
fs.createReadStream('./big-file.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('./big-file.txt.gz'))
```

## Buffer 模块

Node.js 处理二进制数据的核心类型。浏览器中的 `Uint8Array` 在 Node.js 中对应 `Buffer`。

```javascript
// 从字符串创建
const buf1 = Buffer.from('Hello', 'utf8')
console.log(buf1)           // <Buffer 48 65 6c 6c 6f>
console.log(buf1.toString()) // 'Hello'

// 分配指定大小的 Buffer
const buf2 = Buffer.alloc(10)  // 10 字节，全部填 0

// 从数组创建
const buf3 = Buffer.from([72, 101, 108, 108, 111])
console.log(buf3.toString())   // 'Hello'

// Base64 编解码
const base64 = Buffer.from('Hello').toString('base64')  // 'SGVsbG8='
const decoded = Buffer.from(base64, 'base64').toString() // 'Hello'

// 图片等二进制文件
const fs = require('fs/promises')
const imageBuffer = await fs.readFile('./logo.png')
// imageBuffer 就是 Buffer 类型，可以直接传给 HTTP 响应
```

**常见场景：**
- 读取图片、PDF 等二进制文件
- 处理文件上传
- Base64 编解码
- 加密/解密操作

## events 模块

Node.js 的事件驱动架构基石，本质是**发布订阅模式**的实现。很多核心模块（如 `http`、`fs`、`stream`）都继承了 `EventEmitter`。

> 发布订阅模式：发布者（`emit`）和订阅者（`on`）不直接通信，通过事件中心（`EventEmitter`）解耦。前端常见的 `addEventListener`、Vue 的 `$emit/$on`、Redux 的 store 订阅都是同一模式。

```javascript
const EventEmitter = require('events')

class MyEmitter extends EventEmitter {}

const emitter = new MyEmitter()

// 监听事件
emitter.on('data', (msg) => {
  console.log('收到数据:', msg)
})

// 只监听一次
emitter.once('connect', () => {
  console.log('首次连接')
})

// 触发事件
emitter.emit('data', 'Hello')
emitter.emit('data', 'World')
emitter.emit('connect')
```

### 错误事件

`error` 是特殊事件，如果没有监听器会直接抛出异常导致进程退出。

```javascript
emitter.on('error', (err) => {
  console.error('出错了:', err.message)
})

emitter.emit('error', new Error('something went wrong'))
```

## stream 模块

流是 Node.js 处理连续数据的核心抽象。数据像水流一样分块处理，不需要全部加载到内存。

### 四种流类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **Readable** | 可读流 | `fs.createReadStream`、HTTP 请求体 |
| **Writable** | 可写流 | `fs.createWriteStream`、HTTP 响应体 |
| **Duplex** | 双工流（既可读又可写） | `net.Socket` |
| **Transform** | 转换流（读写时转换数据） | `zlib.createGzip` |

### 实际案例：文件上传

```javascript
const http = require('http')
const fs = require('fs')

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    const writeStream = fs.createWriteStream('./uploaded-file.bin')
    req.pipe(writeStream)  // 请求体直接管道写入文件

    writeStream.on('finish', () => {
      res.writeHead(200)
      res.end('Upload complete')
    })

    writeStream.on('error', (err) => {
      res.writeHead(500)
      res.end('Upload failed')
    })
  }
})

server.listen(3000)
```

## http 模块

Node.js 可以原生创建 HTTP 服务器，所有 Web 框架（Koa/Express/NestJS）都基于此。

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  // req 是 Readable 流
  console.log(req.method, req.url)
  console.log(req.headers)

  // res 是 Writable 流
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Hello from raw http' }))
})

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

**理解这一点很重要：** Koa 的 `ctx`、Express 的 `req/res`，底层都是对 `http.IncomingMessage` 和 `http.ServerResponse` 的封装。

## crypto 模块

提供加密、哈希、签名等安全功能。

```javascript
const crypto = require('crypto')

// MD5 哈希（不推荐用于安全场景：已被证明存在碰撞漏洞，
//   即不同的输入可能产生相同的哈希值，可被暴力破解）
const md5 = crypto.createHash('md5').update('hello').digest('hex')

// SHA256 哈希（推荐）
const sha256 = crypto.createHash('sha256').update('hello').digest('hex')

// HMAC 签名
const hmac = crypto
  .createHmac('sha256', 'secret-key')
  .update('data')
  .digest('hex')

// 生成随机 token
const token = crypto.randomBytes(32).toString('hex')

// UUID v4
const uuid = crypto.randomUUID()
```

## url 和 querystring 模块

解析 URL 和查询参数。`URL` 是全局对象（和浏览器一样），无需 `require`。`querystring` 是内置模块，需要引入。

```javascript
const querystring = require('querystring')

// 解析 URL（URL 是全局对象，无需 require）
const parsed = new URL('http://localhost:3000/api/users?id=1&name=test')
console.log(parsed.pathname)  // '/api/users'
console.log(parsed.searchParams.get('id'))  // '1'

// 查询字符串
const qs = querystring.parse('id=1&name=test')
// { id: '1', name: 'test' }

const str = querystring.stringify({ id: 1, name: 'test' })
// 'id=1&name=test'
```

## 模块系统：CommonJS vs ES Modules

Node.js 同时支持两种模块系统。

### CommonJS（Node.js 传统方式）

```javascript
// 导出
module.exports = { foo: 1, bar: 2 }

// 导入
const { foo, bar } = require('./module')
```

### ES Modules（现代方式）

启用方式（二选一）：
- `package.json` 中设置 `"type": "module"`（对该包下所有 `.js` 文件生效）
- 使用 `.mjs` 扩展名（单个文件强制 ESM，优先级最高）

```javascript
// 导出
export const foo = 1
export default function bar() {}

// 导入
import bar, { foo } from './module.js'
```

### 关键差异

| 特性 | CommonJS | ES Modules |
|------|----------|------------|
| **加载时机** | 运行时同步加载 | 编译时异步加载 |
| **this 指向** | 指向 `module.exports` | `undefined` |
| **动态导入** | `require()` 可在任何位置调用 | `import()` 返回 Promise |
| **缓存** | 首次加载后缓存 | 类似，但有细微差异 |
| **文件扩展名** | 可省略 `.js` | 必须写 `.js` |

**建议：** 新项目优先使用 ES Modules（配合 TypeScript），老项目维护用 CommonJS。

## 实战：用核心模块写一个静态文件服务器

```javascript
const http = require('http')
const fs = require('fs/promises')
const path = require('path')

const PORT = 3000
const PUBLIC_DIR = path.resolve('./public')

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
}

const server = http.createServer(async (req, res) => {
  // 安全：防止路径穿越攻击
  const filePath = path.join(PUBLIC_DIR, req.url)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  try {
    const data = await fs.readFile(filePath)
    const ext = path.extname(filePath)
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(PORT, () => {
  console.log(`Static server running on http://localhost:${PORT}`)
})
```

这个例子综合使用了 `http`、`fs`、`path` 三个核心模块，是一个理解 Node.js 后端运作方式的好起点。

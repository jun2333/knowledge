## 什么是 OPTIONS

是浏览器对复杂跨域请求的一种处理方式，在真正发送请求之前，会先进行一次预检请求，就是我们刚刚说到的参数为 OPTIONS 的第一次请求，作用是用于试探服务端是否能接受真正的请求。服务器确认允许之后，才发起实际的 HTTP 请求。在预检请求的返回中，服务器端也可以通知客户端，是否需要携带身份凭证（包括 Cookies 和 HTTP 认证等相关数据）。如果 OPTIONS 获得的回应时拒绝性质的，如 404、403、500 等状态，就会停止 post、get 请求的发出。针对非简单请求的 CORS 请求，会在正式通信之前，额外增加一次 HTTP 请求，称为"预检"请求（preflight），以获知服务器是否允许该实际请求，避免跨域请求对服务器产生未预期的影响。非简单请求产生条件如下：

三者出现一个就会预检
1. 请求的方法不是 GET/HEAD/POST
2. POST 请求的 Content-Type 并非 application/x-www-form-urlencoded, multipart/form-data, 或text/plain 如发送json类型数据
3. 请求设置了自定义的 header 字段
满足非简单请求就需要先进性 OPTIONS 预检请求，第二次才是真实的请求。很明显，如果我们不进行优化处理，只要是非简单请求，每一次都会出现先发一次 OPTIONS 预请求，然后才是真实请求，这样明显是不合理的。优化方案如下：

全部用简单请求：大多数的场景都是非简单请求，这种方案行不通。
Access-Control-Max-Age：表示 Access-Control-Allow-Methods / Access-Control-Allow-Headers 可以被缓存多久，单位为秒。在 Access-Control-Max-Age 有效期内直接请求而不用再询问服务器否可以跨源了，即不再 OPTIONS 请求。

## 简单请求
1. 请求方法是GET/HEAD/POST
2. POST请求body非json类型
3. 无自定义头部
## 非简单请求
简单请求的三个要求出现任意不符合就视为非简单请求


## GET和POST的区别
1. 长度 get-长度限制一般2kb post-无限制
2. 传输方式 get-地址栏 post-报文
3. 数据包数量 get-1个tcp数据包(header和data一并发出去)  post-2个tcp数据包(先发headers，响应100再发data，最后响应200)
4. 安全性 get-暴露在地址栏，不安全 post-相对安全
5. 回退 get-回退无害 post-回退重复请求
6. 缓存 get-自动被缓存 post-不自动缓存
7. 浏览器历史记录 get-会被保存到历史记录 post-不会
8. 参数类型 get-只支持ASCII字符 post-不限制
9. 编码 get-只支持URL编码 post-支持多种编码方式
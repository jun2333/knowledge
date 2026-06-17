# 存储
## Cookie
作用域：同源共享，子域也共享
缺点：
1. 容量缺陷。大小限制4k
2. 性能缺陷。请求头上带着数据，导致流量增加
3. 安全缺陷。由于 Cookie 以纯文本的形式在浏览器和服务器中传递，很容易被非法用户截获，然后进行一系列的篡改，在 Cookie 的有效期内重新发送给服务器，这是相当危险的。另外，在HttpOnly为 false 的情况下，Cookie 信息能直接通过 JS 脚本来读取
4. 操作缺陷。Cookie的原生api不友好，需要自行封装

## Web Storage(localStorage和sessionStorage)
### localStorage
作用域：同源共享
以键值对(Key-Value)的方式存储，永久存储，永不失效，除非手动删除。IE8+支持，每个域名限制5M 打开同域的新页面也能访问得到。可以存储数组、数字、对象等可以被序列化为字符串的内容
### sessionStorage
作用域：本页面独享，即使新开相同页面也无法共享
sessionStorage 在关闭页面后即被清空，而 localStorage 则会一直保存。很多时候数据只需要在用户浏览一组页面期间使用，关闭窗口后数据就可以丢弃了，这种情况使用 sessionStorage 就比较方便。 **注意，刷新页面 sessionStorage 不会清除，但是打开同域新页面访问不到**

## indexed DB
作用域：同源共享
适用于存储大量数据，可以为应用创建离线版本
特点:
1. 键值对存储。内部采用对象仓库存放数据，在这个对象仓库中数据采用键值对的方式来存储。
2. 异步操作。数据库的读写属于 I/O 操作, 浏览器中对异步 I/O 提供了支持。
3. 受同源策略限制，即无法访问跨域的数据库。

# 缓存
## 强缓存200(优先级高)
强缓存涉及响应headers字段：Expires、Cache-Control
返回200
### Expires(http1.0)
指定一个过期时间(绝对时间)
### Cache-Control(http1.1)
字段：
1. no-store:禁止所有缓存(强缓存与协商缓存)
2. no-cache:禁止强缓存
3. private:私有缓存（响应只能用于浏览器私有缓存中）中间人(CDN,代理不能缓存), 如果要求 HTTP 认证，响应会自动设置为 private
4. public:公共缓存（可以被任何中间人缓存）, 多用户间共享。
5. max-age:单位：秒(s)。资源能够被缓存（保持新鲜）的最大时间；相对于Expires，是一个相对时间，优先级高于 Expires，max-age是距离请求发起的时间的秒数，针对那些不会改变的文件(静态资源)，可手动设置一定的时长缓存
6. s-maxage:单位：秒(s)。只用于共享缓存(如：CDN缓存)。s-maxage有效期内不请求CDN。 max-age 用于普通缓存，而 s-maxage 用于代理缓存。如果存在 s-maxage，则会覆盖掉 max-age 和 Expires
7. must-revalidate:缓存使用陈旧资源时必须先验证状态，已过期的缓存不被使用
## 协商缓存304(优先级低)
顾名思义，先问服务器资源是否更新，服务器返回未更新或者更新后的资源，若未更新则取浏览器缓存资源
返回304
request headers: If-Modified-Since、If-None-Match
response headers: Last-Modified、Etag
If-Modified-Since/Last-Modified：记录文件修改时间(优先级低于Etag组合)
If-None-Match/Etag：记录文件内容

## 缓存最佳实践
由于在精度上Etag优于Last-Modified，但性能上后者较强；并且考虑到分布式集群每台机器生成的Etag不一致，所以不适合Etag方案；
因此如果Last-Modified使用上没问题的话就用它吧~

html文件建议协商缓存，css,js等资源文件建议采取强缓存~
webpack打包的文件指纹跟缓存没关系，它是用于解除强缓存的!

## 缓存存储位置
1. service worker:
Service Worker 借鉴了 Web Worker 的 思路，即让 JS 运行在主线程之外，由于它脱离了浏览器的窗体，因此无法直接访问 DOM。虽然如此，但它仍然能帮助我们完成很多有用的功能，比如离线缓存、消息推送和网络代理等功能。其中的离线缓存就是 Service Worker Cache。Service Worker 同时也是 PWA 的重要实现机制。

Service Worker 是运行在浏览器背后的独立线程，一般可以用来实现缓存功能。使用 Service Worker的话，传输协议必须为 HTTPS。因为 Service Worker 中涉及到请求拦截，所以必须使用 HTTPS 协议来保障安全。

Service Worker 的缓存与浏览器其他内建的缓存机制不同，它可以让我们自由控制缓存哪些文件、如何匹配缓存、如何读取缓存，并且缓存是持续性的。

Service Worker 实现缓存功能一般分为三个步骤：首先需要先注册 Service Worker，然后监听到 install 事件以后就可以缓存需要的文件，那么在下次用户访问的时候就可以通过拦截请求的方式查询是否存在缓存，存在缓存的话就可以直接读取缓存文件，否则就去请求数据。

当 Service Worker 没有命中缓存的时候，我们需要去调用 fetch 函数获取数据。也就是说，如果我们没有在 Service Worker 命中缓存的话，会根据缓存查找优先级去查找数据。但是不管我们是从 Memory Cache 中还是从网络请求中获取的数据，浏览器都会显示我们是从 Service Worker 中获取的内容。
2. memory cache:内存缓存，读取速度快
3. disk cache:磁盘缓存，读取速度慢点
4. push cache:Push Cache（推送缓存）是 HTTP/2 中的内容，当以上三种缓存都没有命中时，它才会被使用

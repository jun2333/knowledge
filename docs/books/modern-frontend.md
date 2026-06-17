# 现代前端技术解析

## Web前端技术基础

### 浏览器应用基础

#### 浏览器结构组成

浏览器主要由用户界面、网络、JavaScript引擎、渲染引擎、UI后端、JavaScript解释器、数据持久化存储七大部分组成

主流浏览器内核有四类：Trident(如IE)、Gecko(Firefox)、Presto(Opera)、Webkit(Chrome)

#### 浏览器渲染引擎简介

渲染过程：解析HTML构建DOM树->构建渲染树->渲染树布局阶段->绘制渲染树

以Webkit内核为例，HTML和CSS**同时**被解析，HTML被解析成DOM树，而CSS被解析为CSSOM；二者通过计算组合成渲染树(render tree)，然后经历布局(Layout)和绘制(Paint)过程，最终展示给用户。（Gecko内核则先解析HTML再解析CSS）

Reflow：又叫重排，是元素样式发生变化，重新布局绘制

Repaint：重绘，布局不变前提下，只需要重新绘制

#### 数据持久化

##### HTTP文件缓存

强缓存->协商缓存

##### localStorage

数据以键值对方式存储，持久存储，同域可访问，值为字符串类型；提供setItem、getItem、removeItem、clear四个函数操作数据

同域大小限制：IE->5MB Chrome/Safari->2.6MB

##### sessionStorage

和localStorage类似，只是关闭窗口之后数据将丢失，使用场景较少

##### Cookie

由键、值、域、过期时间和大小组成，不同浏览器有数量和长度限制，如IE7以上和Firefox最多支持50条，Chrome无限制；最大长度一般4096B。

##### WebSQL、IndexDB

小型数据库，提供一些数据操作的api进行数据库操作

##### Application Cache

离线缓存网页资源在客户端。

application cache通过manifest文件记录缓存资源清单，由此判断是否需要更新资源

application cache已被标准弃用，渐渐将被service worker取代。

##### Service Worker

cacheStorage是Service Worker规范定义的用于保存Cache对象，提供open()、match()、has()、delete()、keys()五个核心api方法，cacheStorage在浏览器端window对象下的全局内置对象caches。

Service Worker和Web Worker一样是浏览器后台作为一个独立线程运行JavaScript脚本，为浏览器提供并行计算和处理数据的能力，并通过message/postMessage方法与页面进行通信，但不能操作DOM。

#### 前端高效开发工具

##### 快速调试工具Chrome浏览器

F12打开控制台直接debug

模拟真实设备inspect查看功能

##### 网络辅助工具

fiddler：作为本地代理服务器将特定应用层网络请求拦截，模拟需要的不同场景

##### Node调试工具

使用node-inspector将代码传到浏览器端调试

##### 前端远程调试工具

vorlon工具，原理同node-inspetor类似

### 前端与协议

#### HTTP协议简介

##### HTTP1.1

- 长连接
- 协议扩展切换
- 缓存控制
- 部分内容传输优化

##### HTTP2

- 二进制传输数据
- TCP多路复用
- 传输流的优先级和流量控制机制
- 服务器推送

#### web安全机制

##### 基础安全知识

XSS、SQL注入、CSRF

##### 请求劫持与HTTPS

DNS劫持、HTTP劫持

HTTPS协议通信过程：SSL进行传输加密，CA认证

##### 浏览器web安全控制

X-XSS-Protection：防止反射性XSS攻击发生

Strict-Transport-Security：防止中间者攻击，强制使用HTTPS协议

Content-Security-Policy：指定资源加载域名，保证web运行在安全环境中

Access-Control-Allow-Origin：跨域资源共享配置

#### 前端实时协议

##### websocket通信机制

通过协议切换，upgrade:websocket，connection:upgrade将普通的http协议切换成websocket协议，两端通过sec-websocket-key进行验证身份

报文格式：FIN、扩展位、opcode、masked、payload、payload-length、masking-key

##### Poll&Long-poll

Poll：不断发起ajax请求询问服务器

Long-poll：设置较长的timeout时间，这样保持一次http请求能持续较长时间

#### RESTful数据协议规范

通过资源名定义uri，使用标准http方法对资源进行操作，如:

post:新增

get:查看

put:更新

delete:删除

#### 与Native交互协议

##### 注入:

native->web

native应用在移动端系统中注册一个Schema协议的URI，web端直接访问此URI完成交互

native应用通过addJavascriptInterface向webview全局作用域注入一个native的全局对象供前端调用

web->native

web端直接将javascript对象挂在全局对象中，native可以通过webview.loadUrl进行调用

##### JSBridge设计规范

原理：javascript调用prompt方法时，native会自动触发onJsPrompt的回调函数(安卓为例)

规范：定义协议串`jsbridge://className:callbackMethod/methodName?jsonObj`className->native类名；methodName->native方法名；callbackMethod->javascript回调函数名

通过webview提供一个JSBridge对象统一进行注册、调用等操作

```javascript
const JSBridge = {
    register(jsName, nativeClassName){
        //...
    },
    call(className, methodName, params, callback){
        let paramsStr = JSON.stringify(params)
        //组装uri
        let uri = `jsbridge://${className}:${allback)}/${methodName}?${paramsStr}`
        
        //发送给native
        try{
            sendToNative(uri)
        }catch(e){
            console.error(e)
        }
    }
}
function sendToNative(uri, params){
    window.prompt(uri, params)
}
```

## 前端三层结构与应用

#### HTML结构

##### DOCTYPE：声明文档类型DTD，告诉浏览器将用何种文档模式进行解析

- HTML 4.0.1有两种，严格模式和宽松模式
- HTML5 `<!DOCTYPE html>`

##### 语义化标签

HTML5新增header,nav,article,section,footer等结构语义化标签

列表要用ul/ol不要用div标签

##### HTML糟糕部分

table标签性能差，渲染较慢

错误的html或者css浏览器不会报错

##### AMP HTML规范

流动网页提速(Accelerated Mobile Pages)是google推行的一个提升页面资源载入效率的HTML提议规范。

基本思路：1.使用高效标签 2.静态页面缓存技术提升静态资源性能和用户体验

如：img,video,audio,table,form等标签不建议直接使用，因为他们渲染比较慢或者会立即下载资源，占用下载线程；我们可以采取懒加载的方式去加载这些标签到HTML结构中。

##### Web Component

shadow DOM：如video标签里其实很多内容，只是被隐藏到shadow root(Shadow DOM的根节点)中

这类似于目前基于编译的组件

新版浏览器提供创建Shadow root的api结合Web Component进行组件封装，如下案例：

```html
<!DOCTYPE html>
<html>
    <head>
        <title></title>
        <link href="./image.html" />
    </head>
    <body>
        <x-image src="xxx.png"></x-image>
    </body>
</html>
```

#### JavaScript演进

ECMAScript5->CoffeeScript->ECMAScript6+->TypeScript

##### ES5:

1. JSON

2. 新增Object方法属性

   create、defineProperty、seal、freeze、getPrototypeOf、keys...

3. 新增Array方法属性

   indexOf、lastIndexOf、every、forEach、map、some、filter、reduce、reduceRight

4. 新增Function.prototype.bind()

5. 新增String.trim()、Date.now()、Date.toJSON()

##### ES6+：

1. let、const
2. 字符串模板
3. 解构赋值
4. 数组新特性
5. 箭头函数
6. rest操作符
7. 增强对象
8. 类
9. 模块化
10. 循环与迭代器
11. 生成器generator
12. 异步Promise
13. 集合类型Map、Set、WeakMap、WeakSet
14. proxy
15. Symbol
16. async/await
17. 幂指数操作符：**

##### TypeScript

强类型支持

Decorator装饰器特性

#### CSS基础




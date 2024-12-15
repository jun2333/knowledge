一.数组和链表的使用场景分别是什么？

数组在编译前申请固定内存，查询效率较高，插入删除效率较低。

数组应用场景：数据比较少；经常做的是按照序号访问数据元素

链表应用场景：对线性表的长度或者规模难以估计；频繁使用插入删除操作

二.排序算法了解多少？冒泡排序和快速排序的区别?

2.冒泡算法：

```javascript
function bubbleSort(arr){
    let len = arr.length
    for(let i=0;i<len;i++){
        for(let j=0;j<len-1-i;j++){
            if(arr[j]>arr[j+1]){
                let temp = arr[j]
                arr[j+1] = arr[j]
                arr[j] = temp
            }
        }
    }
}
```

3.快速排序

```javascript
function quickSort(arr){
    if(arr.length <= 1) return arr
    let len = arr.length
    let midIndex = Math.floor(len/2)
    let mid = arr[midIndex]
    let left = []
    let right = []
    for(let i=0;i<len;i++){
        if(arr[i]<mid) left.push(arr[i])
        else right.push(arr[i])
    }
    return quickSort(left).concat(quickSort(right))
}
```

三.背包问题??

四.浏览器缓存

五.深拷贝遇到的问题：

JSON序列化实现深拷贝的弊端：1.时间对象会序列化成字符串 2.RegExp、Error等实例化对象会转成空对象 3.function会丢失 4.NaN、Infinity/-Infinity会转成null

1. 需要兼容各种数据类型(如数组、Symbol、Set等)
2. 循环引用问题(用一个数组记录已拷贝的对象[{source:源对象,target:拷贝后对象}])
3. 使用递归可能造成爆栈

递归实现

```javascript
//存放已拷贝对象，用于循环引用检测
let objArr = []
function deepClone(obj){
    for(let ele of objArr){
        if(obj === item.source)	return ele.target
    }
    let newObj = {}//拷贝容器
    objArr.push({
        source:obj,
        target:newObj
    })
    Reflect.ownKeys(obj).forEach(key=>{
        if(obj.hasOwnProperty(key)){
            if(typeof obj[key] === 'object'){
            	newObj[key] = Object.prototype.toString(obj[key]) === '[object Array]'?	     		     Array.from(deepClone(obj[key]):deepClone(obj[key]
        	}else{
            	newObj[key] = obj[key]
        	}
        }
    })
    return newObj
}
```

迭代实现

```javascript
function cloneForce(obj){
    let uniqueArr = []//存放已拷贝的对象
    let root = {}
    let loopList = [{
        parent:root,
        key:undefined,
        data:obj
    }]
    while(loopList.length){
        const node = loopList.pop
        const parent = loopList.parent
        const key = loopList.key
        const data = loopList.data
        
        let res = parent
        if(typeof key !== 'undefined') res = parent[key] = {} 
        let uniqueData = find(uniqueArr,data)
        if(uniqueData){
            parent[key] = uniqueData.target
        }
        uniqueArr.push({
            source:data,
            target:res
        })
        Reflect.ownKeys(data).forEach(key=>{
            if(data.hasOwnProperty(key)){
                if(typeof data[key] === 'object'){
                    loopList.push({
                        parent:res,
                        key:key,
                        data:data[key]
                    })
                }else{
                    res[key] = data[key]
                }
            }
        })
        return root
    }
    function find(arr,o){
        for(let ele of arr){
            if(arr[ele].source === o) return arr[ele].target
        }
        return null
    }
}
```

六.http缓存头部信息

强缓存:expire、cache-control

协商缓存:响应头=>etag/last-modified   请求头=>if-none-matched/if-modified-since

七.vue与react区别

八.前端路由实现:hash/history

九.webpack运行原理

1.流程

2.理解Compiler和Compilation的功能

十.大文件上传问题

1.切片(等分)：

a.计算hash(requestIdleCallback、webworker、抽样计算:开头结尾切片+每个切片前中后取2个字节，拼接之后生成hash)

b.并发控制+重试机制

2.慢启动策略实现(调整chunk大小)

a.计算hash(抽样计算)

b.设置初始chunk，遍历上传，动态调整chunk大小(根据单次上传耗时进行计算)

十一.Websocket

1.握手过程：

Websocket握手过程建立在一次http请求中，客户端发起upgrade请求切换协议，关键请求头：connection,upgrade,origin,Sec-Websocket-Key；关键响应头：Sec-Websocket-Accept。响应状态码为101(标识连接成功)

Sec-Websocket-Key:随即16字节长序列的Base64编码

Sec-Websocket-Accept:将Sec-Websocket-Key的值(消除空白符)与唯一标识拼接后采用SHA-1编码，再进行Base64编码所得



2.数据传输(传输单位：frame=>数据帧)

数据帧格式：

1.fin:标识是否为最后一帧(0/1)

2.rsv1-3:默认为0；用于扩展而定义。

3.opcode:操作码，定义该数据是什么，若不为定义内的值则连接中断，占4为；可表示0-15十进制或者一个十六进制

4.masked:指明payload data是否被计算为掩码

5.payload length:payload data长度

6.masking key:用于解析掩码处理后的数据(当masked为1时才存在)

7.payload data:数据



3.心跳检测(根据规范收到ping消息后，pong消息会自动发送)

使用场景：客户端网络关闭后服务器无感知，这样会造成多余的连接，服务器继续给客户端传输数据，造成数据丢失

用一个变量标记客户端状态，定时去检测客户端状态，若为false则主动关闭，避免资源浪费

```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);
```

十二.jwt实现原理

token分为三部分:header、payload、sign

header包括：type、加密算法、当前时间

payload：用户id等信息

sign：将header和payload通过base64编码后拼接起来，再用sha-256加密，最后base64编码，得到sign

token = header.payload.sign

校验：通过比对sign监测header.payload信息是否被篡改，再对头部的时间进行活期判断，都通过的话返回正确的userid
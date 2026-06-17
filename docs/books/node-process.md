## 多进程设计

#### 共享端口问题

主进程建立tcp服务，暴露端口后将句柄发送给子进程，子进程直接发送给各自http服务处理请求

通过句柄的文件描述符和类型还原socket进行以供子进程进行复用，文件描述符相同因此可以实现共用端口

#### 平滑自动重启

1. 子进程监听未捕获错误，先向主进程发出“自杀”信号(通知主进程新建一个子进程)，再关闭连接
2. 频繁重启控制

具体代码如下：

master.js

```javascript
const net = require('net');
const cp = require('child_process');
const cpus = require('os').cpus();
const server = net.createServer();
server.listen(8000);
const childs = {};
let restarts = [];
const limit = 10;
const during = 60000;
const isTooFrequent = () => {
    restarts.push(Date.now());
    if (restarts.length > limit) {
        restarts = restarts.splice(limit * -1);
    }
    //当重启数量大于10次的时候，这十次之间的时间间隔不超过60s
    return (
        restarts.length >= limit &&
        restarts[restarts.length - 1] - restarts[0] < during
    );
};
const createChild = () => {
    if (isTooFrequent()) {
        console.log('重启太频繁')
        return;
    }
    const child = cp.fork('./app.js');
    console.log(child.pid);
    child.on('message', msg => {
        if (msg.act === 'suicide') {
            createChild();
        }
    });
    child.send('server', server);
    childs[child.pid] = child;
};
for (let i = 0; i < cpus.length; i++) {
    createChild();
}

process.on('exit', function () {
    for (let key in childs) {
        childs[key].kill();
    }
});

```

app.js

```javascript
const http = require('http');

const app = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-type': 'text/plain' });
    let str = `handled by child, pid is ${process.pid}`;
    console.log(str);
    if (Math.random() > 0.5) {
        throw Error('异常');
    }
    res.end(str);
});
let worker;
process.on('message', (msg, tcp) => {
    if (msg === 'server') {
        worker = tcp;
        worker.on('connection', function (socket) {
            app.emit('connection', socket);
        });
    }
});

process.on('uncaughtException', function (err) {
    console.error(err); //日志记录
    process.send({ act: 'suicide' }); //自杀信号
    worker.close(function () {
        process.exit(1);
    });
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

```

#### 负载均衡

轮叫调度：处理第i个请求取i%n，n为进程数
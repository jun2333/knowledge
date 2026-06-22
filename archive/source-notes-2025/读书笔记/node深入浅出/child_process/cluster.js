const cluster = require('cluster');
const cpus = require('os').cpus();
const http = require('http');
if (cluster.isMaster) {
    console.log(`主进程 ${process.pid} 正在运行`);
    for (let i = 0; i < cpus.length; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`工作进程 ${worker.process.pid} 已退出`);
    });
} else {
    http.createServer(function (req, res) {
        res.writeHead(200, { 'Content-type': 'text/plain' });
        console.log(`handled by child, pid is ${process.pid}`);
        res.end(`handled by child, pid is ${process.pid}`);
    }).listen(8000);
    console.log(`工作进程 ${process.pid} 已启动`);
}

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

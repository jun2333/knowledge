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

## 基本功能实现步骤
1. 得到文件，计算文件哈希值(取样计算、rIC、web worker、sync)，文件较大的话计算完整计算哈希值很耗时，建议按照一定算法取样计算
2. 带着文件哈希值询问服务器此文件是否存在，服务器返回是否存在和和已经上传的分片文件数组(检测断点)
3. 若文件已经存在则提示上传成功(秒传),否则进入第4步
4. 文件分片，计算每片文件的状态、formData、chunkName、hash等相关信息，并过滤出未上传的chunks
5. 并发控制上传(带失败重试机制)
6. 全部上传完毕发起合并请求，服务端将chunk文件合并
chunk info包含文件片的上传状态，可制作方块进度条，每个方块代表文件片的进度，提升用户体验

### 暂停/恢复和chunk进度条
暂停：将每个xhr对象存起来，暂停则遍历xhr数组调用abort函数即可取消请求
恢复：从上面第2步开始执行
进度条：监听xhr的onprogress事件，计算上传进度比例值存在chunk info里面

### 并发的设计
入参：上传列表urls、并发数max、重试次数retrys
内置一个函数start
max作为通道数，一次放max个请求出去，成功了就释放通道，失败了就重试(记录重试次数,若重试retrys次还是失败则记录上传失败)
```javascript
async function sendRequest(urls, max = 4, retrys = 3) {
    return new Promise((resolve, reject) => {
        const len = urls.length;
        console.log(urls);
        let idx = 0;
        let counter = 0;
        const retryArr = [];
        const start = async () => {
            // 有请求，有通道
            while (counter < len && max > 0) {
                max--; // 占用通道
                console.log(idx, 'start');
                const i = urls.findIndex(
                    v => v.status == Status.wait || v.status == Status.error
                ); // 等待或者error
                if (i < 0) return;
                urls[i].status = Status.uploading;
                const form = urls[i].form;
                const index = urls[i].index;
                if (typeof retryArr[index] == 'number') {
                    console.log(index, '开始重试');
                }
                request({
                    url: '/upload',
                    data: form,
                    onProgress: createProgresshandler(chunks.value[index]),
                    requestList: requestList.value,
                })
                    .then(() => {
                        urls[i].status = Status.done;
                        max++; // 释放通道
                        urls[counter].done = true;
                        counter++;
                        if (counter === len) {
                            resolve();
                        } else {
                            start();
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        console.log(urls);
                        // 初始值
                        urls[i].status = Status.error;
                        if (typeof retryArr[index] !== 'number') {
                            retryArr[index] = 0;
                        }
                        // 次数累加
                        retryArr[index]++;
                        // 一个请求报错3次的
                        if (retryArr[index] >= retrys) {
                            return reject(); // 考虑abort所有别的请求
                        }
                        console.log(index, retryArr[index], '次报错');
                        // 3次报错以内的 重启
                        chunks.value[index].progress = -1; // 报错的进度条
                        max++; // 释放当前占用的通道，但是counter不累加

                        start();
                    });
            }
        };
        start();
    });
}
```

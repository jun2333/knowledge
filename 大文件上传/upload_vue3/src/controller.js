import { container, chunks, Status, status, requestList } from './appData';
import { verify, mergeRequest } from './api';
import { request } from './api/request';
import SparkMD5 from 'spark-md5';
const SIZE = 0.2 * 1024 * 1024;

async function handleUpload() {
    if (!container.file) return;
    status.value = Status.uploading;
    const cks = createFileChunk(container.file);
    console.log(cks);
    // 计算哈希
    // container.hash = await calculateHashSync(cks)
    console.time('samplehash');
    // 这样抽样，大概1个G1秒，如果还嫌慢，可以考虑分片+web-worker的方式
    // 这种方式偶尔会误判 不过大题效率不错
    // 可以考虑和全部的hash配合，因为samplehash不存在，就一定不存在，存在才有可能误判，有点像布隆过滤器
    container.hash = await calculateHashSample();
    console.timeEnd('samplehash');

    console.log('hashSample', container.hash);

    // container.hash = await calculateHashIdle(cks);
    // console.log("hash2", container.hash);

    // container.hash = await calculateHash(cks);
    // console.log("hash3", container.hash);

    // 判断文件是否存在,如果不存在，获取已经上传的切片
    const { uploaded, uploadedList } = await verify(
        container.file.name,
        container.hash
    );

    if (uploaded) {
        return console.log('秒传:上传成功');
        // return $message.success('秒传:上传成功');
    }
    console.log(chunks.value);
    chunks.value = cks.map((chunk, index) => {
        const chunkName = container.hash + '-' + index;
        return {
            fileHash: container.hash,
            chunk: chunk.file,
            index,
            hash: chunkName,
            progress: uploadedList.indexOf(chunkName) > -1 ? 100 : 0,
            size: chunk.file.size,
        };
    });
    // 传入已经存在的切片清单
    await uploadChunks(uploadedList);
}
async function uploadChunks(uploadedList = []) {
    // 这里一起上传，碰见大文件就是灾难
    // 没被hash计算打到，被一次性的tcp链接把浏览器搞挂了
    // 异步并发控制策略，我记得这个也是头条一个面试题
    // 比如并发量控制成4
    const list = chunks.value
        .filter(chunk => uploadedList.indexOf(chunk.hash) == -1)
        .map(({ chunk, hash, index }) => {
            const form = new FormData();
            form.append('chunk', chunk);
            form.append('hash', hash);
            form.append('filename', container.file.name);
            form.append('fileHash', container.hash);
            return { form, index, status: Status.wait };
        });
    try {
        list.length > 0 ? await sendRequest(list, 4) : '';
        if (uploadedList.length + list.length === chunks.value.length) {
            // 上传和已经存在之和 等于全部的再合并
            await mergeRequest(container.file.name, SIZE, container.hash);
        }
    } catch (e) {
        // 上传有被reject的
         $message.error('亲 上传失败了,考虑重试下呦');
    }
}
function createFileChunk(file, size = SIZE) {
    // 生成文件块
    const chunks = [];
    let cur = 0;
    while (cur < file.size) {
        chunks.push({ file: file.slice(cur, cur + size) });
        cur += size;
    }
    return chunks;
}
function calculateHashSample() {
    return new Promise(resolve => {
        const spark = new SparkMD5.ArrayBuffer();
        const reader = new FileReader();
        const file = container.file;
        // 文件大小
        const size = container.file.size;
        let offset = 2 * 1024 * 1024;

        let chunks = [file.slice(0, offset)];

        // 前面100K

        let cur = offset;
        while (cur < size) {
            // 最后一块全部加进来
            if (cur + offset >= size) {
                chunks.push(file.slice(cur, cur + offset));
            } else {
                // 中间的 前中后取两个字节
                const mid = cur + offset / 2;
                const end = cur + offset;
                chunks.push(file.slice(cur, cur + 2));
                chunks.push(file.slice(mid, mid + 2));
                chunks.push(file.slice(end - 2, end));
            }
            // 前取两个字节
            cur += offset;
        }
        // 拼接
        reader.readAsArrayBuffer(new Blob(chunks));

        // 最后100K
        reader.onload = e => {
            spark.append(e.target.result);

            resolve(spark.end());
        };
    });
}

async function handleResume() {
    status.value = Status.uploading;

    const { uploadedList } = await verify(container.file.name, container.hash);
    await uploadChunks(uploadedList);
}

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
                            return reject(); // 考虑abort所有别的
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
function createProgresshandler(item) {
    return e => {
        item.progress = parseInt(String((e.loaded / e.total) * 100));
    };
}

export { handleUpload, handleResume };

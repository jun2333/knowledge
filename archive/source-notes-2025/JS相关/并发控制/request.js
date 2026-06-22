//并发控制
function request(reqArr, num = 4, retryCount = 3) {
    return new Promise((resolve, reject) => {
        const len = reqArr.length;
        const sucCount = 0;
        const max = num;
        const index = 0;
        const retryArr = [];
        const start = () => {
            while (sucCount < len && max > 0) {
                max--;
                const i = reqArr.find((v) => v.status !== "success");
                const form = reqArr[i].data;
                if (typeof retryArr[index] === "number") {
                    console.log("重试开始");
                }
                ajax({
                    url: "upload",
                    data: form,
                })
                    .then((res) => {
                        sucCount++;
                        reqArr[index].status = "success";

                        if (sucCount === len) {
                            resolve();
                        } else {
                            start();
                        }
                    })
                    .catch((err) => {
                        reqArr[index].status = "error";
                        if (typeof retryArr[index] !== "number") {
                            retryArr[index] = 0;
                        }
                        retryArr[index]++;
                        if (retryArr[index] >= retryCount) {
                            return reject();
                        }
                        start();
                    })
                    .finally(() => {
                        max++;
                    });
            }
        };
    });
}

function ajax() {
    //ajax相关封装 return promise
}

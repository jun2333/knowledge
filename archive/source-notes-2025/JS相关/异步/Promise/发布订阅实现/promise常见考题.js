const a = () => {//考察then回调return一个promise
    Promise.resolve(1)
        .then(res => {
            console.log(res);
            return 2;
        })
        .catch(e => {
            console.log(3);
        })
        .then(res => {
            console.log(res);
        });
};
// a()
const b = () => {//考察promise的状态
    const promise1 = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('success');
        }, 1000);
    });
    const promise2 = promise1.then(() => {
        throw Error('error~');
    });
    console.log('promise1', promise1); // 打印pending的Promise
    console.log('promise2', promise2); // 打印pending的Promise
    setTimeout(() => {
        console.log('promise1', promise1); // 打印fulfilled的Promise
        console.log('promise2', promise2); // 打印rejected的Promise
    }, 2000);
};
// b()
const c = () => {//promise之间先then先执行
    setTimeout(() => {
        console.log(5);
    }, 0);
    new Promise((resolve, reject) => {
        console.log(1);
        resolve(3);
        Promise.resolve(4).then(res => {
            console.log(res);
        });
    }).then(res => {
        console.log(res);
    });
    console.log(2);
}; // 依次打印 1 2 4 3 5
// c();
const d = () => {//考察状态fulfilled后无法变更
    new Promise((resolve, reject) => {
        resolve(1);
        reject(2);
        resolve(3);
    })
        .then(res => {
            console.log(res); // 打印1
        })
        .catch(err => {
            console.log(err); // 未执行
        });
};
// d();
const e = () => { // 同时被执行
    const promise = new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('once');
            resolve('success');
        }, 1000);
    });
    const start = Date.now();
    promise.then(res => {
        console.log(res, Date.now() - start);
    });
    promise.then(res => {
        console.log(res, Date.now() - start);
    });
};
// e()
const f = () => {//区分throw Error和Error
    Promise.resolve('success')
        .then(res => {
            console.log(res);
            return Error('error');
        })
        .then(res => {
            console.log('then2', res);
        })
        .catch(err => {
            console.log('错误', err);
        });
};
// f();
const g = () => {
    const promise = Promise.resolve().then(() => promise); //此处会抛出promise链环错误
    promise.catch(console.error); //捕获异常
};
// g()
const h = () => {
    Promise.resolve(1).then(2).then(Promise.resolve(3)).then(console.log); //传递非函数参数会忽略
};
// h();
const i = () => {
    Promise.resolve()
        .then(
            res => {
                throw Error('err');
            },
            err => {
                //then的第二个参数回调无法捕获第一个参数回调的错误，建议链式写法
                console.log(err);
            }
        )
        .catch(console.error);
    //变种
    Promise.resolve()
        .then(
            res => {
                throw Error('err');
            },
            err => {
                console.log(err);
            }
        )
        .then(
            () => {},
            err => {
                console.log('捕获', err);
            }
        );
};
// i();
const j = () => {
    //考察node事件循环
    process.nextTick(() => {
        console.log('nextTick');//2 idle过程
    });
    Promise.resolve().then(() => {
        console.log('promise');//3 微任务
    });
    setImmediate(() => {
        console.log('setImmediate');//4 check setImmidiate
    });
    console.log('end');//1
};
// j()
const k = () => {
    const first = () => {
        return new Promise((resolve, reject) => {
            console.log(3); //1
            let p = new Promise((resolve, reject) => {
                console.log(7);//2
                setTimeout(() => {
                    console.log(5);//6
                    resolve(6);
                }, 0);
                resolve(1);
            });
            resolve(2);
            p.then(arg => {
                console.log(arg);//4
            });
        });
    };

    first().then(arg => {
        console.log(arg);//5
    });
    console.log(4);//3
}; // 3 7 4 1 2 5
// k()
const l = () => {
    const p = Promise.reject('err');
    p.catch(console.log).catch(() => {
        console.log('catch2');
    });
    p.catch(console.log);
}; // catch2不会被打印
// l();
const m = () => {//难度系数最大
    async function async1() {
        console.log(1); // 同步1
        await async2(); //await阻塞执行栈，await后面的代码推入微任务队列
        console.log(3); // 微任务2
    }
    async function async2() {
        console.log(2); // 被async同步执行，同步2
    }
    Promise.resolve().then(() => { // 微任务1
        console.log(4);
    });
    setTimeout(() => {
        console.log(5); // 宏任务1
    });
    async1();
    console.log(6); // 同步3
}; // 1 2 6 4 3 5
// 1,2,6是同步代码；4,3是微任务队列；5是宏任务队列
// m();

// const p = Promise.resolve();
// (async () => {
//     await p;
//     console.log('await end');
// })();
// p.then(() => {
//     console.log('then 1');
// }).then(() => {
//     console.log('then 2');
// });
// await end, then 1, then2

const p = Promise.resolve();
p.then(() => {
    console.log('then 1'); // 微任务1
}).then(() => {
    console.log('then 2'); // 微任务3
});
(async () => {
    await p;
    console.log('await end'); // 微任务2
})();
// then 1,  await end, then 2


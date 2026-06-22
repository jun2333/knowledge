// 定义Promise的 3 种状态
var PENDING = "pending";
var FULFILLED = "fulfilled";
var REJECTED = "rejected";

// Promise 构造函数
function Promise(execute) {
  var that = this;
  that.state = PENDING; // 状态初始化

  that.value = undefined; // 成功结果 放在this上便于then访问
  that.reason = undefined; // 失败结果 放在this上便于catch访问

  that.onFulfilledFn = []; // 已兑现回调队列
  that.onRejectedFn = []; // 已拒绝回调队列

  // 这里用 setTimeout 是为了模仿异步微任务，真正的微任务只有通过浏览器底层才可以调用
  function resolve(value) {
    setTimeout(function() {
      if (that.state === PENDING) {
        that.state = FULFILLED;
        // 为了后面在 then 的回调中可以得到 resolve 传递的参数,将其保存在构造函数里。
        that.value = value;
        // 此时 onFulfilledFn 还是空的又怎么执行里面的回调呢？
        // 大家注意看这里我们采用的 setTimeout 异步任务，
        // 虽然没有延时时间但在执行时其还是会被放在宏任务队列里，等待同步任务执行完再执行
        that.onFulfilledFn.forEach(function(f) {
          f(that.value);
        });
      }
    });
  }

  function reject(reason) {
    setTimeout(function() {
      if (that.state === PENDING) {
        that.state = REJECTED;
        that.reason = reason;
        that.onRejectedFn.forEach(function(f) {
          f(that.reason);
        });
      }
    });
  }

  try {
    // 把内部的 resolve 和 reject 传入 executor，用户可调用 resolve 和 reject
    execute(resolve, reject);
  } catch (e) {
    reject(e);
  }
}

// 原型属性(方法) then
Promise.prototype.then = function(onFulfilled, onRejected) {
  onFulfilled =
    typeof onFulfilled === "function"
      ? onFulfilled
      : function(x) {
          return x;
        };
  onRejected =
    typeof onRejected === "function"
      ? onRejected
      : function(e) {
          throw e;
        };
  var that = this;
  var promise;
  if (that.state === FULFILLED) {
    promise = new Promise(function(resolve, reject) {
      setTimeout(function() {
        // onFulfilled有可能执行失败
        try {
          // 判断x返回的是不是一个promise
          var x = onFulfilled(that.value);
          resolvePromise(promise, x, resolve, reject);
        } catch (reason) {
          reject(reason);
        }
      });
    });
  }
  if (that.state === REJECTED) {
    promise = new Promise(function(resolve, reject) {
      setTimeout(function() {
        try {
          var x = onRejected(that.reason);
          resolvePromise(promise, x, resolve, reject);
        } catch (reason) {
          reject(reason);
        }
      });
    });
  }
  if (that.state === PENDING) {
    promise = new Promise(function(resolve, reject) {
      that.onFulfilledFn.push(function() {
        try {
          var x = onFulfilled(that.value);
          resolvePromise(promise, x, resolve, reject);
        } catch (reason) {
          reject(reason);
        }
      });
      that.onRejectedFn.push(function() {
        try {
          var x = onRejected(that.reason);
          resolvePromise(promise, x, resolve, reject);
        } catch (reason) {
          reject(reason);
        }
      });
    });
  }
  return promise;
};

// 实现关键：
// 回调函数返回值分四种情况： 
// 1. 与返回then返回的Promise是同一个实例->报错
// 2. Promise实例->看Promise状态处理(fulfilled->resolve rejected->reject pending->封装一个then回调将promise.value继续resolve)
// 3. 对象类型或者函数，有then接口->调用then函数,传入封装的两个then的回调函数，一个处理value一个处理错误；若无then接口则直接resolve
// 4. 直接resolve
function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    return reject(new TypeError("x 不能与 promise 相等"));
  }
  if (x instanceof Promise) {
    if (x.state === FULFILLED) {
      resolve(x.value);
    } else if (x.state === REJECTED) {
      reject(x.reason);
    } else {
      x.then(function(y) { // 等x状态变了之后把x.value值透传给resolvePromise继续处理
        resolvePromise(promise, y, resolve, reject);
      }, reject);
    }
  } else if (x !== null && (typeof x === "object" || typeof x === "function")) {
    var executed;
    try {
      var then = x.then;
      if (typeof then === "function") { // 对象和函数配置了then接口
        then.call(
          x,
          function(y) {
            if (executed) return;
            executed = true;
            resolvePromise(promise, y, resolve, reject);
          },
          function(e) {
            if (executed) return;
            executed = true;
            reject(e);
          }
        );
      } else {
        resolve(x);
      }
    } catch (e) {
      if (executed) return;
      executed = true;
      reject(e);
    }
  } else {
    resolve(x);
  }
}

module.exports = {
  deferred() {
    var resolve;
    var reject;
    var promise = new Promise(function(res, rej) {
      resolve = res;
      reject = rej;
    });
    return {
      promise,
      resolve,
      reject
    };
  }
};

// 静态方法 resolve
Promise.resolve = function(value) {
  if (value instanceof Promise) {
    return value; // 如果是Promise实例直接返回
  }

  return new Promise(function(resolve, reject) {
    resolve(value);
  });
};

// 静态方法 reject
Promise.reject = function(reason) {
  return new Promise(function(resolve, reject) {
    reject(reason);
  });
};

// 原型属性(方法) catch
Promise.prototype.catch = function(onRejected) {
  return this.then(null, onRejected);
};

// 原型属性(方法) finally
Promise.prototype.finally = function(fn) {
  return this.then(
    function(value) {
      return Promise.resolve(fn()).then(function() {
        return value;
      });
    },
    function(error) {
      return Promise.resolve(fn()).then(function() {
        throw error;
      });
    }
  );
};

// 静态方法 all
Promise.all = function(promiseArr) {
  return new Promise(function(resolve, reject) {
    const length = promiseArr.length;
    const result = [];
    let count = 0;
    if (length === 0) {
      return resolve(result);
    }
    // promiseArr 不一定是数组，可以是任何迭代器，所以用for...of更好
    for (let [i, p] of promiseArr.entries()) {
      // 这里不直接promiseArr[i].then是为了防止传入的不是Promsie对象的情况
      Promise.resolve(p).then(
        function(data) {
          result[i] = data;
          count++;
          if (count === length) {
            resolve(result);
          }
        },
        function(reason) {
          reject(reason);
        }
      );
    }
  });
};

// 静态方法 race
Promise.race = function(promiseArr) {
  return new Promise(function(resolve, reject) {
    const length = promiseArr.length;
    if (length === 0) {
      return resolve();
    }

    for (let item of promiseArr) {
      Promise.resolve(item).then(
        function(value) {
          return resolve(value);
        },
        function(reason) {
          return reject(reason);
        }
      );
    }
  });
};

// 静态方法 any
Promise.any = function(promiseArr) {
  return new Promise(function(resolve, reject) {
    const length = promiseArr.length;
    const result = [];
    let count = 0;
    if (length === 0) {
      return resolve(result);
    }

    for (let [i, p] of promiseArr.entries()) {
      Promise.resolve(p).then(
        value => {
          return resolve(value);
        },
        reason => {
          result[i] = reason;
          count++;
          if (count === length) {
            reject(result);
          }
        }
      );
    }
  });
};

// 静态方法 allSettled
Promise.allSettled = function(promiseArr) {
  return new Promise(function(resolve) {
    const length = promiseArr.length;
    const result = [];
    let count = 0;

    if (length === 0) {
      return resolve(result);
    } else {
      for (let [i, p] of promiseArr.entries()) {
        Promise.resolve(p).then(
          value => {
            result[i] = { status: "fulfilled", value: value };
            count++;
            if (count === length) {
              return resolve(result);
            }
          },
          reason => {
            result[i] = { status: "rejected", reason: reason };
            count++;
            if (count === length) {
              return resolve(result);
            }
          }
        );
      }
    }
  });
};

// 使用 Promise.finally 实现 Promise.allSettled
Promise.allSettled = function(promises) {
  // 也可以使用扩展运算符将 Iterator 转换成数组
  // const promiseArr = [...promises];
  const promiseArr = Array.from(promises);
  return new Promise(resolve => {
    const result = [];
    const len = promiseArr.length;
    let count = len;
    if (len === 0) {
      return resolve(result);
    }
    for (let i = 0; i < len; i++) {
      promiseArr[i]
        .then(
          value => {
            result[i] = { status: "fulfilled", value: value };
          },
          reason => {
            result[i] = { status: "rejected", reason: reason };
          }
        )
        .finally(() => {
          if (!--count) {
            resolve(result);
          }
        });
    }
  });
};

// 使用 Promise.all 实现 Promise.allSettled
// 里面包裹一层Promise吃掉错误，不往外抛，使得Promise.all都是正常返回
Promise.allSettled = function(promises) {
  // 也可以使用扩展运算符将 Iterator 转换成数组
  // const promiseArr = [...promises];
  const promiseArr = Array.from(promises);
  return Promise.all(
    promiseArr.map(p =>
      Promise.resolve(p).then( // 这一步是关键
        res => {
          return { status: "fulfilled", value: res };
        },
        error => {
          return { status: "rejected", reason: error };
        }
      )
    )
  );
};
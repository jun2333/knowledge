/*
 * 基于事件发布订阅模式的promise/deferred实现
 */
const EventEmitter = require('events');
class Promise extends EventEmitter {
    constructor() {
        super();
        this.status = 'unfulfilled';
    }
    then(fulfilledHandler, progressHandler) {
        if (typeof fulfilledHandler === 'function') {
            this.once('fulfilled', fulfilledHandler);
        }
        if (typeof progressHandler === 'function') {
            this.once('progress', progressHandler);
        }
        return this;
    }
    catch(failedHandler) {
        if (typeof failedHandler === 'function') {
            this.once('failed', failedHandler);
        }
        return this;
    }
}

class Deferred {
    constructor() {
        this.resolveArr = [];
        this.state = 'unfulfilled';
        this.promise = new Promise();
    }
    resolve(data) {
        this.state = this.promise.status = 'fulfilled';
        this.promise.emit('fulfilled', data);
    }
    reject(err) {
        this.state = this.promise.status = 'failed';
        this.promise.emit('failed', err);
    }
    progress(data) {
        this.state = this.promise.status = 'progress';
        this.promise.emit('progress', data);
    }
    //生成回调函数
    callback() {
        return (err, data) => {
            if (err) {
                return this.reject(err);
            }
            // this.resolveArr.push(data)
            this.resolve(data);
        };
    }
    prmisify(func) {
        const vm = this;
        return function () {
            const args = Array.from(arguments);
            func(...args, vm.callback());
            return vm.promise;
        };
    }
    static all(funcArr) {
        const promise = new Promise();
        for (let i = 0; i < funcArr.length; i++) {
            if (funcArr[i] === 'failed') {
                promise.status = 'failed';
                return promise;
            }
            promise.status = 'fulfilled';
        }
        return promise;
    }
}

module.exports = Deferred;

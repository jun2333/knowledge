## 实现一个lazyMan

```javascript
/* 
 * 需求：定义一个lazyMan函数，实现链式调用,如:lazyMan('name').sleep(2).eat('apple').firstSleep(1)  要求firstSleep在最前面执行
 * 利用队列存储消息
 * 采用链式调用，setTimeout宏任务发布
*/

class LazyMan{
    stackList = []
    //带#号的为私有方法
    #describe() {
        if (arguments.length < 1) throw new Error("至少需要一个参数");
        let option = {};
        const args = Array.from(arguments);
        option.msg = args[0];
        option.args = args.slice(1);
        if (option.msg === "firstSleep") {
            this.stackList.unshift(option);
        } else {
            this.stackList.push(option);
        }
    }
    #publish() {
        if (this.stackList.length > 0) {
            this.#run(this.stackList.shift());
        }
    }
    #run(opt) {
        const { msg, args } = opt;
        switch (msg) {
            case "lazyMan":
                this.#lazyMan.apply(this, args);
                break;
            case "eat":
                this.#eat.apply(this, args);
                break;
            case "sleep":
                this.#sleep.apply(this, args);
                break;
            case "firstSleep":
                this.#firstSleep.apply(this, args);
                break;
            default:
        }
    }
    #eat(str) {
        console.log(`Eat ${str} ~`);
        this.#publish();
    }
    #sleep(num) {
        setTimeout(() => {
            console.log(`Wake up after ${num}`);
            this.#publish();
        }, num * 1000);
    }
    #firstSleep(num) {
        setTimeout(() => {
            console.log(`Wake up after ${num}`);
            this.#publish();
        }, num * 1000);
    }
    #lazyMan(str) {
        console.log(`Hi!This is ${str}`);
        this.#publish();
    }
    constructor(fnName, str){
        this.#describe(fnName, str)
        setTimeout(()=>{
            this.#publish()
        },0)
    }
    eat(str){
        this.#describe("eat", str);
        return this;
    }
    sleep(num) {
        this.#describe("sleep", num);
        return this;
    }
    firstSleep(num) {
        this.#describe("firstSleep", num);
        return this;
    }
	//暴露发布方法
    pub(){
        this.#publish()
    }
}
//IIFE
void function(win){
    win.lazyMan = function(str){
        return new LazyMan('lazyMan',str)
    }
}(window)

lazyMan('junjun')
```


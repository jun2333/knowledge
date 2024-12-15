## 函数分类和this

#### 函数分类

1.普通函数（function关键字声明）

2.箭头函数

3.方法

4.类

5.生成器函数

6.异步函数(async)

#### this:上下文

##### 切换上下文

1.在函数执行时，会根据函数的引用确定上下文，即：调用函数时使用的引用，决定了this的值

2.箭头函数无法改变上下文，this一直指向声明时的上下文

##### this机制

javascript使用栈来维护上下文，栈的每一项是一个链表；执行函数的时候会入栈一个新的上下文

<img src="https://static001.geekbang.org/resource/image/e8/31/e8d8e96c983a832eb646d6c17ff3df31.jpg" alt="img" style="zoom: 67%;" />

而 this 则是一个更为复杂的机制，JavaScript 标准定义了 [[thisMode]] 私有属性。[[thisMode]] 私有属性有三个取值。

- lexical：表示从上下文中找 this，这对应了箭头函数。
- global：表示当 this 为 undefined 时，取全局对象，对应了普通函数。
- strict：当严格模式时使用，this 严格按照调用时传入的值，可能为 null 或者 undefined。

类的实现使用的是strict模式，因此方法的this行为与普通函数不太一样

```javascript
class b{
    logThis(){
        console.log(this)
    }
}
var ins = new b()
var log = ins.logThis
log()//undefined
```

#### 切换this的内置函数：call、apply、bind

无法作用于箭头函数，但不会报错，至少可以传参

#### 函数与new搭配

<img src="https://static001.geekbang.org/resource/image/6a/da/6a9f0525b713a903c6c94f52afaea3da.png" alt="img" style="zoom: 67%;" />
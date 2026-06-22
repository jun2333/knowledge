## 作用域和闭包

#### 作用域是什么

作用域是一套规则，用于确定在何处以及如何查找变量。查询分为RHS查询和LHS查询。

如果查找的目的是对变量进行赋值，那么会使用LHS查询；如果目的是获取变量的值，就会使用RHS查询。

LHS和RHS查询都会在当前执行作用域开始查询，如果没查到会向上级作用域继续查询，一层一层查询直至顶层后停止，若还是没查到则抛出异常。

#### 词法作用域

词法作用域意味着作用域由于书写代码时函数声明的位置来决定的。编译的词法分析阶段基本能知道全部标识符在哪里以及如何声明的，从而能够预测在执行过程中如何对他们进行查找。

js中有两个机制可以欺骗词法作用域：eval(..)和with。

这两个机制的副作用是引擎无法在编译时对作用域查找进行优化，因此这其中任何一个机制都会使代码变慢。不要使用它们~

#### 函数作用域和块作用域

隐藏的必要性：1.遵循"最小暴露"原则 2.避免命名冲突

##### 函数作用域：

立即执行匿名函数

好处：1.不污染所在作用域 2.自执行

匿名函数缺陷：

1.匿名函数调试困难 2.递归麻烦，需要arguments.callee引用 3.代码可读性差

最佳实践：立即执行函数表达式（IIFE）+ 函数名

##### 块作用域

函数不是唯一的作用域单元，还有块。

with结构、ES3引入try/catch中的catch分句、ES6中的let/const劫持块内变量

#### 提升

声明和赋值是两个阶段，编译阶段和执行阶段。编译阶段会将声明的变量"移动"到各自作用域的最顶端，这个过程叫提升。使用var声明变量和函数声明都会提升。

#### 作用域闭包

闭包：闭包是一个引用，是函数对其词法作用域的一个引用；其表现为：函数能访问并记住其词法作用域，即便在外部作用域运行

例子1：经典

```javascript
function foo(){
    var a = 0;
    return function(){
        a++;
        console.log(a)
    }
}
var baz = foo();
baz();//1
```

例子2：setTimeout

```javascript
function lazy(info){
    setTimeout(()=>{
        console.log(info)
    })
}
lazy('hh')//info被setTimeout所在词法作用域引用
```

例子3：闭包与循环

```javascript
//依次打印0 1 2 3 4
for(var i = 0; i < 5; i++){
    setTimeout(()=>{
        console.log(i)
    },i*1000)
}
//上例子由于js运行机制无法达到目的
//改良版
for(var i = 0; i < 5; i++){
    (function(j){
        setTimeout(()=>{
        	console.log(j)
    	},j*1000)
    })(i)
}
```

#### 闭包的应用有哪些？闭包无处不在

只要有回调函数的地方就可能存在闭包，将函数作为参数传入其他函数中，作为参数的函数会保持对其**词法作用域**的引用。

如：IIFE、定时器、事件监听器、ajax、跨窗口通信、Web Workers等等

#### 模块

必要条件：

1.必须有外部的封闭函数，该函数必须至少被调用一次

2.封闭函数必须返回至少一个内部函数，内部函数在私有作用域形成闭包，可以访问或修改私有状态

##### 现代模块机制：（运行时解析模块）

```javascript
var MyModules = (function(){
    var modules = {}
    function define(name, deps, impl){
        for(var i=0; i<deps.length; i++){
            deps[i] = modules[deps[i]]
        }
        modules[name] = impl.apply(impl,deps)
    }
    function get(name){
        return modules[name]
    }
    return {
        define,
        get
    }
})()
```

##### 未来的模块机制（静态的，编译时完成）

import/export

##### 词法作用域vs动态作用域

词法作用域取关注函数声明的位置，而动态作用域更关注函数被调用的位置，javascript并不具备动态作用域，不过this机制在某种程度上很像动态作用域



## this和对象原型

#### this是什么？this的绑定和函数的声明位置没有任何关系，只取决于函数的调用方式，this是函数的执行上下文

两个误区：

1.this指向函数本身

2.this指向函数的作用域

#### this绑定规则（默认绑定、隐式绑定、显式绑定、new绑定）

##### 默认绑定

```javascript
//将全局对象进行默认绑定
var a = 'hello'
function foo(){
    console.log(this.a)
}
//tips:严格模式下不能将全局对象进行默认绑定
```

##### 隐式绑定（考虑调用位置是否有上下文对象）

```javascript
function foo(){
    console.log(this.a)
}
var obj = {
    a:'hello',
    foo:foo
}
obj.foo()//hello
```

对象引用链最近一层起作用，如：

```javascript
function foo(){
    console.log(this.a)
}
var obj1 = {
    a:'hello',
    foo:foo
}
var obj2 = {
    a:'hahha',
    obj1:obj1
}
obj2.obj1.foo()//hello
```

隐式丢失问题：隐式丢失会应用默认绑定，即绑定this到全局对象

```javascript
function foo(){
    console.log(this.a)
}
var obj = {
    a:'hello',
    foo:foo
}
var bar = obj.foo//赋值会导致隐式丢失，bar是obj.foo的一个引用，实际上它引用的是foo本身
var a = 'global'
bar()//global
```

函数传参本身也是一种隐式赋值，所以也会导致隐式丢失

```javascript
function foo(){
    console.log(this.a)
}
function doFoo(fn){
    fn()
}
var obj = {
    a:'hello',
    foo:foo
}
var a = 'global'
doFoo(obj.foo)//global
```

##### 显示绑定

利用call、apply、bind等进行强制绑定，也叫硬绑定；硬绑定后的函数无法再改变它的this！！

##### new绑定

1.创建一个全新对象

2.新对象会被执行[[prototype]]连接

3.新对象会绑定到函数调用的this

4.如果函数没有返回其他对象，那new表达式中的函数调用会自动返回这个新对象

```javascript
function newFn(fn){
    var newObj = Object.create(fn.prototype)
    var res = fn.call(newObj)
    if(typeof res !== 'object'){
        return newObj
    }else{
        return res
    }
}
```

##### 优先级：new>显示>隐式>默认

##### 被忽略的this

使用显式绑定时，第一个参数为null或者undefined时，会应用默认绑定

应用场景：

```javascript
function foo(a,b){
    console.log(a,b)
}
//1.数组展开成参数
foo.apply(null,[1,2])
//2.使用bind进行柯里化
var bar = foo.bind(null,2)
bar(3)//2,3
```

更安全的this，使用"DMZ"代替null，避免默认绑定，从而保护全局对象

```javascript
function foo(a,b){
    console.log(a,b)
}
var dmz = Object.create(null)
//1.数组展开成参数
foo.apply(dmz,[1,2])
//2.使用bind进行柯里化
var bar = foo.bind(dmz,2)
bar(3)//2,3
```

##### 间接引用

```javascript
//间接引用导致应用默认绑定
var a = 2
var o = {
    a:3,
    foo:foo
}
var p = {
    a:4,
    foo:foo
}
(p.foo = o.foo)()//2
```

##### es6箭头函数中的this不遵循四条绑定规则，而是根据当前词法作用域来决定，this会继承外层函数调用的this绑定



## 类和对象

#### 对象

##### 组成：属性和属性值(key:value)

##### 分类：普通对象、函数、数组

##### 属性描述符：数据描述符&访问描述符

**数据描述符**

value：属性的值

writable：是否可编辑

enumerable：是否可枚举

configurable：是否可配置属性描述符

**访问描述符(当存在访问描述符时会忽略value和writable)**

getter/setter

##### [[Get]]&[[Put]]操作

[[Get]]：检查当前对象是否存在属性，若无则顺着原型链往下寻找，若还是没找到则返回undefined

[[Put]]：

1. 检查是否存在访问描述符，若存在且有setter则执行setter函数
2. 检查writable属性是否为false，若是则在非严格模式下静默失败，严格模式TypeError错误
3. 若无1,2情况则正常赋值

##### 遍历(只遍历可枚举属性描述为true的属性)

for...in

Object.keys()、Object.values()、Object.entries()

##### 不可变

1. writable和configurable设置为false
2. 禁止扩展：Object.preventExtentions()
3. 密封：Object.seal  内部使用Object.preventExtentions()以及configurable设置false
4. 冻结：Object.freeze 内部使用Object.seal以及writable设置false

#### 类的设计模式

##### 面向对象(类)的设计模式的特点：封装、继承、多态

##### Javascript仿类与传统类设计模式的差别：

1. 类的实例化、继承等操作是基于复制；js实质上还是基于委托关联
2. 类是静态的，一经定义无法改变；js对象实际上是动态的，通过访问描述符可动态改变
3. js模仿类，丑陋的显式实现多态

##### class语法糖

规范了类的书写方式以及简化代码

不足：

1. 实质仍然基于委托关联
2. 无法定义类属性，只能定义方法
3. 继承过程中，super实现多态静态绑定，无法动态变更绑定关系

总结：由于终究还是模仿类，constructor、instanceof并不能按照类那样准确表示由谁构造，是谁的实例

#### 对象关联委托编写风格

```javascript
//对象关联委托编写风格
let loginController = {
    pwd: '',
    userPwd: '',
    setUserPwd(userPwd) {
        console.log(`userPwd:${userPwd}`);
        this.userPwd = userPwd;
    },
    setPwd(pwd) {
        console.log(`pwd:${pwd}`);
        this.pwd = pwd;
    },
};
let authController = {
    checkPwd() {
        if (this.pwd === this.userPwd) return true;
        else return false;
    },
};

Object.setPrototypeOf(authController, loginController); //将authcontroller关联loginController

let auth = Object.create(authController);

auth.setUserPwd('123123');
auth.setPwd(123123)
auth.checkPwd()//false
```


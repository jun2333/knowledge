## 作用域闭包

#### 什么是闭包？

闭包是一个引用，是函数对其词法作用域的一个引用；其表现为：函数能访问并记住其词法作用域，即便在外部作用域运行

```javascript
//最简单的闭包例子
function foo(){
    var a = 2
    return function bar(){
        console.log(a)
    }
}

var bar = foo()
bar()//2
```



#### 闭包的应用有哪些？闭包无处不在

只要有回调函数的地方就可能存在闭包，将函数作为参数传入其他函数中，作为参数的函数会保持对其**词法作用域**的引用。

如：IIFE、定时器、事件监听器、ajax、跨窗口通信、Web Workers等等

#### 闭包与循环

在循环中使用IIFE创建函数作用域，保持对循环中变量的引用，如：

```javascript
for(var i=-; i<5; i++){
    (function(j){//IIFE闭包引用i
        setTimeout(()=>{//定时器闭包引用j
            console.log(j)
        })
    })(i)
}
```



#### 现代模块机制

两个条件：

1. 为创建内部作用域调用一次包装函数
2. 包装函数调用至少返回一个内部函数(即存在闭包)

```javascript
var Module = (function(){
    var modules = {}
    function define(name, deps, fn){
        for(var i=0; i<dep.length; i++){
            deps.push(modules.dep[i])
        }
        modules.name = fn.apply(fn, deps)
    }
    function get(name){
        return modules.name
    }
    return {
        define,
        get
    }
})()
```


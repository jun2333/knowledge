#### 装箱转换类型

每一种基本类型 Number、String、Boolean、Symbol 在对象中都有对应的类，所谓装箱转换，正是把基本类型转换为对应的对象，它是类型转换中一种相当重要的种类。

```javascript
//通过call操作对基本类型进行装箱操作
var symbolObject = (function(){ return this; }).call(Symbol("a"));
console.log(typeof symbolObject); //object 
console.log(symbolObject instanceof Symbol); //true 
console.log(symbolObject.constructor == Symbol); //true
```



#### 拆箱转换类型

在 JavaScript 标准中，规定了 ToPrimitive 函数，它是对象类型到基本类型的转换（即，拆箱转换）。对象到 String 和 Number 的转换都遵循“先拆箱再转换”的规则。通过拆箱转换，把对象变成基本类型，再从基本类型转换为对应的 String 或者 Number。

Number转换对象时，先调用该对象的valueOf()方法，若返回还是对象，则调用toString()方法，若依旧是对象则报错；过程中若得到基本类型则直接用Number转换

String转换对象时，先调用该对象的toString()方法，若返回还是对象，则调用valueOf()方法，若依旧是对象则报错；过程中若得到基本类型则直接用String转换

在 ES6 之后，还允许对象通过显式指定 @@toPrimitive Symbol 来覆盖原有的行为

```javascript

    var o = {
        valueOf : () => {console.log("valueOf"); return {}},
        toString : () => {console.log("toString"); return {}}
    }

    o[Symbol.toPrimitive] = () => {console.log("toPrimitive"); return "hello"}


    console.log(o + "")
    // toPrimitive
    // hello
```


## 数组新增方法

#### 扩展运算符(...):只能用于具有iterate接口的对象或数组

将目标转成逗号分隔的内容

用途：1.代替apply传参 2.拼接数组(包括代替push/concat等方法) 3.解构赋值 4.可遍历对象转数组

#### Array.from():将两种情况：1.类数组 2.具有iterate接口的对象转为数组

接收第二个参数是回调函数，类似于map方法

#### Array.of():返回一个由参数组成的数组

### 实例方法:

#### [].fill():填充

参数：1.填充值 2.开始位置(默认0) 3.结束位置(默认数组长度)

#### [].copyWithin():复制制定位置到其他位置，会改变数组

参数：1.覆盖开始位置 2.复制开始位置(默认0) 3.复制结束位置(默认数组长度)

#### [].includes()

#### [].find()/[].findIndex()

#### [].keys()/[].values()/[].entries():返回一个可遍历对象

#### 空位的处理:

es5和es6对空格的处理不一致，尽量避免数组中出现空位

es5:forEach、filter、every、some会忽略空位，map会忽略空位但是会返回空位；join、toString会将undefined、null作为空位处理

es6:统一处理成undefined



## 对象的扩展

#### 1.属性简洁表示法

#### 2.属性名表达式

#### 3.方法的name属性

需要注意3个特殊情况，使用get/set的属性写法、bind方法创造的函数、Symbol属性名的方法

#### 4.属性的遍历

**（1）for...in**

`for...in`循环遍历对象自身的和继承的可枚举属性（不含 Symbol 属性）。

**（2）Object.keys(obj)**

`Object.keys`返回一个数组，包括对象自身的（不含继承的）所有可枚举属性（不含 Symbol 属性）的键名。

**（3）Object.getOwnPropertyNames(obj)**

`Object.getOwnPropertyNames`返回一个数组，包含对象自身的所有属性（不含 Symbol 属性，但是包括不可枚举属性）的键名。

**（4）Object.getOwnPropertySymbols(obj)**

`Object.getOwnPropertySymbols`返回一个数组，包含对象自身的所有 Symbol 属性的键名。

**（5）Reflect.ownKeys(obj)**

`Reflect.ownKeys`返回一个数组，包含对象自身的（不含继承的）所有键名，不管键名是 Symbol 或字符串，也不管是否可枚举。

#### 5.super关键字(指向原型属性,tips:只可用于简写的方法中)

#### 6.扩展运算符(注意：使用扩展运算符无法解构原型属性)

#### 7.链判断运算符(?)

#### 8.null判断运算符(??)

只适用于值为null或undefined



## 对象新增方法

#### Object.is():弥补==和===运算符的不足

#### Object.assign():对象的合并

注意点：

1.浅拷贝

2.同名属性替换，而不是添加

3.数组处理:转成对象再合并

4.取值函数不复制

#### Object.getOwnPropertyDescriptors(obj):返回该对象自身属性(非继承)的描述对象

对比:es5的Object.getOwnPropertyDescriptor(obj,key)返回对象指定属性的描述对象

作用：

1.弥补Object.assign()无法复制get/set函数定义的属性的不足

Object.defineProperties()配合Object.getOwnPropertyDescriptors()进行对象复制

```javascript
const shallowMerge = (target, source) => Object.defineProperties(
  target,
  Object.getOwnPropertyDescriptors(source)
);
```

2.也可以配合Object.create()实现对象继承，将Object.getOwnPropertyDescriptors(obj)作为Object.create()的第二个参数传入

```javascript
const obj = Object.create(
  prot,
  Object.getOwnPropertyDescriptors({
    foo: 123,
  })
);
```

#### Object.getPrototypeOf/Object.getPrototypeOf:对原型的操作

#### Object.keys()/Object.values()/Object.entries()

#### Object.fromEntries():用于将一个键值对的数组转成对象

```javascript
Object.fromEntries([
  ['foo', 'bar'],
  ['baz', 42]
])
// { foo: "bar", baz: 42 }
```

用途：

1.将键值对数组转对象

2.将Map结构转对象

3.配合UrlSearchParams对象，将查询字符串转成对象(牛逼！)

```javascript
Object.fromEntries(new URLSearchParams('foo=bar&baz=qux'))
// { foo: "bar", baz: "qux" }
```


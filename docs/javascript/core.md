# JavaScript 核心知识体系

::: tip 学习建议
JavaScript 是前端面试的基础,以下知识点都是高频考点,建议全部掌握。
:::

## 📚 知识地图

JavaScript 核心知识包含以下几个重要模块:

### 1. 基础概念
- [数据类型与内存管理](/javascript/memory) - ⭐⭐⭐⭐⭐ 必考
- [ES6+ 新特性](/javascript/es6) - ⭐⭐⭐⭐
- [原型与继承](/javascript/prototype) - ⭐⭐⭐

### 2. 高级特性
- [闭包与作用域](/javascript/closure) - ⭐⭐⭐⭐⭐ 必考
- [异步编程 (Promise)](/javascript/async) - ⭐⭐⭐⭐⭐ 必考
- [事件机制](/javascript/event) - ⭐⭐⭐⭐

### 3. 设计模式
- [发布订阅模式](/javascript/pubsub) - ⭐⭐⭐⭐
- [并发控制](/javascript/concurrency) - ⭐⭐⭐

### 4. 实用技巧
- [节流防抖](/javascript/throttle-debounce) - ⭐⭐⭐⭐
- [数组扁平化](/javascript/flat) - ⭐⭐⭐

---

## 🎯 面试重点

### 最高频考点 (必须掌握)

**1. 数据类型判断**
```javascript
typeof null // "object"
typeof undefined // "undefined"
Array.isArray([]) // true
Object.prototype.toString.call({}) // "[object Object]"
```

**2. 闭包应用**
```javascript
// 数据私有化
function createCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    getCount: () => count
  };
}
```

**3. Promise 实现**
```javascript
class MyPromise {
  constructor(executor) {
    this.status = 'pending';
    this.value = undefined;
    this.callbacks = [];
  }
  
  then(onFulfilled, onRejected) {
    // 实现细节...
  }
}
```

**4. 事件循环**
```
宏任务 (MacroTask): script, setTimeout, setInterval, I/O
微任务 (MicroTask): Promise.then, MutationObserver, process.nextTick

执行顺序: 宏任务 → 所有微任务 → 渲染 → 下一个宏任务
```

---

## 💡 学习路径

### 初级 (0-1年)
1. 数据类型和类型转换
2. 作用域和闭包基础
3. 基本的异步操作 (setTimeout, Promise)

### 中级 (1-3年)
1. 内存管理和垃圾回收
2. 手写 Promise
3. 事件循环机制
4. 发布订阅模式

### 高级 (3年以上)
1. V8 引擎优化
2. 并发控制实现
3. 性能优化技巧

---

## 🔗 相关资源

- [MDN JavaScript 文档](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)
- [You Don't Know JS](https://github.com/getify/You-Dont-Know-JS)
- [ECMAScript 规范](https://tc39.es/ecma262/)

---

## 📝 下一步

选择一个主题深入学习:

- [数据类型与内存管理](/javascript/memory) - 从基础开始
- [异步编程](/javascript/async) - 掌握异步核心
- [闭包与作用域](/javascript/closure) - 理解作用域链

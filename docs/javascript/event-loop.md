---
title: 事件循环
date: 2023-03-08
---

# 事件循环（Event Loop）

用最简单的话说透 JavaScript 事件循环机制。

## 一句话总结

**JS 是单线程的，同一时间只能做一件事，通过事件循环来安排任务的执行顺序。**

## 核心概念

### 为什么需要事件循环？

JS 是单线程的，如果所有任务都排队执行，遇到耗时任务（如网络请求）就会卡死。

**解决方案**：把任务分成两类，优先执行重要的，不重要的稍后执行。

### 两种任务

| 任务类型 | 特点 | 例子 |
|---------|------|------|
| **宏任务** | 普通任务 | 同步代码、`setTimeout`、`setInterval` |
| **微任务** | 高优先级任务 | `Promise.then`、`MutationObserver` |

**关键规则**：微任务优先于宏任务执行。

## 执行流程

```
1. 执行一个宏任务（同步代码是第一个宏任务）
2. 执行过程中遇到微任务，放入微任务队列
3. 宏任务执行完，立即清空所有微任务
4. 取下一个宏任务，重复步骤 1-3
```

**简单记忆**：

```
宏任务 → 微任务全部 → 宏任务 → 微任务全部 → ...
```

## 图解示例

```javascript
console.log('1. 同步代码');

setTimeout(() => {
  console.log('4. setTimeout');
}, 0);

Promise.resolve().then(() => {
  console.log('3. Promise');
});

console.log('2. 同步代码结束');
```

**执行过程**：

```
第 1 轮：
├─ 执行宏任务 1（主脚本）
│  ├─ 输出：1. 同步代码
│  ├─ 遇到 setTimeout → 放入宏任务队列
│  ├─ 遇到 Promise.then → 放入微任务队列
│  └─ 输出：2. 同步代码结束
─ 宏任务 1 结束，清空微任务队列
   └─ 输出：3. Promise

第 2 轮：
├─ 执行宏任务 2（setTimeout）
│  └─ 输出：4. setTimeout
─ 没有微任务，结束
```

**最终输出**：1 → 2 → 3 → 4

## 常见误区

###  误区 1：微任务和宏任务是两个独立的队列，互不干扰

**正确理解**：微任务队列是全局共享的，但每个宏任务执行完后都会清空微任务队列。

### ❌ 误区 2：`setTimeout(fn, 0)` 会立即执行

**正确理解**：即使延迟 0ms，也要等当前宏任务和所有微任务执行完，才会执行。

```javascript
setTimeout(() => {
  console.log('setTimeout');
}, 0);

Promise.resolve().then(() => {
  console.log('Promise');
});

// 输出：Promise → setTimeout
// Promise 先执行，setTimeout 要等下一轮宏任务
```

### ❌ 误区 3：Promise 是微任务，所以 Promise 构造函数里的代码也是微任务

**正确理解**：只有 `.then/.catch/.finally` 是微任务，Promise 构造函数里的代码是同步执行的。

```javascript
console.log('1. 开始');

new Promise((resolve) => {
  console.log('2. Promise 构造函数'); // 同步执行
  resolve();
}).then(() => {
  console.log('4. then'); // 微任务
});

console.log('3. 结束');

// 输出：1 → 2 → 3 → 4
```

## 进阶：微任务中产生新微任务

```javascript
Promise.resolve().then(() => {
  console.log('微任务 1');
  
  Promise.resolve().then(() => {
    console.log('微任务 1-1');
  });
});

Promise.resolve().then(() => {
  console.log('微任务 2');
});
```

**执行过程**：

```
1. 宏任务结束，清空微任务队列
2. 执行微任务 1 → 输出：微任务 1
3. 微任务 1 中产生新微任务 → 放入队列
4. 执行微任务 2 → 输出：微任务 2
5. 执行新产生的微任务 → 输出：微任务 1-1
```

**关键**：微任务执行过程中产生的新微任务，也会在当前轮次清空，不会留到下一轮。

## 浏览器 vs Node.js

| 特性 | 浏览器 | Node.js |
|------|--------|---------|
| 宏任务 | 主脚本、setTimeout、setInterval | 主脚本、setTimeout、setInterval、setImmediate |
| 微任务 | Promise.then、MutationObserver | Promise.then、process.nextTick |
| 特殊 | - | process.nextTick 优先级高于 Promise |

## 实战：分析复杂代码

```javascript
async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}

async function async2() {
  console.log('async2');
}

console.log('script start');

setTimeout(() => {
  console.log('setTimeout');
}, 0);

async1();

new Promise((resolve) => {
  console.log('promise1');
  resolve();
}).then(() => {
  console.log('promise2');
});

console.log('script end');
```

**执行分析**：

```
1. 宏任务 1（主脚本）
   ├─ 输出：script start
   ├─ setTimeout → 宏任务队列
   ├─ async1()
   │  ├─ 输出：async1 start
   │  ├─ async2() → 输出：async2
   │  └─ await 后面的代码 → 微任务队列
   ├─ Promise 构造函数 → 输出：promise1
   ├─ .then → 微任务队列
   └─ 输出：script end

2. 清空微任务队列
   ├─ 执行 await 后的代码 → 输出：async1 end
   └─ 执行 Promise.then → 输出：promise2

3. 宏任务 2（setTimeout）
   └─ 输出：setTimeout
```

**最终输出**：
```
script start
async1 start
async2
promise1
script end
async1 end
promise2
setTimeout
```

## 总结

| 要点 | 说明 |
|------|------|
| **JS 单线程** | 同一时间只能做一件事 |
| **宏任务** | 同步代码、setTimeout、setInterval |
| **微任务** | Promise.then、MutationObserver |
| **执行顺序** | 宏任务 → 微任务全部 → 下一个宏任务 |
| **微任务优先** | 每个宏任务执行完后，立即清空所有微任务 |

**一句话记忆**：**一个宏任务配一轮微任务清空，微任务优先执行。**

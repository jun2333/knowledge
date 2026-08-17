# 面试准备指南

::: tip 目标
系统化准备前端面试,提高通过率
:::

---

## 📋 面试准备清单

### ✅ 理论知识

**JavaScript (必考)**
- [ ] 数据类型判断 (typeof, instanceof, Object.prototype.toString)
- [ ] 闭包原理和应用场景
- [ ] 原型链和继承
- [ ] this 指向规则
- [ ] 事件循环 (宏任务、微任务)
- [ ] Promise 实现原理
- [ ] async/await 执行顺序

**Vue (高频)**
- [ ] 响应式原理 (Object.defineProperty vs Proxy)
- [ ] Vue2 vs Vue3 区别
- [ ] Diff 算法优化
- [ ] computed vs watch
- [ ] 生命周期钩子
- [ ] Vuex 状态管理
- [ ] 组件通信方式

**React (高频)**
- [ ] Virtual DOM 和 Diff 算法
- [ ] Fiber 架构
- [ ] Hooks 原理
- [ ] useEffect 依赖项
- [ ] Context API
- [ ] 性能优化 (React.memo, useMemo, useCallback)

**浏览器**
- [ ] 从 URL 输入到页面展示
- [ ] 渲染流程 (DOM → CSSOM → Render Tree → Layout → Paint)
- [ ] 重排 vs 重绘
- [ ] HTTP 缓存策略
- [ ] HTTPS 加密原理
- [ ] WebSocket 握手

**CSS**
- [ ] Flexbox 布局
- [ ] Grid 布局
- [ ] BFC 触发条件和作用
- [ ] 水平垂直居中方案
- [ ] 移动端适配 (rem, vw, viewport)

---

### 💻 手写代码

**基础题**
```javascript
// 1. 防抖
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 2. 节流
function throttle(fn, delay) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

// 3. 深拷贝
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (map.has(obj)) return map.get(obj);
  
  const clone = Array.isArray(obj) ? [] : {};
  map.set(obj, clone);
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key], map);
    }
  }
  return clone;
}
```

**进阶题**
```javascript
// 4. Promise.all
Promise.myAll = function(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;
    
    promises.forEach((promise, index) => {
      Promise.resolve(promise).then(
        value => {
          results[index] = value;
          completed++;
          if (completed === promises.length) resolve(results);
        },
        reject
      );
    });
  });
};

// 5. 发布订阅模式
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(...args));
    }
  }
  
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}
```

**算法题**
```javascript
// 6. 快速排序
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

// 7. 二分查找
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
```

---

## 🎯 项目准备

### 项目介绍模板

**项目名称**: 大文件上传系统

**技术栈**: Vue3 + TypeScript + Node.js

**核心功能**:
- 分片上传: 将大文件切割成小块并发上传
- 断点续传: 记录已上传分片,支持中断后继续
- 秒传功能: 通过文件 hash 判断是否已存在
- 进度展示: 实时显示上传进度

**技术亮点**:
1. 使用 SparkMD5 计算文件 hash
2. 并发控制,最多同时上传 3 个分片
3. 服务端使用 Schedule 调度器合并分片
4. 支持暂停、恢复、取消上传

**难点解决**:
- 问题: 大量分片导致内存溢出
- 解决: 采用流式读取,边读边计算 hash

---

## ❓ 常见问题

### Q1: 你的优缺点?
**回答思路**: 
- 优点: 学习能力强,对技术有热情,举例说明
- 缺点: 避免说致命缺点,可以说"有时候过于追求完美"

### Q2: 为什么离开上一家公司?
**回答思路**: 
- 不要抱怨前公司
- 强调个人成长需求
- "希望寻求更大的发展空间"

### Q3: 你有什么想问的?
**推荐问题**:
- 团队的技术栈是什么?
- 日常的工作流程是怎样的?
- 对这个职位的期望是什么?

---

## 📈 面试技巧

### 回答问题 STAR 法则
- **S**ituation: 描述背景
- **T**ask: 说明任务
- **A**ction: 采取行动
- **R**esult: 最终结果

### 遇到不会的问题
1. 不要慌,先思考一下
2. 可以从相关知识点入手
3. 诚实承认不会,但表示愿意学习
4. 尝试给出自己的推测

### 薪资谈判
1. 提前了解市场行情
2. 给出合理范围,不要说具体数字
3. 强调自己的能力价值
4. 可以考虑综合待遇 (期权、培训等)

---

## 🔗 相关资源

- [学习路径](/guide/learning-path)
- LeetCode 题解

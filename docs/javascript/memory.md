# JavaScript 数据类型与内存管理

## 数据类型

### 基本类型（Primitive Types）

| 类型 | 说明 | 示例 |
|------|------|------|
| `number` | 数字（整数、浮点数、NaN、Infinity） | `42`, `3.14`, `NaN` |
| `string` | 字符串 | `'hello'`, `"world"` |
| `boolean` | 布尔值 | `true`, `false` |
| `undefined` | 未定义 | `undefined` |
| `null` | 空值 | `null` |
| `symbol` | 唯一标识（ES6） | `Symbol('id')` |
| `bigint` | 大整数（ES2020） | `123n` |

### 引用类型（Reference Types）

| 类型 | 说明 |
|------|------|
| `Object` | 普通对象 |
| `Array` | 数组 |
| `Function` | 函数 |
| `Date` | 日期 |
| `RegExp` | 正则表达式 |
| `Map/Set` | ES6 新增 |
| `Promise` | 异步操作 |

### 类型判断

```typescript
// typeof - 判断基本类型
typeof 42           // 'number'
typeof 'hello'      // 'string'
typeof true         // 'boolean'
typeof undefined    // 'undefined'
typeof Symbol()     // 'symbol'
typeof null         // 'object' (历史遗留 bug)
typeof function(){} // 'function'

// instanceof - 判断引用类型
[] instanceof Array           // true
{} instanceof Object          // true
new Date() instanceof Date    // true

// Object.prototype.toString.call - 最准确
Object.prototype.toString.call(42)      // '[object Number]'
Object.prototype.toString.call('hello') // '[object String]'
Object.prototype.toString.call(null)    // '[object Null]'
Object.prototype.toString.call([])      // '[object Array]'
```

## 类型转换

### 显式转换

```typescript
// 转数字
Number('42')        // 42
Number('')          // 0
Number('abc')       // NaN
parseInt('42px')    // 42
parseFloat('3.14')  // 3.14

// 转字符串
String(42)          // '42'
(42).toString()     // '42'

// 转布尔值
Boolean(0)          // false
Boolean('')         // false
Boolean(null)       // false
Boolean(undefined)  // false
Boolean(NaN)        // false
Boolean(1)          // true
Boolean('hello')    // true
```

### 隐式转换（== 运算符）

```typescript
// 转为数字比较
'42' == 42          // true (字符串转数字)
true == 1           // true (布尔转数字)
false == 0          // true

// 转为字符串比较
null == undefined   // true (特殊规则)
null == 0           // false (不转换)

// === 严格相等（不转换）
'42' === 42         // false
null === undefined  // false
```

### 类型转换规则

| 原始值 | 转数字 | 转字符串 | 转布尔值 |
|--------|--------|----------|----------|
| `0` | `0` | `'0'` | `false` |
| `1` | `1` | `'1'` | `true` |
| `''` | `0` | `''` | `false` |
| `'hello'` | `NaN` | `'hello'` | `true` |
| `null` | `0` | `'null'` | `false` |
| `undefined` | `NaN` | `'undefined'` | `false` |
| `NaN` | `NaN` | `'NaN'` | `false` |
| `[]` | `0` | `''` | `true` |
| `{}` | `NaN` | `'[object Object]'` | `true` |

## 内存管理

### 栈内存与堆内存

```mermaid
graph TB
    subgraph 栈内存 Stack
        A["a = 42"]
        B["b = 'hello'"]
        C["c = true"]
        D["d = 指针 → 堆"]
    end

    subgraph 堆内存 Heap
        E["{ name: 'John', age: 30 }"]
        F["[1, 2, 3]"]
        G["function() {...}"]
    end

    D --> E
```

| 特性 | 栈内存 | 堆内存 |
|------|--------|--------|
| **存储内容** | 基本类型、指针 | 引用类型 |
| **大小** | 固定、较小 | 动态、较大 |
| **访问速度** | 快 | 慢 |
| **生命周期** | 函数执行完自动释放 | 垃圾回收器管理 |
| **分配方式** | 静态分配 | 动态分配 |

### 浅拷贝与深拷贝

```typescript
// 浅拷贝：只复制第一层
const shallowCopy = (obj: any) => {
  if (Array.isArray(obj)) {
    return [...obj];
  }
  return { ...obj };
};

// 深拷贝：递归复制所有层
const deepCopy = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);

  const copy = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }
  return copy;
};

// JSON 序列化（有局限）
const jsonCopy = (obj: any) => JSON.parse(JSON.stringify(obj));
// 局限：无法处理函数、undefined、Symbol、循环引用、Date/RegExp 对象
```

### 垃圾回收机制

```mermaid
graph TD
    A[新生代 Young Generation] -->|存活一次| B[老生代 Old Generation]
    A -->|To 空间超过 25%| B

    subgraph 新生代回收
        A1["From 空间"] -->|复制存活对象| A2["To 空间"]
        A2 -->|交换| A1
    end

    subgraph 老生代回收
        B1["标记 Mark"] --> B2["清除 Sweep"]
        B2 --> B3["压缩 Compact"]
    end
```

#### 新生代：Scavenge 算法

- 堆内存平分为 From 和 To 空间
- 存活对象从 From 复制到 To
- 交换 From 和 To，完成回收
- 适用：存活周期短的对象

#### 老生代：标记 - 清除（Mark-Sweep）

```typescript
// 伪代码
function markSweep() {
  // 1. 标记阶段：从根对象开始遍历，标记可达对象
  markFromRoots();

  // 2. 清除阶段：遍历堆内存，清除未标记对象
  sweep(HeapStart, HeapEnd);
}
```

**缺点**：产生内存碎片

#### 老生代：标记 - 压缩（Mark-Compact）

```typescript
// 伪代码
function markCompact() {
  // 1. 标记阶段
  markFromRoots();

  // 2. 压缩阶段：移动存活对象，消除碎片
  compact();

  // 3. 更新引用
  updateReferences();
}
```

**优点**：消除内存碎片

#### 引用计数法（不推荐）

```typescript
// 引用计数：跟踪每个值被引用的次数
let a = { name: 'John' };  // 引用次数 = 1
let b = a;                 // 引用次数 = 2
a = null;                  // 引用次数 = 1
b = null;                  // 引用次数 = 0，可回收
```

**问题**：循环引用无法回收

```typescript
let a = {};
let b = {};
a.ref = b;  // a 引用 b
b.ref = a;  // b 引用 a
// 即使 a、b 不再使用，引用次数都不为 0，无法回收
```

#### V8 内存上限

| 环境 | 堆内存上限 |
|------|-----------|
| 64 位浏览器 | 约 1.4 GB |
| 32 位浏览器 | 约 0.7 GB |
| Node.js | 默认约 2 GB，可用 `--max-old-space-size` 调大 |

**为什么有上限**：V8 的 GC 是"全停顿"（Stop-The-World）——回收期间主线程冻结。堆越大，单次 GC 耗时越长，页面卡顿越明显，所以用上限换取停顿时间可控。

```typescript
// Node.js 调大堆内存上限（单位 MB）
node --max-old-space-size=4096 app.js
```

## 内存泄漏常见场景

| 场景 | 说明 | 解决方案 |
|------|------|----------|
| **全局变量** | 未声明的变量成为全局属性 | 使用 `let/const` |
| **定时器** | `setInterval` 未清除 | 组件卸载时 `clearInterval` |
| **事件监听** | 未移除的事件监听器 | 组件卸载时 `removeEventListener` |
| **闭包** | 闭包引用外部变量 | 长生命周期闭包中手动解除引用 |
| **DOM 引用** | 已删除 DOM 的引用 | 设置为 `null` |
| **无界缓存** | Map/对象缓存只增不删 | 加淘汰策略（LRU）或改用 WeakMap |
| **console.log 大对象** | DevTools 持有被打印对象的引用 | 生产环境移除 console 语句 |

## 内存泄漏排查手段

排查思路分三步：**先确认有没有泄漏 → 再定位泄漏对象 → 最后定位分配位置**。

### 第一步：确认是否存在泄漏

**① Chrome 任务管理器（Shift + Esc）**

| 列 | 观察点 |
|----|--------|
| **内存占用空间** | 反复执行同一操作后持续增长、不回落 |
| **JavaScript 内存** | 当前页面 JS 堆占用，只升不降说明有泄漏 |

**② Performance 面板录制内存曲线**

```javascript
// 在 Console 里反复执行你怀疑泄漏的操作（如开关弹窗 10 次），同时录制
// 观察 Memory 曲线
```

**关键认知**（先建立这个判断标准，不然会把正常现象当泄漏）：
- 曲线呈**锯齿状**（上升后被 GC 拉回）是正常现象
- 泄漏的特征是**台阶式持续上升**，GC 后也回不到基线

### 第二步：定位泄漏对象（Heap Snapshot 三快照法）

1. 操作前拍一张快照（baseline）
2. 反复执行疑似泄漏的操作
3. 操作后再拍一张快照
4. 在 **Summary** 视图勾选 **Objects allocated between Snapshots 1 and 2**（对比视图）
5. 按 **Retained Size（保留大小）** 排序，找出新增且被保留的大对象
6. 点开对象的 **Retainers（持有者）** 展开引用链，看是谁一直引用它——**顺着引用链找到泄漏源头**

常见目标：搜 **Detached** 过滤分离的 DOM 节点

```javascript
// Detached DOM 节点：节点已从文档移除，但 JS 里仍有引用，无法回收
let detached = []
function createAndForget() {
  const el = document.createElement('div')
  el.textContent = 'leak'
  detached.push(el)  // 页面里已没有这个节点，数组却一直持有引用
}
```

### 第三步：定位分配位置（Allocation instrumentation on timeline）

快照对比适合找"对象"，但要找"代码位置"用这个：

1. Memory 面板 → **Allocation instrumentation on timeline** → 开始记录
2. 在页面重复执行泄漏操作
3. 停止记录，蓝色竖条即分配事件
4. 筛选**只显示保留的对象**（Retained objects）
5. 点开对象看 **Allocation Stack（分配栈）**——直接显示是哪个函数创建了它

### 排查工具总结

| 工具 | 用途 |
|------|------|
| Chrome 任务管理器（Shift+Esc） | 粗筛：看内存是否持续增长 |
| Performance 录制 | 看内存曲线趋势，确认泄漏（锯齿正常、台阶上升是泄漏） |
| Heap Snapshot 对比 | 定位被保留的对象 + Retainers 引用链 |
| Allocation timeline | 定位分配发生的代码位置 |

## 最佳实践

```typescript
// 1. 长生命周期作用域中手动解除引用（局部变量无需此操作，函数返回后自动回收）
let cache = null;
function loadData() {
  cache = fetchLargeData();
}
function unloadData() {
  cache = null;  // 模块级变量不会自动回收，需手动解除引用
}

// 2. 使用 WeakMap/WeakSet
const weakCache = new WeakMap();
weakCache.set(obj, value);  // obj 被 GC 时，weakCache 中的条目自动移除

// 3. 避免全局变量
(function() {
  let temp = 'temporary';
  // 函数执行完，temp 自动回收
})();

// 4. 及时清理事件监听
useEffect(() => {
  const handler = () => console.log('click');
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []);

// 5. WeakRef：引用对象但不阻止 GC，deref() 拿不到说明已被回收
//    场景：需要"取回对象但允许被回收"的缓存（WeakMap 不能遍历，适合做缓存容器）
const ref = new WeakRef(obj);
ref.deref();  // 返回 obj，或 undefined（已被回收）

// 6. FinalizationRegistry：对象被 GC 后触发回调（用于清理外部资源）
const registry = new FinalizationRegistry((heldValue) => {
  console.log('对象已回收:', heldValue);
});
registry.register(obj, '清理标记');
// 注意：GC 时机不确定，不能依赖它做关键逻辑
```

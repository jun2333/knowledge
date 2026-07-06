# React 事件系统

React 自定义了一套事件系统，称为**合成事件（SyntheticEvent）**。

---

## 为什么需要自定义事件系统？

1. **兼容性** — 抹平各大浏览器的差异（如 IE 的 `attachEvent` vs 标准的 `addEventListener`）
2. **事件委托** — 事件都挂载在根元素上，利用事件委托减少内存占用。v17 以前挂载在 `document` 元素上，v17+ 改成挂载在 root 元素上，更有利于微前端架构
3. **SSR 和跨端支持** — 统一的事件抽象层，便于服务端渲染和 React Native 等跨端场景

---

## 合成事件

不同的原生事件有着对应的合成事件的映射。在 React 应用中绑定的事件并不是原生的事件，而是经过 React 合成的事件。

例如 `onChange` 事件实际上是由 `blur`、`change`、`focus` 等多个事件合成：

```jsx
// React 中
<input onChange={(e) => console.log(e.target.value)} />

// 等价于原生
input.addEventListener('input', handler);
input.addEventListener('change', handler);
```

React 会在根元素上绑定多个原生事件，统一由合成事件系统分发。

---

## 事件插件

React 不同的事件有自己对应的插件，插件负责：

1. **合成新的事件源** — 将原生事件包装成 `SyntheticEvent`
2. **提供统一 API** — `stopPropagation`、`preventDefault` 等方法
3. **事件池机制**（v17 已移除）— 复用事件对象，减少内存分配

```jsx
function handleClick(e) {
  e.preventDefault();      // 阻止默认行为
  e.stopPropagation();     // 阻止冒泡
  console.log(e.nativeEvent); // 访问原生事件
}
```

---

## 事件触发流程

### 1. 事件绑定

首次渲染过程中，React 检测到组件绑定了事件，会依次将原生事件绑定到根节点上。

```
DOM 和 Fiber 通过属性相互关联
用户写的事件回调函数会被加到 Fiber 的 props 中
```

### 2. 事件触发

```
1. 用户触发原生事件（如点击）
2. 事件通过捕获/冒泡传递到 root
3. root 的事件回调函数通过 event.target 拿到对应 DOM
4. DOM 通过属性取到 Fiber，进而取得回调函数
5. 统一将回调函数放到队列中，由 dispatchEvent 调用
```

### 3. 事件队列形成

从事件发生的 Fiber 向上遍历，遇到相同类型的事件就收集到队列中：

- React 事件默认在**冒泡阶段**执行
- 遇到带有捕获标识的事件（如 `onClickCapture`）unshift 到队头
- 冒泡事件直接 push 到队尾
- 最后遍历执行事件队列

```jsx
<div onClick={() => console.log('div')}>
  <button onClick={() => console.log('button')}>点击</button>
</div>

// 点击 button 输出：
// button
// div
```

---

## 如何阻止事件冒泡

在遍历执行事件队列的过程中，检测到 `event.isPropagationStopped()` 为 `true` 则 break 跳出循环：

```jsx
<div onClick={() => console.log('div')}>
  <button onClick={(e) => {
    e.stopPropagation(); // 阻止冒泡
    console.log('button');
  }}>点击</button>
</div>

// 点击 button 输出：
// button
// （div 的回调不会执行）
```

---

## 合成事件 vs 原生事件

| | 合成事件 | 原生事件 |
|---|---------|---------|
| **事件对象** | `SyntheticEvent` | 浏览器原生 `Event` |
| **绑定方式** | 声明式（`onClick`） | 命令式（`addEventListener`） |
| **事件委托** | 统一委托到 root | 直接绑定到元素 |
| **兼容性** | React 抹平差异 | 需要手动处理 |
| **性能** | 事件委托，内存占用少 | 每个元素独立绑定 |
| **访问原生事件** | `e.nativeEvent` | 直接就是原生事件 |

---

## v18 事件系统改进

v18 以前事件是在真实事件冒泡阶段模拟执行的，这与原生事件的机制不太一致（原生事件是 捕获 → 目标 → 冒泡）。

**v18 修正了这一点**：

- 事件监听器现在在**捕获阶段**就绑定到 root
- 事件队列先收集捕获阶段的事件，再收集冒泡阶段的事件
- 与原生事件的执行顺序完全一致

```jsx
<div
  onClickCapture={() => console.log('div capture')}
  onClick={() => console.log('div bubble')}
>
  <button
    onClickCapture={() => console.log('button capture')}
    onClick={() => console.log('button bubble')}
  >
    点击
  </button>
</div>

// v18 输出（与原生事件一致）：
// div capture
// button capture
// button bubble
// div bubble
```

---

## 常见陷阱

### 1. 合成事件是异步的

```jsx
function handleClick(e) {
  console.log(e.target.value); // ✅ 可以访问

  setTimeout(() => {
    console.log(e.target.value); // ❌ v17 中事件对象已被回收
  }, 0);
}
```

> v17 已移除事件池机制，合成事件不再被回收，所以上述代码在 v17+ 中可以正常工作。

### 2. 合成事件不能直接传给原生 API

```jsx
// ❌ 错误
element.addEventListener('click', handleClick); // handleClick 接收的是原生事件

// ✅ 正确
element.addEventListener('click', (e) => {
  // 处理原生事件
});
```

### 3. 阻止默认行为

```jsx
// React 中
<form onSubmit={(e) => {
  e.preventDefault(); // 阻止表单提交
}}>

// 原生中
form.addEventListener('submit', (e) => {
  e.preventDefault();
});
```

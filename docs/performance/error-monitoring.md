---
title: 错误监控
date: 2023-03-08
---

# 错误监控

本文总结前端错误监控的各种方案。

## 错误类型

| 错误类型 | 监控方式 |
|---------|---------|
| **资源加载错误** | `window.addEventListener('error')` |
| **JS 运行错误** | `window.addEventListener('error')` |
| **Promise 异步错误** | `window.addEventListener('unhandledrejection')` |
| **HTTP 请求错误** | 全局封装 XHR/Fetch 监听错误 |
| **白屏** | 关键点采样检测 |

## 基础错误监控

### 资源加载错误 & JS 运行错误

```javascript
window.addEventListener('error', (e) => {
  // 资源加载错误
  if (e.target !== window) {
    console.log('资源加载错误:', {
      tagName: e.target.tagName,
      src: e.target.src || e.target.href,
    });
  }
  // JS 运行错误
  else {
    console.log('JS 错误:', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  }
}, true); // 使用捕获阶段，才能监听到资源加载错误
```

### Promise 异步错误

```javascript
window.addEventListener('unhandledrejection', (e) => {
  console.log('Promise 未捕获错误:', {
    reason: e.reason,
    message: e.reason?.message || e.reason,
  });
  
  // 阻止默认行为（控制台报错）
  e.preventDefault();
});
```

### HTTP 请求错误

```javascript
// 封装 XHR
const originalXhr = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  this.addEventListener('error', () => {
    console.log('HTTP 错误:', { method, url });
  });
  return originalXhr.apply(this, arguments);
};

// 封装 Fetch
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  return originalFetch.apply(this, arguments).catch((err) => {
    console.log('Fetch 错误:', { url, error: err });
    throw err;
  });
};
```

## 白屏监控

### 白屏的表现

1. 页面空白或仅显示背景色，没有实际内容
2. 页面一直展示骨架屏，包括页面 loading 状态
3. 页面只展示导航菜单，内容区空白（微前端或 iframe 嵌套场景）

### 白屏的原因

- **资源加载错误**：JS/CSS 文件加载失败
- **代码执行错误**：JS 运行时错误导致渲染中断

### 检测原理

使用 `document.elementFromPoint(x, y)` 在屏幕关键点采样，判断采样点的 DOM 元素是否为容器元素。

```javascript
// 获取坐标处的顶层元素
const element = document.elementFromPoint(x, y);

// 判断是否是容器元素（需要自行配置）
function isContainer(element) {
  const containerIds = ['app', 'root', 'container'];
  return containerIds.includes(element?.id);
}
```

### 采样时机

使用 `requestIdleCallback` 在浏览器空闲时采样，避免影响性能。

```javascript
function idleCallback(callback) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 0);
  }
}
```

### 采样方式

| 方式 | 说明 | 采样点数 |
|------|------|---------|
| **垂直采样** | 水平中线，垂直 9 个点 | 9 |
| **交叉采样** | 垂直 + 水平中线 | 17 |
| **垂直交叉采样** | 垂直 + 水平 + 两条对角线 | 33 |

**推荐**：垂直交叉采样，覆盖更全面。

### 检测时机

#### 无骨架屏

```javascript
// 1. 页面加载完成时
if (document.readyState === 'complete') {
  checkWhiteScreen();
} else {
  window.addEventListener('load', checkWhiteScreen);
}

// 2. 全局 error 事件触发时
window.addEventListener('error', checkWhiteScreen);

// 3. 全局 unhandledrejection 事件触发时
window.addEventListener('unhandledrejection', checkWhiteScreen);
```

#### 有骨架屏

骨架屏也是有效 DOM，无法用常规方式检测。需要对比初次采样前后的 DOM 是否一致。

```javascript
let initialElement = null;

// 页面加载前采样（骨架屏）
if (document.readyState !== 'complete') {
  initialElement = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2
  );
}

// 页面加载后采样
window.addEventListener('load', () => {
  const currentElement = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2
  );
  
  // 如果前后一致，说明一直是骨架屏（白屏）
  if (initialElement === currentElement) {
    reportWhiteScreen('骨架屏场景白屏');
  }
});
```

### 垂直交叉采样实现

```javascript
function checkWhiteScreen() {
  let emptyPoints = 0;
  
  for (let i = 1; i <= 9; i++) {
    // x 轴采样点（水平中线）
    const xElement = document.elementFromPoint(
      (window.innerWidth * i) / 10,
      window.innerHeight / 2
    );
    
    // y 轴采样点（垂直中线）
    const yElement = document.elementFromPoint(
      window.innerWidth / 2,
      (window.innerHeight * i) / 10
    );
    
    // 上升对角线采样点
    const upDiagonalElement = document.elementFromPoint(
      (window.innerWidth * i) / 10,
      (window.innerHeight * i) / 10
    );
    
    // 下降对角线采样点
    const downDiagonalElement = document.elementFromPoint(
      (window.innerWidth * i) / 10,
      window.innerHeight - (window.innerHeight * i) / 10
    );
    
    if (isContainer(xElement)) emptyPoints++;
    
    // 中心点只计算一次
    if (i !== 5) {
      if (isContainer(yElement)) emptyPoints++;
      if (isContainer(upDiagonalElement)) emptyPoints++;
      if (isContainer(downDiagonalElement)) emptyPoints++;
    }
  }
  
  // 33 个采样点，超过阈值判定为白屏
  if (emptyPoints >= 20) {
    reportWhiteScreen(`白屏检测：${emptyPoints}/33 个采样点为空`);
  }
}

function reportWhiteScreen(message) {
  // 上报到监控平台
  console.log('白屏:', message);
}
```

## 监控上报

```javascript
function reportError(errorInfo) {
  // 方式 1：发送 beacon（页面卸载时也能发送）
  navigator.sendBeacon('/api/error-report', JSON.stringify(errorInfo));
  
  // 方式 2：fetch 上报
  fetch('/api/error-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorInfo),
  });
}
```

## 总结

| 错误类型 | 监控方案 | 关键点 |
|---------|---------|--------|
| JS 错误 | `window.error` | 使用捕获阶段 |
| Promise 错误 | `unhandledrejection` | 阻止默认行为 |
| HTTP 错误 | 封装 XHR/Fetch | 全局拦截 |
| 白屏 | 关键点采样 | 区分有无骨架屏 |

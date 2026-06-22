## 错误处理
### 两个api用于classComponent
1. getDerivedStateFromError:静态方法，当错误发生后，提供一个机会渲染fallback UI
2. componentDidCatch:组件实例方法，提供一个机会记录错误信息
这两个api都配合着Error Boundaries(错误边界)使用，但是官方更建议使用getDerivedStateFromError，这是类组件的一个静态方法，返回值会合并到组件state中，在这个时机渲染错误视图比较靠前，就不需要在componentDidCatch中再降级UI

### Error Boundaries
作为一个父组件(classComponent)，它的子孙组件渲染发生的错误都会被它的componentDidCatch方法捕获到，不过有四类错误不会被捕获：
1. 事件回调错误
2. 异步代码发生的错误
3. SSR
4. ErrorBoundaries组件本身内部错误

### 如何捕获
基本上通过try...catch中catch去捕获
render阶段是handleError处理
commit阶段是captureCommitPhaseError处理

捕获错误之后会构建callback函数
从捕获错误的fiberNode逐层向上遍历，找到最近的Error Boundaries，一旦找到执行createClassErrorUpdate方法构造两个callback
1. 用于**执行Error Boundaries API**的callback
2. 用于**抛出React提示信息**的callback
若没找到Error Boundaries同样也会构建一个用于**抛出React提示信息**和**抛出未捕获错误**的callback

### 何时执行callback
1. this.setState(找到Error Boundaries)
```javascript
this.setState(()=>{
    // 用于执行getDerivedStateFromError的callback
}, ()=>{
    // 执行抛出React提示信息callback
    // 执行componentDidCatch的callback
})
```
1. ReactDOM.render(未找到Error Boundaries)
```javascript
ReactDOM.render(el, container, ()=>{
    //执行**抛出React提示信息**和**抛出未捕获错误**的callback 
})
```
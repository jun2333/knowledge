## 组件实例
实际上就是一个对象，里面有各种属性

### 状态的构成
1. props/attrs: 组件入参props和未定义的入参会放到attrs props会被浅响应式化 attrs会被挂在到this.$attrs上
2. data函数返回对象：自身state 会被深度响应式化
3. setupState: setup函数返回的对象 会被toRefs化并自动脱ref代理

以上状态除了attrs,全都会被一个被称之为渲染上下文renderContext的对象代理，暴露到模板中
```javascript
const renderContext = new Proxy(instance, {
      get(t, k, r) {
        const { state, props, slots } = t

        if (k === '$slots') return slots

        if (state && k in state) {
          return state[k]
        } else if (k in props) {
          return props[k]
        } else if (setupState && k in setupState) {
          return setupState[k]
        } else {
          console.error('不存在')
        }
      },
      set (t, k, v, r) {
        const { state, props } = t
        if (state && k in state) {
          state[k] = v
        } else if (k in props) {
          props[k] = v
        } else if (setupState && k in setupState) {
          setupState[k] = v
        } else {
          console.error('不存在')
        }
      }
    })
```

### 渲染函数
来源：
1. 模板编译结果
2. options配置的render函数
3. setup函数执行返回的函数

执行渲染函数得到subTree，然后patch，分mount/update两种情况
副作用函数调度执行，通过queueJob控制，实现批量更新
```javascript
effect(() => {
   const subTree = render.call(renderContext, renderContext)
   if (!instance.isMounted) {
     beforeMount && beforeMount.call(renderContext)
     patch(null, subTree, container, anchor)
     instance.isMounted = true
     mounted && mounted.call(renderContext)
     instance.mounted && instance.mounted.forEach(hook => hook.call(renderContext))
   } else {
     beforeUpdate && beforeUpdate.call(renderContext)
     patch(instance.subTree, subTree, container, anchor)
     updated && updated.call(renderContext)
   }
   instance.subTree = subTree
 }, {
   scheduler: queueJob
 })

const p = Promise.resolve()
const queue = new Set()
let isFlushing = false
function queueJob(job) {
 queue.add(job)
 if (!isFlushing) {
   isFlushing = true
   p.then(() => {
     try {
       queue.forEach(jon => job())
     } finally {
       isFlushing = false
     }
   })
 }
}
```

### 事件函数与emit
1. 事件函数无论是否显示声明都放到props中
2. emit函数则从props中取出函数执行而已
emit会被添加到setupContext中

### 插槽实现原理
接收插槽的组件A会接收到父组件的调用，并传入插槽模板，渲染插槽的过程其实就是插槽函数的执行并返回其内容的过程

### 注册生命周期
vue3中注册生命周期通过在setup函数中调用如：onMounted这样的函数将回调函数传进去，mountComponent函数会在调用setup函数前设置当前组件实例curInstance = instance，生命周期回调函数都会绑定到当前实例上

### nextTick实现原理
1. 异步队列机制：将回调函数加入到异步队列中，确保批量更新
2. 调用方式：优先使用微任务Promise.then调用，降级方案是宏任务MutationObserver、setImmediate、setTimeout
3. 调用时机：将回调函数放到队尾，保证回调内拿到最新的结果
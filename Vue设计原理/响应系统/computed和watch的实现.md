## computed原理解析
### computed的用法和作用
1. 传入一个回调函数，函数内用到了一些响应数据，最终返回一个值
2. computed返回的值会随着内部响应数据的变化重新计算，无变化则返回缓存的值

### 实现：computed = effect + lazy
1. 懒执行(首次不执行fn，当读取computed的值的时候执行fn)
2. 内部用get代理执行fn并返回值
3. 配合scheduler实现缓存

修改effect
```javascript
function effect(fn, options){
    const effectFn = ()=>{
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        const res = fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length-1]
        return res
    }
    effectFn.options = options
    effect.deps = []
    if(!options.lazy){ // 懒执行
        effectFn()
    }
    return effectFn
}
function computed(getter){
    let dirty = false // 是否脏
    let value // 缓存值
    const fn = effect(getter, {
        lazy: true,
        scheduler(){ // getter设置调度执行
            dirty = true
        }
    })
    const obj = {
        get value(){
            if(dirty){
                value = fn()
                dirty = false
            }
            return value
        }
    }
}
```
上面程序还存在一个问题：当计算属性被用在effect中的时候，计算属性的值的变化并不能触发effect重新执行
obj.foo++会触发sum的更新，但是sum本身不是响应式的数据
```javascript
const sum = computed(()=>{
    return obj.foo+  obj.bar
})
effect(()=>{
    console.log(sum.value)
})
obj.foo++
```
那就只能手动track和trigger了：
```javascript
function effect(fn, options){
    const effectFn = ()=>{
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        const res = fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length-1]
        return res
    }
    effectFn.options = options
    effect.deps = []
    if(!options.lazy){ // 懒执行
        effectFn()
    }
    return effectFn
}
function computed(getter){
    let dirty = false // 是否脏
    let value // 缓存值
    const fn = effect(getter, {
        lazy: true,
        scheduler(){ // getter设置调度执行
            dirty = true
            trigger(obj, 'value')
        }
    })
    const obj = {
        get value(){
            if(dirty){
                value = fn()
                dirty = false
            }
            track(obj, 'value')
            return value
        }
    }
}
```

## watch原理解析
### 本质上就是一个effect配置了scheduler
```javascript
fucntion watch(source, cb){
    let getter
    if(typeof source === 'function'){
        getter = source
    }else{
        getter = ()=>traverse(source)
    }
    effect(()=>getter()), {
        scheduler(){
            cb()
        }
    })
}
// 递归读一遍所有值
function traverse(obj, seen = new Set()){
    if(typeof obj !== 'object' || obj === null || seen.has(obj)) return
    seen.add(obj)
    for(let key in obj){
        traverse(obj[key], seen)
    }
    return obj
}
```
### 新增旧值和新值,需要开启lazy手动调用
```javascript
fucntion watch(source, cb){
    let getter
    if(typeof source === 'function'){
        getter = source
    }else{
        getter = ()=>traverse(source)
    }
    let oldValue, newValue
    const myEffect = effect(()=>getter()), {
        lazy: true,
        scheduler(){
            newValue = myEffect()
            cb(oldValue, newValue)
            oldValue = newValue
        }
    })
    oldValue = myEffect()
}
```
### 加入options选项
options有immediate、flush选项
1. immediate:立即执行
2. flush: sync/pre/post: 执行时机，分别指同步、组件渲染前、组件渲染后执行
```javascript
fucntion watch(source, cb, options){
    let getter
    if(typeof source === 'function'){
        getter = source
    }else{
        getter = ()=>traverse(source)
    }
    let oldValue, newValue
    cosnt job = ()=>{
        newValue = myEffect()
        cb(oldValue, newValue)
        oldValue = newValue
    }
    const myEffect = effect(()=>getter()), {
        lazy: true,
        scheduler(){
            // flush
            if(options.flush === 'post'){
                Promise.resolve().then(()=>job())
            }else if(options.flush === 'sync'){
                job()
            }else{
                //... pre暂时无法模拟，涉及到组件渲染前
            }
        }
    })
    if(options.immediate){
        job() // 立即执行oldValue是undefined
    }else{
        oldValue = myEffect()
    }
}
```
### 过期的副作用
涉及到网络请求等异步副作用，当修改两次数据引发了watch的副作用执行，应该将第一次过期处理，第二次视为最新, 否则返回结果可能不是预期
vue设计允许watch回调函数接收第三个参数，第三个参数接收一个过期函数，每次副作用执行的时候会先调过期函数
```javascript
fucntion watch(source, cb, options){
    let getter
    if(typeof source === 'function'){
        getter = source
    }else{
        getter = ()=>traverse(source)
    }
    let oldValue, newValue, cleanup
    function onInvalidate(fn){
        cleanup = fn
    }
    cosnt job = ()=>{
        if(cleanup) cleanup() // 执行用户注册的过期函数
        newValue = myEffect()
        cb(newValue, oldValue, onInvalidate)
        oldValue = newValue
    }
    const myEffect = effect(()=>getter()), {
        lazy: true,
        scheduler(){
            // flush
            if(options.flush === 'post'){
                Promise.resolve().then(()=>job())
            }else if(options.flush === 'sync'){
                job()
            }else{
                //... pre暂时无法模拟，涉及到组件渲染前
            }
        }
    })
    if(options.immediate){
        job() // 立即执行oldValue是undefined
    }else{
        oldValue = myEffect()
    }
}
```
有了过期函数就可以标识过期这种情况了
```javascript
watch(obj, async(newVal, oldVal, onInvalidate)=>{
    let expired = false
    onInvalidate(()=>{ // 闭包手段传入过期函数，允许vue访问expired
        expired = true
    })
    const res = await fetch('xxx')
    if(!expired) {
        finalData = res // 最新结果
    }
})
```


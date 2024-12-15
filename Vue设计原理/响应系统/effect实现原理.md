## 理解副作用函数
effect其实就是一个副作用函数：一个函数的执行会直接或者间接对其他函数的执行造成影响被称之为副作用函数
比如：修改外层变量、修改视图dom信息等

## 具体实现
### 副作用函数与响应式系统结合
响应系统的作用是监测到数据的变化，然后通知订阅者做一些事情，如：更新视图
而副作用函数effect就是干这些事，它可以更新视图也可以用户自定义做一些操作

理解存储结构：
WeakMap->Map->Set
1. WeakMap<Object->Map>: key为对象，value是Map
2. Map<key->Set>: key为对象的key, value是Set集合
3. Set: 存储effect的一个集合
为啥用WeakMap对象？因为WeakMap是弱引用，不影响垃圾回收工作，当target不被引用的时候将会被回收掉，而Map却不会

如何与响应式系统结合？主要还是在对象拦截器里做工作
1. get: 读值的时候**依赖收集**
2. set: 值发生变化的时候**触发副作用函数**

### 依赖收集(track)
当读到某对象target的某个key的值的时候，若此时存储activeEffect，按照上述存储结构存下target,key,effect的关系
### 触发更新(trigger)
当target的某个key的值更新的时候，查询WeakMap.get(target).get(key)是否存在依赖，有的话就取出来依次执行一遍即可

### 遗留的副作用
```javascript
const data = { ok: true, text: 'hello' }
const obj = new Proxy(data, { /* ... */ })
effect(()=>{
    document.body.innerText = obj.ok ? obj.text : 'not'
})
```
如上例，当obj.ok为true的时候effect会被收集，如果obj.ok变成false的时候则不需要响应式了，这时产生了遗留的副作用
解法：
1. effect内置deps用于存储Set
2. 在effect的回调函数执行之前清除自身的依赖关系(注意下面无限循环的处理)
```javascript
let activeEffect
function effect(fn){
    const effectFn = ()=>{
        cleanup(effectFn)
        activeEffect = effectFn
        fn()
    }
    effect.deps = []
    effectFn()
}
function cleanup(effectFn){
    for(let i=0; i<effectFn.deps.length; i++){
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }
    effectFn.deps.length = 0
}
function trigger(target, key){
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    // effecths && effects.forEach(effectFn=>effectFn()) // 在遍历中执行effectFn, 删一个再加一个会造成无限循环
    const effectsToRun = new Set(effects) // 复制一份去遍历
    effectsToRun && effectsToRun.forEach(effectFn=>effectFn())
}
```
### effect的嵌套处理
只用activeEffect存储当前effectFn的话，遇到effect嵌套场景则会出现外层的effect被内层effect覆盖，导致错乱
所以需要用栈结构代替activeEffect变量，fn执行前effectFn进栈，执行完毕出栈
```javascript
let activeEffect
const effectStack = []
function effect(fn){
    const effectFn = ()=>{
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length-1]
    }
    effect.deps = []
    effectFn()
}
```

### effect内同时存在读取和赋值逻辑，导致无限循环
在执行前判断当前effectFn是否和activeEffect是同一个，非同一个才执行
```javascript
effectsToRun && effectsToRun.forEach(effectFn=>{
    if(activeEffect === effectFn) return
    effectFn()
})
```

### 总结
effect可传入一个回调函数fn，fn会立即执行一次，fn执行过程中读取了被proxy代理过的对象的属性时，会进行依赖收集track(按照WeakMap-Map-Set存储在一个桶bucket)，
当对象属性的值发生变化的时候会从bucket中取到对应的effects遍历执行，这叫trigger

## 调度执行
默认情况下依赖数据发生变化时，会从bucket中取到effects遍历执行，当传入选项schduler的时候，则将执行权交给了用户
调用effect的时候第二个入参作为options挂在effectFn.options上
```javascript
effectsToRun && effectsToRun.forEach(effectFn=>{
    if(activeEffect === effectFn) return
    if(effectFn.options.scheduler){
        effectFn.options.scheduler(effectFn)
    }else{
        effectFn()
    }
})
```
利用上述能力，我们可以轻易实现状态批量更新(只关注状态起始态，不关注中间过渡态)
```javascript
const jobQueue = new Set()
const p = Promise.resolve()
let isFlushing = false
function flushJob(){
    if(isFlushing) return
    isFlushing = true
    p.then(()=>{
        jobQueue.forEach(fn=>fn())
    }).finally(()=>{
        isFlushing = false
    })
}
effect(()=>{
    console.log(obj.foo)
}, {
    scheduler(fn){
        jobQueue.add(fn)
        flushJob()
    }
})
obj.foo++
obj.foo++
```
effect的回调函数只会执行2次，第一次是初次执行，当通过两次obj.foo++触发数据变化的时候会有两个fn被add到jobQueue中
由于jobQueue是Set结构(自带去重)，因此第二次会覆盖第一次变化，并且flushJob被isFlushing控制下只会执行一次
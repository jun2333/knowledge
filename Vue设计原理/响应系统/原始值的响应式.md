## 原始值响应式
由于proxy代理必须是非原始值，所以需要包装成一个对象，这就是ref
```javascript
function ref(val){
    const wrapper = {
        value: val
    }
    Object.defaineProperty(wrapper, '__v_isRef', {
        value: true
    })
    return reactive(wrapper)
}
```

### ref解决响应丢失问题
什么是响应丢失？如下面使用...运算符解构响应式对象obj则会返回一个普通对象,并不具备响应能力；因此将普通对象暴露到模板中的时候并不能正常进行依赖收集，所以渲染副作用函数并没有与obj建立响应式关系
```javascript
export default {
    setup(){
        const obj = reactive({a: 123, b:234})
        setTimeout(()=>{ // 并不会触发重新渲染
            obj.a = 0
        })
        return { // 将数据暴露到模板中
            ...obj
        }
    }
}
```
如果有个对象可以代理访问obj被模板读取就可以解决响应丢失问题了
```javascript
function toRef(obj, key){
    const wrapper = {
        get value(){
            return obj[key]
        },
        set value(val){
            obj[key] = val
        }
    }
    Object.defaineProperty(wrapper, '__v_isRef', {
        value: true
    })
    return wrapper
}
// 批量toRef
function toRefs(obj){
    const ret = {}
    for(let key of obj){
        ret[key] = toRef(obj, key)
    }
    return ret
}
```
这样就解决了响应丢失问题
```javascript
export default {
    setup(){
        const obj = reactive({a: 123, b:234})
        setTimeout(()=>{ 
            obj.a = 0
        })
        return { // 将数据暴露到模板中
            ...toRefs(obj)
        }
    }
}
```
不过模板访问响应数据都要.value访问其值也有一定的心智负担，因此出现了自动脱ref，将setup返回的对象代理下
```javascript
function proxyRefs(target){
    return new Proxy(target, {
        get(target, key, receiver){
            const val = Reflect.get(target, key, receiver)
            return val.__v_isRef ? val.value : val
        },
        set(target, key, newVal, receiver){
            const value = target[key]
            if(value.__v_isRef){
                value.value = newVal
                return true
            }
            Reflect.set(target, key, newVal, receiver)
        }
    })
}
const newObj = proxyRefs(setup()) // 将newObj给到模板使用
```
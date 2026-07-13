# 双向绑定原理

双向绑定是 Vue 的核心特性之一：**数据变化 → 视图更新；视图交互 → 数据变化**。

实现双向绑定的核心是**响应式系统**，它由两部分组成：
1. **数据劫持**：拦截对象的读写操作
2. **发布订阅模式**：数据变化时通知订阅者更新

---

## Vue2 的实现：Object.defineProperty

### 数据劫持

Vue2 使用 `Object.defineProperty` 重写对象的 `get` 和 `set` 方法，实现数据劫持：

```javascript
function defineReactive(obj, key, val) {
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      // 依赖收集：读取数据时记录订阅者
      console.log(`读取 ${key}`)
      return val
    },
    set(newVal) {
      // 触发更新：数据变化时通知订阅者
      if (newVal !== val) {
        console.log(`${key} 从 ${val} 变为 ${newVal}`)
        val = newVal
      }
    }
  })
}

function observe(obj) {
  Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]))
}

const data = { name: 'Vue2', version: 2 }
observe(data)

data.name // 读取 name
data.name = 'Vue2.7' // name 从 Vue2 变为 Vue2.7
```

### 依赖收集与触发

单纯的劫持还不够，需要知道"谁依赖了这个数据"以及"数据变化时通知谁"。Vue2 使用 **Dep** 和 **Watcher** 实现发布订阅：

```javascript
let activeWatcher = null

// 订阅者：Watcher
class Watcher {
  constructor(fn) {
    this.fn = fn
    this.deps = []
  }
  addDep(dep) {
    this.deps.push(dep)
    dep.addWatcher(this)
  }
  update() {
    this.fn()
  }
}

// 发布者：Dep
class Dep {
  constructor() {
    this.watchers = []
  }
  addWatcher(watcher) {
    this.watchers.push(watcher)
  }
  depend() {
    if (activeWatcher) {
      activeWatcher.addDep(this)
    }
  }
  notify() {
    this.watchers.forEach(w => w.update())
  }
}

// 改造 defineReactive
function defineReactive(obj, key, val) {
  const dep = new Dep()
  Object.defineProperty(obj, key, {
    get() {
      dep.depend() // 依赖收集
      return val
    },
    set(newVal) {
      if (newVal !== val) {
        val = newVal
        dep.notify() // 触发更新
      }
    }
  })
}

// 使用
const data = { count: 0 }
observe(data)

const watcher = new Watcher(() => {
  console.log(`视图更新：count = ${data.count}`)
})

activeWatcher = watcher
data.count // 触发 get，建立依赖关系
activeWatcher = null

data.count = 1 // 触发 set，通知 watcher 更新
// 输出：视图更新：count = 1
```

### 数组的处理

`Object.defineProperty` 无法检测数组索引的变化，Vue2 通过**重写数组方法**解决：

```javascript
const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']

arrayMethods.forEach(method => {
  const original = Array.prototype[method]
  Object.defineProperty(Array.prototype, method, {
    value: function(...args) {
      const result = original.apply(this, args)
      // 触发更新
      console.log(`数组 ${method} 操作，触发更新`)
      return result
    }
  })
})
```

同时提供 `$set` 和 `$delete` API 处理属性新增/删除：

```javascript
Vue.set(obj, 'newKey', 'newValue')
Vue.delete(obj, 'key')
```

### Vue2 的局限

1. **无法检测属性新增/删除**：需要 `$set` / `$delete`
2. **无法检测数组索引变化**：需要重写数组方法
3. **性能问题**：初始化时递归遍历所有属性，大对象性能差
4. **嵌套对象**：需要深度递归代理

---

## Vue3 的实现：Proxy

### 为什么用 Proxy

Proxy 可以拦截对象的**所有操作**（读写、删除、枚举等），解决了 Vue2 的所有局限：

| 能力 | Object.defineProperty | Proxy |
|------|----------------------|-------|
| 属性读写 | ✅ | ✅ |
| 属性新增 | ❌ | ✅ |
| 属性删除 | ❌ | ✅ |
| 数组索引 | ❌ | ✅ |
| 嵌套对象 | 需要递归 | 按需代理 |

### 依赖收集与触发

Vue3 使用 `track` 和 `trigger` 函数，配合 `WeakMap → Map → Set` 的存储结构：

```javascript
// 存储结构：WeakMap<Object, Map<key, Set<effect>>>
const bucket = new WeakMap()
let activeEffect = null

// 依赖收集
function track(target, key) {
  if (!activeEffect) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  activeEffect.deps.push(deps)
}

// 触发更新
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  const effectsToRun = new Set(effects)
  effectsToRun.forEach(effectFn => {
    if (effectFn !== activeEffect) {
      effectFn()
    }
  })
}
```

### 完整实现

```javascript
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key) // 依赖收集
      const res = Reflect.get(target, key, receiver)
      // 深响应：递归代理
      return typeof res === 'object' && res !== null ? reactive(res) : res
    },
    set(target, key, newVal, receiver) {
      const oldVal = target[key]
      const result = Reflect.set(target, key, newVal, receiver)
      if (oldVal !== newVal) {
        trigger(target, key) // 触发更新
      }
      return result
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key)
      trigger(target, key) // 触发更新
      return result
    }
  })
}

// 副作用函数
function effect(fn) {
  const effectFn = () => {
    activeEffect = effectFn
    fn()
    activeEffect = null
  }
  effectFn.deps = []
  effectFn()
}

// 使用
const data = reactive({ count: 0, nested: { value: 1 } })

effect(() => {
  console.log(`视图更新：count = ${data.count}`)
})

data.count = 1 // 触发更新
data.nested.value = 2 // 深层属性也能触发
```

### 深层响应与性能优化

Vue3 采用**按需代理**策略，只在访问时才递归代理，而不是初始化时全部代理：

```javascript
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key)
      const res = Reflect.get(target, key, receiver)
      // 只在访问时才递归代理，而不是初始化时全部代理
      return typeof res === 'object' && res !== null ? reactive(res) : res
    },
    // ...
  })
}
```

这样大对象的性能更好，因为不需要一次性遍历所有属性。

---

## Vue2 vs Vue3 对比

| 维度 | Vue2 | Vue3 |
|------|------|------|
| **劫持方式** | `Object.defineProperty` | `Proxy` |
| **数组支持** | 需要重写方法 | 原生支持 |
| **属性新增/删除** | 无法检测，需要 `$set`/`$delete` | 原生支持 |
| **嵌套对象** | 初始化时递归遍历 | 按需代理，性能更好 |
| **兼容性** | 支持 IE | 不支持 IE（Proxy 无法 polyfill） |
| **存储结构** | Dep + Watcher | WeakMap → Map → Set |

---

## 总结

双向绑定的本质是：
1. **数据劫持**：拦截对象的读写操作
2. **依赖收集**：读取数据时记录"谁依赖了我"
3. **触发更新**：数据变化时通知"依赖我的人"更新

Vue2 到 Vue3 的演进思路：
- 从 `Object.defineProperty` 到 `Proxy`，解决属性新增/删除、数组索引等局限
- 从"初始化时递归遍历"到"按需代理"，提升大对象性能
- 从 `Dep + Watcher` 到 `WeakMap → Map → Set`，存储结构更清晰

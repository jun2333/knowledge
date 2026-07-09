## vue2.x生命周期

### initMixin

给Vue原型挂载_init函数，当实例化Vue时会被执行

_init函数主要是进行一些初始化，其中包括合并options、初始化实例主要属性、初始化事件、初始化render相关方法如vm. _ c、callHook(beforeCreate)、初始化injections、初始化state、初始化provide、callHook(created)、执行$mount(在web平台入口文件定义，实际上是调用lifecycle中的mountComponent)方法进行挂载

#### initInjections

1. resolveInject方法进行解析inject，主要是通过vm.$parent向上检索provide的内容
2. 将解析到的inject的结果进行defineReactive处理

#### initState

包括initProps、initMethods、initData、initComputed、initWatch

##### initComputed

1. 实例添加属性_computedWatchers用于存储Watcher实例

```javascript
function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
```

2. 劫持数据，改写get方法如下computedGetter函数定义，通过dirty控制缓存

```javascript
function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}
```

#### initProvide

vm设置_provided属性

```javascript
function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}
```

#### mountComponent

1. callHook(bm)
2. 定义组件更新回调`updateComponent = () => { _update(vm. _ render()) }`
3. new Watcher(组件级别观察者)：此处传入before回调，若组件已挂载则callHook('beforeUpdate')
4. callHook(m)

### stateMixin

- 给Vue原型添加$watch、$set、$delete方法
- 给Vue原型添加$data、$props属性

#### $set和$delete实现上主要是针对数组和对象两种情况添加或者删除，并defineReactive操作的内容

数组的处理主要是splice，对象则直接对属性赋值即可

#### $watch

实例化一个Watcher，返回teardown方法

```javascript
Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}
```

### eventsMixin

给Vue原型添加$on、$emit、$once、$off方法

事件实现主要是在vue实例上添加_events属性用于存储事件，结构为 eventName -&gt; fn数组，当调用$on时注册事件，将回调函数存在数组中，当$emit时将数组中的回调函数全部遍历调用，$off根据入参删除相应eventName的回调函数，不传参则清空 _events对象，$once则改写回调函数，执行之前先调$off

### lifecycleMixin

给Vue原型添加_update、$forceUpdate、$destroy方法

_update内部主要调用patch方法；$forceUpdate是调用_ _update方法；$destroy则会触发destory相关钩子函数、off事件、teardown观察者、patch进行卸载等操作

### renderMixin

给Vue原型添加$nextTick、_render(渲染函数)方法

#### _render

调用渲染函数生成vnode，返回vnode

#### $nextTick

采取异步方式将回调延迟到下次事件循环前执行

可选宏任务和微任务，宏任务是用setTimeout

微任务按照平台兼容性按照Promise->MutationObserver->setImmediate->setTimeout进行降级处理


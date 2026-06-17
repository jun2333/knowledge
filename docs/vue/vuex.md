## vuex实现原理

### 用法

实例化一个Vuex.Store对象，并作为Vue实例的options传入。完成Vuex注册。

```javascript
const store = new Vuex.Store({
    state:{},
    getter:{},
    mutations:{},
    actions:{},
    plugins:[],
    modules:{}
})
const app = new Vue({
    el:'#app',
    store
})
```

### 注册store过程（Store类实例化过程）

1. 调用内部install(vue)，在Vue的beforeCreate钩子添加函数，作用是将options.store挂载到Vue实例的$store属性上。
2. 收集modules。ModuleCollection负责modules的收集，ModuleCollection内部调用register方法进行注册，整个过程是从根选项开始，若存在modules属性则遍历并递归调用register进行注册。register方法代码如下：

```javascript
register (path, rawModule, runtime = true) {
    if (__DEV__) {
      assertRawModule(path, rawModule)
    }

    const newModule = new Module(rawModule, runtime)
    if (path.length === 0) {
      this.root = newModule
    } else {
      const parent = this.get(path.slice(0, -1))
      parent.addChild(path[path.length - 1], newModule)
    }

    // register nested modules
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }
```

每个module都是由Module的实例进行存储管理，其内部暴露state属性，以及对子代的操作方法：getChild、addChild、removeChild、hasChild，forEachGetter、forEachAction、forEachMutation、forEachChild等遍历方法。

3. 调用installModule对module进行安装注册，forEachGetter、forEachAction、forEachMutation遍历getter、actions、mutations进行注册(如mutations会的方法会被封装并存储在store的_mutations私有属性中)，forEachChild遍历module子代递归调用installModule进行安装注册。
4. 调用resetStoreVM初始化store的Vue实例，resetStoreVM关键代码：

```javascript
function resetStoreVM (store, state, hot) {
    const wrappedGetters = store._wrappedGetters
  	const computed = {}
  	forEachValue(wrappedGetters, (fn, key) => {
    	// use computed to leverage its lazy-caching mechanism
    	// direct inline function use will lead to closure preserving oldVm.
    	// using partial to return function with only arguments preserved in closure environment.
    	computed[key] = partial(fn, store)
    	Object.defineProperty(store.getters, key, {
      		get: () => store._vm[key],
      		enumerable: true // for local getters
    	})
  	})
    store._vm = new Vue({
        data: {
          $$state: state
        },
    	computed
  })
}
```

### 关键方法原理介绍

#### subscribe

用于注册对mutations的订阅，代码如下：

```javascript
subscribe (fn, options) {
   return genericSubscribe(fn, this._subscribers, options)
}
function genericSubscribe (fn, subs, options) {
  if (subs.indexOf(fn) < 0) {
    options && options.prepend
      ? subs.unshift(fn)
      : subs.push(fn)
  }
  return () => {
    const i = subs.indexOf(fn)
    if (i > -1) {
      subs.splice(i, 1)
    }
  }
}
```

#### subscribeAction

用于注册对actions的订阅，代码如下：

```javascript
//fn提供before和after函数用于异步action前后调用
subscribeAction (fn, options) {
    const subs = typeof fn === 'function' ? { before: fn } : fn
    return genericSubscribe(subs, this._actionSubscribers, options)
}
function genericSubscribe (fn, subs, options) {
  if (subs.indexOf(fn) < 0) {
    options && options.prepend
      ? subs.unshift(fn)
      : subs.push(fn)
  }
  return () => {
    const i = subs.indexOf(fn)
    if (i > -1) {
      subs.splice(i, 1)
    }
  }
}
```

#### commit

以同步方式调用调用mutations的方法，关键代码如下：

```javascript
commit(_type, _payload, _options){
    const mutation = { type, payload }
    const entry = this._mutations[type]
    this._withCommit(() => {
      entry.forEach(function commitIterator (handler) {
        handler(payload)
      })
    })
    //执行订阅者的回调
    this._subscribers
      .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
      .forEach(sub => sub(mutation, this.state))
}
```



#### dispatch

以异步方式调用actions中的方法，关键代码如下：

```javascript
dispatch (_type, _payload) {
    const action = { type, payload }
    const entry = this._actions[type]
    
    try {
      this._actionSubscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
        .filter(sub => sub.before)
        .forEach(sub => sub.before(action, this.state))
    } catch (e) {
      if (__DEV__) {
        console.warn(`[vuex] error in before action subscribers: `)
        console.error(e)
      }
    }
    
    const result = entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)
    
    return new Promise((resolve, reject) => {
      result.then(res => {
        try {
          this._actionSubscribers
            .filter(sub => sub.after)
            .forEach(sub => sub.after(action, this.state))
        } catch (e) {
          if (__DEV__) {
            console.warn(`[vuex] error in after action subscribers: `)
            console.error(e)
          }
        }
        resolve(res)
      }, error => {
        try {
          this._actionSubscribers
            .filter(sub => sub.error)
            .forEach(sub => sub.error(action, this.state, error))
        } catch (e) {
          if (__DEV__) {
            console.warn(`[vuex] error in error action subscribers: `)
            console.error(e)
          }
        }
        reject(error)
      })
    })
}
```

### 总结

从上面过程可以看出，Vuex主要是通过内部Vue实例代理state数据；getter则是利用Vue的computed特性，当依赖数据发生变化时会重新计算；store会提供commit和dispatch对mutations和actions的方法进行调用。


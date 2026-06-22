## 异步组件解决什么问题?
一般来说用户可利用import等函数自行实现异步组件
但考虑到如下体验，异步组件的设计还是比较复杂的，因此框架封装了异步组件
1. 加载中状态如何展示？
2. 加载失败的如何展示？
3. 加载失败是否需要重试？
4. 是否可以延迟加载，避免加载过快造成的闪烁？

### defineAsyncComponent
defineAsyncComponent其实就是一个高阶组件，传入一个options，内部setup执行loader加载，返回一个函数作为渲染函数
options里有loader(Promise)、loadingComponent、timeout、errroComponent、delay、onError
#### loading状态
展示用户传入的loadingComponent
#### 超时展示错误组件
timeout、errroComponent
内部设置定时器，通过状态控制渲染
#### 延时展示
delay
#### 加载错误
onError(retry, fail, retries)
```javascript
function defineAsyncComponent(options) {
  if (typeof options === 'function') {
    options = {
      loader: options
    }
  }

  const { loader } = options

  let InnerComp = null

  let retries = 0
  function load() {
    return loader()
      .catch((err) => {
        if (options.onError) {
          return new Promise((resolve, reject) => {
            const retry = () => {
              resolve(load())
              retries++
            }
            options.onError(retry, reject, retries)
          })
        } else {
          throw error
        }
      })
  }

  return {
    name: 'AsyncComponentWrapper',
    setup() {
      const loaded = ref(false)
      const error = shallowRef(null)
      const loading = ref(false)

      let loadingTimer = null
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true
        }, options.delay);
      } else {
        loading.value = true
      }

      load()
        .then(c => {
          InnerComp = c
          loaded.value = true
        })
        .catch((err) => {
          console.log(err)
          error.value = err
        })
        .finally(() => {
          loading.value = false
          clearTimeout(loadingTimer)
        })



      let timer = null
      if (options.timeout) {
        timer = setTimeout(() => {
          const err = new Error(`Async component timed out after ${options.timeout}ms.`)
          error.value = err
        }, options.timeout)
      }

      const placeholder = { type: Text, children: '' }

      return () => {
        if (loaded.value) {
          return { type: InnerComp }
        } else if (error.value && options.errorComponent) {
          return { type: options.errorComponent, props: { error: error.value } }
        } else if (loading.value && options.loadingComponent) {
          return { type: options.loadingComponent }
        } else {
          return placeholder
        }
      }
    }
  }
}
```

## 函数式组件
性能比有状态组件稍微好点，因为不用初始化状态和生命周期的处理
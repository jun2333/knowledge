## 双向绑定原理

数据劫持+发布订阅设计模式

#### 数据劫持：

vue2.x通过Object.defineProperty重写get、set方法进行拦截

vue-next通过Proxy进行深度劫持

#### 发布订阅模式

vue2.x:

读取数据(触发get方法)时进行依赖收集，将订阅此数据的观察者Watcher会添加Dep实例dep到自身的deps属性中，同时自身保存到Dep实例dep的subs属性中，当数据发生变更(即set方法被触发时)会调用dep.notice方法通知Watcher进行更新

vue-next

track函数进行依赖收集，使用一个targetMap`<WeakMap>`变量来存储每个响应式对象，target->Map，Map下是key->Set结构，Set储存effects对象，以上为收集依赖过程会在get读取数据的时候完成；当数据发生变动的时候会调用triggle函数，作用是通知所有的观察者进行视图更新，即effects的回调函数会执行。
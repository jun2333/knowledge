## Batched Updates
批量更新：多个更新的合并
区别与lanes的概念，lanes指的是多个lane的集合
### React Batched Updates 发展史
v18之前：半自动批量更新or手动批量更新
提供了batchedUpdates(fn, a)方法：主要通过执行fn之前设置excutionContext为BatchedContext，执行完之后恢复之前的上下文的方式实现
由于只能处理同步代码，所以被称之为**半自动批量更新**
同时提供了batchedUpdates暴露给用户使用，也可以手动调用

v18:自动批量更新
对于SyncLanes任务，react会在一次微任务中被调度执行(不用关心中间态，可以用Set存储Lanes，同样的优先级会被去重，vue3都是这样做的)
对于非SyncLanes任务，调度器会判断优先级相同则退出调度，因此多次优先级相同的调度(不管同步异步)都只会执行第一次的调度
### 各框架Batched Updates表现
Concurrent Mode React与其他框架以及Legacy Mode React表现不一样，拥有并发模式的React是在宏任务中消费task，因此在微任务后拿不到批量更新的结果，vue3、svelte以及旧版本的React就可以在微任务后取到最后的结果(如vue的nextTick)
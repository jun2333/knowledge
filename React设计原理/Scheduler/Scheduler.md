## Scheduler实现
### 工作流程
按照任务优先级，分为同步更新和异步更新；同步走workLoopSync；异步走workLoopConcurrent
上面两个函数都会**循环消费**任务列表(taskQueue)的任务，区别在于异步情况下循环的终止条件多了shouldYield()的判断
上面两个函数都会统一被scheduleCallback统一调度

#### scheduleCallback
入参会传入5个优先级和回调函数(也就是上述俩函数)
这个函数会被宏任务调用，也就是messageChannel(node.js环境下是setImmediaite)
1. 创建任务task
2. 根据优先级对应的超时时间计算出任务的**过期时间**
3. 对比task过期时间跟现在时间的差走不同逻辑，未到期走延时任务调度逻辑4，到期走正常任务调度逻辑5
4. task入timerQueue，调用requestHostTimeout
5. task入taskQueue，调用requestHostCallback

#### requestHostTimeout
使用延时时间调用setTimeout，回调函数传handleTimeout

#### handleTimeout
1. 调用advanceTimers
2. 调用requestHostCallback

#### advanceTimers
作用：从timerQueue中取出一个到期任务放到taskQueue，所以react调度器实际上是刷taskQueue的任务

#### requestHostCallback
实际上是flushWork

#### flushWork和workLoop
flushWork会先暂停正在执行的延时任务，然后调用workLoop
workLoop则是在一个循环中刷任务了，直到任务空为止(异步下还得看是否shouldYield)
注意每次执行完一个任务都会调advanceTimers更新到期任务

#### shouldYield
两个判断条件：
1. 对比任务过期时间
实际上就是取taskQueue第一个任务firstTask跟当前正在执行的任务进行对比
当他们不是同一个任务，并且当前任务的优先级低于firstTask，则返回true终止workLoop循环
2. time slice耗尽

#### 总结
综上流程涉及**两个循环**：
1. taskQueue的生产到消费(异步循环)
2. workLoop具体消费过程(同步循环)
简要概括上述流程:
1. 确认任务优先级，每个优先级有各自对应的超时时间
2. 创建任务，根据过期时间决定是延时调度还是立即调度
3. 循环调度任务，同步场景不可暂停，异步场景可暂停

### 任务队列
两个任务队列：timerQueue(延时任务)和taskQueue(未配置delay的task)
taskQueue的任务有一部分来自于超时的timerQueue(当task的delay时间到期)
区分delay和expiration time:delay为task的延时时间，expirationTime为task的优先级(越小代表优先级越高)

### 优先级队列实现
使用**小顶堆**这种数据结构存储优先级队列，优先级最高的在最顶端
push:推入
pop:从堆顶取出数据
peek:获取**排序最小的值**对应的节点
其中pop,push涉及堆化操作，时间复杂度O(logn)；peek获取堆顶节点时间复杂度O(1)

### 宏任务选择
备选项：requestIdleCallback(rIC)、requetAnimationFrame(rAF)
rIC:
1. 浏览器兼容性问题
2. 执行频率不稳定(如切换浏览器Tab后，频率会大幅降低)
3. 应用场景局限性(只有低优先没有高优先)
rAF: 执行频率跟帧有关，频率太低不合适

最终方案按照是否支持依次选择如下api：
setImmediate
MessageChannel
setTimeout(fn, 0)----各浏览器在嵌套调用setTimeout时有设置最小延迟时间，所以导致Time Slice直接有被浪费的时间




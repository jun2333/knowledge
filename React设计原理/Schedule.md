## Scheduler实现
### 简易实现
schedule函数：调度函数，负责选出最高优先级task并生成callback存入task，若前后优先级一致则return(退出调度，不生成新的callback后面复用)
若无高优任务，或者有高优任务但与当前任务优先级不一致，则移除当前任务(callback置为null)
schelduleCallback: 以某一优先级调度任务，返回callback

perform函数：具体的任务执行函数，先遍历执行完高优任务，非同步任务进行调度，若调度前后任务callback没变化，则返回自身继续给schedule调度
遍历的条件为：needSync && !shouldYield() && work.count

### Scheduler实现
两个任务队列：timerQueue(延时任务)和taskQueue(未配置delay的task)
taskQueue的任务有一部分来自于超时的timerQueue(当task的delay时间到期)
区分delay和expiration time:delay为task的延时时间，expirationTime为task的优先级(越小代表优先级越高)
流程概览：
1. 根据是否传delay参数决定任务要进哪个队列
2. 当timerQueue第一个任务时间到期后推入到taskQueue中
3. 执行requestHostCallback，它会在新的宏任务重执行workLoop方法
4. workLoop方法会循环消费taskQueue的任务
循环终止条件是：
taskQueue不存在task
time slice耗尽且currentTask.expirationTime < currentTime(过期的任务视为同步任务需要立即执行)
5. 循环中断后若taskQueue不为空则进入步骤3，timerQueue不为空就进入步骤2
综上流程涉及**两个循环**：
1. taskQueue的生产到消费(异步循环)
2. workLoop具体消费过程(同步循环)
### 优先级队列实现
使用**堆**这种数据结构存储优先级队列，优先级最高的在最顶端
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
setTimeout(fn, 0)----各浏览器有设置最小延迟时间，所以导致Time Slice直接有被浪费的时间

## Lane模型
### Scheduler与React结合
Scheduler与React优先级不通用，需要转换
Lanes->eventPriority
eventPriority->Lanes
### 基于expiration time算法
通过给task添加expirationTime属性(过期时间)进行任务排序，可表达优先级；同时通过接界定一个时间范围也可以选定多个任务作为一批次
通过优先级设定很好的解决了CPU密集型场景中
但用于Batched Updated并不是很理想，通过时间范围仅仅能圈出范围内的任务作为一个批次，范围外的就不行；并且将优先级和批次逻辑耦合在了一起，并不是最佳方案
### lane算法
用32位二进制描述任务的lane，lane可以描述任务的优先级：越低的位代表越高优先级
一批lane被称为lanes，lanes可以描述任务的批次
通过lane的设计很好的解耦了优先级和批次，能更好的处理I/O密集型任务

## Lane模型在React中的应用
1. 初始化lanes
是否为同步优先级->是否是render阶段更新->transition相关lane->用户手动设置的lane->事件相关的lane
2. lanes冒泡(从FiberNode到FiberRootNode)
调用markUpdateLaneFromFiberToRoot，从发生update的fiberNode开始向上遍历，逐个附加lane到父节点的childLanes中
冒泡的意义在于优化，比如说某fiberNode的子孙节点不包含本次update的lane的话，则跳过子孙节点的render流程
3. 调度FiberRootNode
a. 选定本批次lanes:pendingLanes里高优的组成基础lanes+suspense相关的lanes+纠缠的lanes
b. 调度策略:
SyncLane->会用将任务放在一个syncQueue，然后集中在一个微任务中执行完，不可中断；
非SyncLane->采取并发策略，判断是否开启time slice决定render是否可中断；
饥饿问题：初始化lanes的阶段会根据**交互发生时间**为task设置过期时间，markStarvedLanesAsExpired接收fiberNode和交互发生时间两个入参
它为没有设置过期时间且不属于挂起或解除挂起状态的lane设置过期时间存在root.expirationTimes(长度为31的数组)
判断已设置过期时间的lane是否过期，过期则在root.expiredLanes中标记它的lane

影响time slice是否开启的条件有三个：不包含**阻塞的lane**、不包含**过期的lane**、传入的didTimeout不为true
let shouldTimeSlice = !includesBlockingLane(root, lanes) && !includesExpiredLane(root, lanes) && !didTimeout

### pending lanes工作流程
1. 交互发生后产生新的lane，先进行lane冒泡，最终lane会被收集到pendingLanes
2. render的beginWork阶段lane会被消费，消费后需要将对应fiberNode的lanes重置为Nolanes，在completeWork阶段(归的过程)向上flags 冒泡过程去更新祖先的childLanes，遇到消费失败场景(如Susepense挂起了)会在completeWork阶段被重置，代表本次未消费
3. 到commit阶段，进行lanes收尾工作包括刷新pendingLanes值、成功消费的lanes清除其过期时间和纠缠的lane等

## Batched Updates
批量更新：多个更新的合并
区别与lanes的概念，lanes指的是多个lane的集合
### React Batched Updates 发展史
v18之前：半自动批量更新or手动批量更新
提供了batchedUpdates(fn, a)方法：主要通过执行fn之前设置excutionContext为BatchedContext，执行完之后恢复之前的上下文的方式实现
由于只能处理同步代码，所以被称之为**半自动批量更新**
同时提供了batchedUpdates暴露给用户使用，也可以手动调用

v18:自动批量更新
对于SyncLanes任务，react会在一次微任务中被调度执行(不用关系中间态，可以用Set存储Lanes，同样的优先级会被去重，vue3都是这样做的)
对于非SyncLanes任务，调度器会判断优先级相同则退出调度，因此多次优先级相同的调度(不管同步异步)都只会执行第一次的调度
### 各框架Batched Updates表现
Concurrent Mode React与其他框架以及Legacy Mode React表现不一样，拥有并发模式的React是在宏任务中消费task，因此在微任务后拿不到批量更新的结果，vue3、svelte以及旧版本的React就可以在微任务后取到最后的结果
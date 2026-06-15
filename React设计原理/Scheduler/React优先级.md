## 两套优先级和一套转换体系
LanePriority和SchedulerPriority
ReactPriorityLevel
LanePriority和SchedulerPriority的相互转换都需要ReactPriorityLevel来进行中转

## Lane模型
### 基于expiration time算法
通过给task添加expirationTime属性(过期时间)进行任务排序，可表达优先级；同时通过接界定一个时间范围也可以选定多个任务作为一批次
通过优先级设定很好的解决了CPU密集型场景中
但用于Batched Updated并不是很理想，通过时间范围仅仅能圈出范围内的任务作为一个批次，范围外的就不行；并且将优先级和批次逻辑耦合在了一起，并不是最佳方案
### lane算法
用32位二进制描述任务的lane，lane可以描述任务的优先级：越低的位代表越高优先级
一批lane被称为lanes，lanes可以描述任务的批次
**通过lane的设计很好的解耦了优先级和批次，能更好的处理I/O密集型任务**
### lane优势
1. 将批量处理与优先级解耦，更好处理cpu密集型任务
2. 用二进制变量，利用位掩码的特性，运算速度快

## Lane模型在React中的应用
1. 初始化lanes
是否为同步优先级->是否是render阶段更新->transition相关lane->用户手动设置的lane->事件相关的lane
2. lanes冒泡(从FiberNode到FiberRootNode)
调用markUpdateLaneFromFiberToRoot，从发生update的fiberNode开始向上遍历，逐个附加lane到父节点的childLanes中
**冒泡的意义在于优化，比如说某fiberNode的子孙节点不包含本次update的lane的话，则跳过子孙节点的render流程**
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
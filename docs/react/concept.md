## React理念
构建**快速响应**大型应用的首选框架

## CPU瓶颈
svelte和vue的方向是在AOT过程中尽可能优化运行时代码，减少代码量
react则只能在运行时上下功夫，具体做法是：将VDOM的工作过程分成多个**不会导致掉帧**的宏任务，这一技术被称之为Time Slice(时间切片)

## I/O瓶颈
对于前端应用来说最大的I/O瓶颈是网络延时
为给用户更好的体验，则除了提高网络性能之外，最大程度去降低由于网络延时带来的人机交互卡顿现象
因此react的做法是
1. 为不同操作造成的自变量变化赋予优先级
2. 所有优先级统一调度，优先处理最高的
3. 如果有任务正在进行，如处理VDOM相关工作，遇到高优任务进来能够中断当前任务去执行高优任务

React底层需要实现：
1. 用于调度优先级的调度器
2. 用于调度器的调度算法
3. 支持可中断的VDOM实现

## 新旧架构介绍
### V15
Reconciler----VDOM实现，计算UI变化(递归方式遍历)
Renderer----负责渲染UI变化到宿主环境

### V16+
Scheduler----调度器，用于调度优先级任务
Reconciler(新)----计算UI变化(手动递归遍历)
Renderer----负责将UI渲染到宿主环境

在新架构中更新流程递归变成**可中断的循环过程**，每次循环都会判断当前Time Slice是否还有剩余时间，没有剩余时间则将主线程交出给渲染流水线，等待下一次宏任务进行

### 特性迭代
Sync->Async->Concurrent Mode->Concurrent Feature
如上四个特性通过渐进开启方式
v15及以前是Sync(旧架构)
v16、v17默认未开启并发的异步更新(新架构)
未开启并发更新，但启用了一些新功能如autumatic batching(新架构)
开启并发更新(新架构)

v18以前是提供三种开发模式
1. legacy mode：通过ReactDOM.render方式创建应用遵循该模式
2. blocking mode：通过ReactDOM.createBlockingRoot(rootNode).render创建应用遵循该模式，默认开启StrictMode
3. concurrent mode：通过ReactDOM.createRoot(rootNode).render创建的遵循该模式，默认开启StrictMode

v18之后则不再提供以上三种模式，而是以**是否使用并发特性**作为**是否开启并发更新**的依据

### 并发特性
startTransition、useTransition、useDeferredValue

## Fiber架构
Fiber是一个基于**优先级策略**和**帧间回调的循环任务调度算法**的架构方案，目的是解决大型任务卡顿问题
核心思想是**任务拆分和协同**，主动把执行权交给主线程，使得主线程有时间处理高优先级任务

主要特性：
1. 增量渲染(把渲染任务分割成块，均匀分布到帧多帧)
2. 可以暂停，终止，复用渲染任务
3. 给不同类型的更新赋予优先级
4. 并发能力

life of a frame
1. 用户交互输入事件(Input Events)
2. js Timers
3. Begin frame:每一帧事件，如window resize,scroll或者media query change
4. 帧回调rAF
5. Layout
6. Paint
7. idle:rIC回调

v15版本前的痛点:
1. 递归调用，执行栈越来越深
2. 同步更新虚拟DOM，不可中断，中断后也不可恢复
3. js执行时间长，长时间占用主线程，造成页面卡顿

### FiberNode含义
1. 作为架构，旧架构Reconciler通过递归方式执行，新架构Reconciler基于FiberNode实现，手动递归。也被成为Fiber Reconciler
2. 作为**静态数据结构**，存储元素类型，DOM元素等信息
3. 作为**动态数据单元**，存储变化的数据和要执行的工作(数据增删改查、ref更新、副作用)

### FiberNode数据结构
key:节点唯一值，用于复用
type:节点类型
return:指向父节点
sibling:右边的兄弟节点
child:第一个子节点

### 双缓存机制
mount时构建Fiber Tree：
current最开始指向FiberRootNode；
按照DFS顺序依次生产wip FiberNode并连接它们的关系
完成渲染之后，current指向wip fiberNode完成双缓存切换
update时更新Fiber Tree:
按照jsx返回的节点按照DFS顺序依次生成新的wip fiberNode;
完成渲染之后current再次指向新的wip fiberNode

current fiberNode与wip fiberNode相互通过alternate属性访问 




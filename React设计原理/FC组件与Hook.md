## Function Component 
FC和Hook的出现解决了Class CP时代的两大痛点：
1. 业务逻辑分散
2. 有状态的逻辑复用困难

## Suspense组件
### 应用场景
1. React.lazy
2. 配合startTransition、useTransition的使用:Transtion可以降低组件优先级，使Suspense的fallback不被渲染
3. Server Component:服务端组件获取数据之后会返回给客户端以**序列化的jsx**,这个过程可以由Suspense处理中间状态
4. Selective Hydration(选择性注水)
采用SSR服务端输出的是HTML字符串，浏览器接收之后会进行一些初始工作，如创建Fiber Tree、绑定事件等，这个过程被称之为Hydration(注水)
Hydration有两个缺点：
a. 页面不同部分优先级有差异，但是Hydration对他们一视同仁
b. 整个应用完成Hydration之后才能进行交互
因此可以结合Suspense进行选择性注水：
被Suspense包裹的组件在Hydration过程中优先级低且如果**产生交互**则会被提高优先级

### 工作流程
Suspense有两种状态：suspend(挂起)、非suspend
1. suspend状态：beginWork返回fallback对应的fiberNode,Offscreen对应的fiberNode，mode为hidden
2. 非suspend状态：beginWork返回Offscreen对应的fiberNode，mode为visile

Suspense组件在渲染过程
1. beginWork进入Suspense组件时返回Offscreen对应fiberNode，mode为visile
2. 继续子组件beginWork，当render流程(try..catch)捕获到Promise的时候(Promise会被当成错误抛出来),为最近的Suspense组件标记ShouldCapture flag(界定unwind流程终止)
3. unwind流程(向上遍历重置状态,Class CP的错误捕获也有这个阶段),直到遇到符合条件的Suspense组件或者ErrorBoundary终止unwind
4. 从终止unwind的fiberNode继续beginWork，当进入commit阶段会渲染挂起状态应该展示的UI(fallback)
5. 当Promise状态请求成功，回调自动触发一次update，Suspense组件再次进入render阶段
所以，整个完整的工作流程一共会发生三次beginWork:
1. mount时beginWork,返回Offscreen mode为visile
2. 由于unwind，第二次进入beginWork,返回fallback对应的fiberNode
3. promise请求成功，触发更新，第三次进入beginWork，返回Offscreen mode为visile

## Hooks与Update以及FiberNode的关系
hooks作为单向无限链表存在fiberNode的memoizedState中
hooks也有自己的memoizedState用于保存自身的状态(值)
update是单向循环链表存在hook的queue中

### 简易的useState实现
1. useState执行逻辑：
1.1 mount----创建hook，加入fiberNode的memoizedState链表尾部，wip hook指向新建的hook；update----拿到wip hook,并将wip hook指向hook.next
1.2 刷queue.pending的update计算
1.3 返回数组[state, setState]  setState预置了hook.queue参数
2. setState执行逻辑：
2.1 创建一个update
2.2 加到queue.pending中
2.3 schedule调度
3. schedule调度：会重新render，重新执行FC，相当于重新执行useState函数，此时执行的useState函数会逐个计算新的update

### 流程概览
1. dispatcher
hook的调用都是由dispatcher调用，dispatcher里有很多内置hook，如useState、useReducer等
dispacher会按照mount和update分成两种：HookDispatcherOnMount/HookDispatcherOnUpdate
react内部会通过检测Hook执行上下文为ReactCurrentDispatcher.current设置对应的dispatcher
这样设计的好处在于，当嵌套调用hook的时候可以给currentDispatcher设置成抛出错误提示信息的相关dispatcher，不需要将抛错提示信息耦合在各个dispatcher里面

2. Hook数据结构
memoizedState----用于保存hook的数据，不同的hook保存的结构不一样，如useEffect会保存callback和deps
baseState----上次计算的结果
baseQueue----上次render后的update链表
queue----存pending的update链表、lastRenderReducer、dispatch等相关信息

3. 执行流程
3.1 根据执行上下文，确定ReactCurrentDispatcher.current的值
3.2 mount流程执行mountXXX(XXX为hook名称),update流程执行updateXXX
mount流程跟简易useState mount流程差不多，新建一个hook加入到hook链表中
update则分两种情况：常规的更新会克隆当前hook作为wip hook返回，render阶段触发的更新会直接返回上一轮创建的wip hook
3.3 其他情况hook执行，依据ReactCurrentDispatcher.current指向做不同处理

4. useState和useReducer
总结来说useState是内部预置了reducer的useReducer
mount阶段useState会在hook.queue.lastRenderReducer存basicStateReducer  而useReducer则存用户传进来的reducer
```javascript
function basicStateReducer(state, action){
    return typeof action === 'function' ? action(state) : action
}
```
update阶段它们都是updateReducer,它接收一个reducer的入参，计算完之后会将reducer存入lastRenderReducer

5. effect相关Hook
如：
useEffect：commit执行之后异步执行，不阻塞视图渲染
useLayoutEffect：commit子阶段Layout同步执行，一般用于执行DOM相关操作
useInsertionEffect：commit子阶段Mutation同步执行，无法访问DOM，专门为css-in-js设计的

memoizedState数据结构：
tag----区分effect类型(Passive|Layout|Insertion) 决定什么时机调用
create----effect回调函数
destroy----effect销毁函数
deps----依赖项
next----与当前组件其他effect形成单向环形链表

工作流程：
声明阶段-调度阶段(useEffect独有)-执行阶段

声明阶段：
主要是比较deps是否变化(浅比较),不管deps是否变化都会调用pushEffect;由此保证effect数量和顺序的稳定
pushEffect的作用是创建effect并建立环形链表
当deps变化时，调用pushEffect入参会传入HasEffect的tag，这个tag会在遍历effect链表的时候使用(有HasRffect标记的effect才会被拿出来执行)

调度阶段(useEffect):
由于useEffect回调函数会在commit完成后异步执行，所以调度阶段发生在commit三个阶段之前
由于存在调度，所以在commit阶段入口处会在一个循环中刷调度函数的具体逻辑(即执行useEffect的具体方法)，保证此次更新能执行完所有的useEffect

执行阶段
依次执行
遍历effect表，执行在声明阶段标记了对应tag的effect的销毁函数(commitHookEffectListUnmount)
遍历effect表，执行在声明阶段标记了对应tag的effect的回调函数(commitHookEffectListMount)

6. useCallback和useMemo
mount时执行流程，将用户传入的payload存起来，返回
update时，根据deps是否变化，如果变化就重新计算，然后返回；没有变化返回上次的值

7. useRef
工作流程：
render阶段标记ref flag：mount----ref props存在  update----ref props发生变化
commit阶段，针对有ref标记的fiberNode做如下处理：移除旧的ref->Layout阶段重新赋值ref



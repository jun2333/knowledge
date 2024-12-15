# Reconciler工作流程
按照DFS顺序构建wip fiberTree,主要分两个阶段：
beginWork(递)
compoleteWork(归)

## flag
用于追踪副作用，用32位2进制表示
如：Placement----代表移动或追加,ChildDeletion----删除

## beginWork
分两个阶段，mount和update，区别在于update阶段需要追踪effect flag，值得注意的是：mount阶段的HostRootFiber由于存在alternate，会进入到update处理阶段
所以HostRootFiber有被标记为Placement(插入)，后面的子树都走的mount阶段(未被标记flag)，在完成completeWork后会存在一颗离屏DOM树，commit阶段做一次插入DOM操作即可完成mount阶段的Layout，这样看整个流程就知道为啥mount阶段不追踪flag了，假设如果追踪了flag那在mount阶段对于每个节点来说都有被标记Placement，那么在commit阶段会进行多次DOM插入操作，这样很显然性能不好~
### mount
1. 根据wip.tag进入不同组件处理函数
2. 调用mountChildFibers执行reconcile算法得到子fiberNode
### update
1. 判断是否可复用，复用则进入优化路径
2. 根据wip.tag进入不同组件处理函数
3. 调用reconcileChildFibers执行reconcile算法得到**带flag**的子fiberNode

mountChildFibers和reconcileChildFibers调用同一函数ChildReconciler(shouldTrackSideEffects:boolean),只是传参不一样,shouldTrackSideEffects代表是否需要标记flag

#### 优化路径
如果命中了优化策略，则无需进入到reconcile diff流程

#### diff(在beginWork阶段的update流程执行)
diff实际上是用新的element children(是一个数组结构，调React.createElement生成的)和current fiber对比
分两类情况:单节点diff和多节点diff
##### 单节点diff(从旧节点中找是否可以复用)
当child类型为Object,String,Number的时候走单节点diff逻辑:
1. 遍历旧节点current fiberNode及其兄弟fiberNode
2. 判断是否可复用(最主要看key,然后type是否相同)，找到复用则复用该fiberNode并标记删除其兄弟节点(删除就是加到父fiber的deletions中)
3. 遍历完还没找到可复用节点则重新创建一个fiberNode
注意在第2步中：
key和type都相同，复用~用新element的props更新旧fiberNode，并返回fiberNode
key相同若type不同，跳出循环，不用继续遍历了，剩下的节点都无法复用，全部标记删除(key相同都不能复用，其他没啥指望的了~)
key不同则标记当前节点无法复用需要删除，继续遍历兄弟节点
##### 多节点diff
当child类型为Array时走多节点diff逻辑：
基本分三种情况：
1. 节点位置没变
2. 节点增删
3. 节点移动

针对以上三种情况，react这样设计算法(两次遍历)：
1. 第一次逐个遍历先把位置没变的节点复用起来
2. 第二次遍历剩下的节点

第一次遍历之后剩下的分四种情况：
新旧节点都没了----不处理
旧节点没了，剩余新节点----将剩余的新节点标记为Placement(移动or新增)
新节点没了，剩余旧节点----标记删除剩余的旧节点(Deletions)
新旧节点都有剩余----处理节点移动(diff算法核心部分)

最后处理节点移动
1. 将旧节点以key作为map的key存在map中，构建key->Fiber的结构（准备工作）
2. 遍历剩余新节点，通过key去查询就旧节点是否可复用，记录上次可复用的最右(最大)index(lastPlacedIndex)
当节点可复用----通过对比lastPlacedIndex与oldNodeIndex大小可判断是否需要移动,当oldNodeIndex>=lastPlacedIndex时，说明旧节点在上个节点的右边，不需要移动，更新lastPlacedIndex为oldNodeIndex;否则标记Placement;**另外被复用的节点需要从map移除~(具体原因看第5步)**
当节点不可复用----说明是新节点，标记Placement
3. 收尾：将map中还存在的节点遍历标记Deletion,放到父fiberNode的deletions属性中。

问题：
1. 为啥不用双端diff?
数据结构限制，毕竟是单链表结构...React认为列表反转需要双端diff这种场景比较少见，想看看这种方式能走多远，后面如果表现不佳会考虑替换算法
2. 当前diff算法存在啥性能缺陷？
尽量让位置变化是往后变，而不是往前，因为diff算法是从左往右遍历
比如：a,b,c,d变成d,a,b,c这种情况，如果是双端diff的话只需要d标记为Placement，插入到a前面即可
但是当前react diff算法则需要移动三次，a,b,c都标记了Placement，依次插入到d前面



## completeWork
### mount
1. createInstance创建DOM实例
2. 调用appendAllChildren对children执行appendChild
3. 设置DOM的Element属性
4. flag冒泡

appendAllChildren:
将下级元素挂载到上一步createInstance创建的DOM中，方便后面commit阶段一次性插入离屏subtree DOM
1. 从当前fiberNode往下遍历到第一层节点，然后根据是否满足条件进行appendChild操作附加到其父节点
2. 对当前fiberNode的兄弟fiberNode执行步骤1
3. 若无兄弟fiberNode则对其父级的兄弟fiberNode执行步骤1
4. 直到回到最初步骤1所在层或parent所在层终止
### update
1. diffProperties
2. flag冒泡

diffProperties(属性更新):
两次遍历：
1. 旧节点存在，新节点不存在的(已删除)----遍历旧属性
2. 新旧节点都存在的属性(修改)----遍历新属性
最后将属性存在fiberNode.updateQueue中，updateQueue是一个数组~

### flags冒泡
completeWork阶段属于**归**的阶段，从叶元素开始自下而上将子孙的flags附加到上一级的subtreeFlags属性中，最终冒泡到顶级元素
```javascript
subtreeFlags |= child.subtreeFlags // 收集子元素的子孙元素的flags
subtreeFlags |= child.flags // 收集子元素的flags
```


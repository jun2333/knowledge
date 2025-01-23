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


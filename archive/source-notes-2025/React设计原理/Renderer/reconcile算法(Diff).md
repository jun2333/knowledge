
## diff(在beginWork阶段的update流程执行)
diff实际上是用新的element children(是一个数组结构，调React.createElement生成的)和current fiber对比
分两类情况:单节点diff和多节点diff
### 单节点diff(从旧节点中找是否可以复用)
当child类型为Object,String,Number的时候走单节点diff逻辑:
1. 遍历旧节点current fiberNode及其兄弟fiberNode
2. 判断是否可复用(最主要看key,然后type是否相同)，找到复用则复用该fiberNode并标记删除其兄弟节点(删除就是加到父fiber的deletions中)
3. 遍历完还没找到可复用节点则重新创建一个fiberNode
注意在第2步中：
key和type都相同，复用~用新element的props更新旧fiberNode，并返回fiberNode
key相同若type不同，跳出循环，不用继续遍历了，剩下的节点都无法复用，全部标记删除(key相同都不能复用，其他没啥指望的了~)
key不同则标记当前节点无法复用需要删除，继续遍历兄弟节点
**type: 字符串/对象，对于基础DOM节点来说就是html标签，对于组件来说就是实例化的组件对象**
### 多节点diff
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


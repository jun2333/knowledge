## 发起更新
只有组件才能发起状态更新，普通的DOM节点是无法发起更新的，通过交互事件或者js代码调用setState或者useState等方法发起更新

## React是如何找到更新的组件？lane冒泡
在调和阶段，fiber是参与调和的最小单元，调和过程从rootFiber开始，当某个组件发生了更新，React不可能遍历所有组件才能找到它，这无疑是性能的浪费
1. 发生更新的组件会调用scheduleUpdateOnFiber
2. scheduleUpdateOnFiber会生成一个lane，然后**进行lane冒泡，也就是将自身的lane追加到父fiber的childLanes中**
3. 这样在调和阶段就可以很快定位到发生更新的fiber了，如果某棵树的childLanes中不存在更新的lane那就可以跳过

## 更新的来源
1. props->对比newProps与oldProps是否相等
2. state->对比lane是否等于renderLane
3. context


## Update:单向链表结构
计算state的最小单位
各种交互->产生Update->消费Update、产生state

数据结构
Update里存在lane(优先级)、更新内容、next(指向下个Update)等内容

## updateQueue
用于存储参与state计算的相关数据
介绍重要属性:
1. baseState:参加计算的初始state
2. baseUpdate:本次更新前fiberNode已保存的Update
firstBaseUpdate和lastBaseUpdate代表链表头和链表尾
3. shared.pending:触发更新后产生的Update(形成单向环形链表),计算时会被拆分，并链接到lastBaseUpdate后
触发更新后产生的Update会被拼接到shared.pending中，其中shared.pending指向最后一个update,shared.pending.next指向第一个update

### 计算流程
1. 将baseUpdate和shared.pending拼接成新链表(其实是将current hook中的shared.pending与wip hook的baseUpdate拼接)
2. 遍历1拼接的新链表，按照wip root选定的优先级，选择符合优先级的Update参与计算

### 消费update时的两个问题
1. 如何保证update依赖关系正确
假设一堆有序update中最靠前的优先级不足的update为u
从u开始往后的update都会被保存到baseUpdate中作为下次更新的update,它们的lane会被置为NoLane(React通过这样的设定保证依赖关系正确)
优先级够的update就被消费掉(包括u后面的)，计算结果存在memoizedState中
u之前的update计算结果存在baseState中
因此当memoizedState和baseState不一致就代表是计算不完整的中间态

2. 如何保证update不丢失
hook和fiber tree一样也是双缓存
计算前拼接的新链表存在current hook中，计算过程中消费完的baseQueue存在wip hook中，只要commit还未完成，就不会切换wip hook和current hook
所以哪怕经历过多次render，也可以从current hook恢复完整的update链表

### 消费update
1. 计算前拼接的新链表存在current hook中
2. 遍历拼接好的新链表，判断优先级是否够
3. 不够情况，标记下次更新的表头、表尾
4. 够的情况，判断是否存在update有被跳过，若有则更新当前update为下次更新表尾，计算state
5. 本次消费完成，计算下次更新baseQueue存在wip hook

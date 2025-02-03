## commit阶段
render阶段可能会被打断，commit阶段会一直同步执行到完成

### 基本流程
1. 是否存在副作用
2. 不存在则直接交换current fiberNode和wip fiberNode
3. 存在则进入三个流程：BeforeMutation->Mutation->Layout，其中fiber tree切换在Mutation之后，Layout之前执行

### 归纳三个流程的执行方式
三个流程同样也都是一个递归的过程，分为两个阶段分别是commitXXXEffects_begin和commitXXXEffects_complete(其中XXX代表着流程名字)
#### commitXXXEffects_begin(递)
1. 向下遍历到最底层的具备当前副作用Flags的节点
2. 执行具体的commitXXXEffects_complete方法
#### commitXXXEffects_complete(归)
1. 对fiberNode执行commitXXXEffectsOnFiber(flag的具体处理方法)
2. 若存在兄弟节点，则return兄弟节点，回到commitXXXEffects_begin，即：对兄弟节点进行递归处理
3. 若无兄弟节点，则自下而上依次执行commitXXXEffectsOnFiber

### Effects list
v18版本以前是用Effects list(单链表)存储被标记副作用的fiberNode，明明性能比subtreeFlag更好为啥要后面要改成subtreeFlag呢？
那是因为react想遍历更多的节点
Suspense旧版本存在一种情况是若子孙组件同时存在同步和异步组件，加载过程会呈现fallback并且渲染同步组件，只是将其css设置display:none而已
这显然不符合Suspense的理念，因此需要改变commit的遍历方式，这样才能处理得更细致，让同步组件不参与渲染(之前只是能遍历到Effects list的节点，所以无法精确控制Suspense里的同步组件也不参与渲染，现在使用了subtreeFlag之后就需要遍历所有组件，这样就可以达到预期效果了)

### BeforeMutation
发生在归的过程
处理getSnapshotBeforeUpdate钩子函数(class component)
调度Passive Effetct(useEffect)

### Mutation
这个阶段会**同步执行**useInsertionEffect，此时无法访问DOM
1. 删除DOM元素(发生在递阶段：向下过程)
fiber.deletions：是一个数组，存储这要删除的节点fiberNodes
实际操作比较复杂：需要执行子树的unmount逻辑ClassComponent的卸载相关钩子以及FC的effect的destroy函数等
2. 移动、插入、更新DOM元素(发生在归阶段：向上)
2-1. 移动/插入：找父节点，before节点，DOM插入before之前
2-2. 更新：fiber.updateQueue记录了更新的内容
3. 置空ref

### fiber tree切换
Mutation完成后，Layout开始前
之所以在这一时机执行，是因为对于ClassComponent而言，当执行componentWillUnmount(Mutation阶段)current指向UI中对应的树，componentDidMount/Update(Layout阶段)current指向本次更新的Fiber Tree

### Layout
1. 处理offscreencomponent逻辑(递阶段)
2. 根据fiberNode.tag不同，执行不同逻辑(归阶段)
如：
2-1. FC执行useLayoutEffect,ClassComponent执行componentDidMount/Update；
2-2. 除此之外还有this.setState的第二个参数(回调函数)以及对于HostRoot的ReactDOM.render的第三个参数(回调函数)会取出来执行(之前他们也会被当成属性存在updateQueue中)
2-3. 重置ref
注：useLayoutEffect在Layout阶段同步执行，js同步代码会阻塞浏览器渲染

# vue2.x patch VS vue-next patch

## vue2.x

1. 判断新旧vnode是否===，若是则return
2. 判断新旧vnode是否都是静态节点且key相同，若满足则不需要patch
3. 判断新vnode是否文本节点，若是则根据新旧节点文本是否一致去更新文本，否则进入第4步
4. 若新vnode非文本节点则判断新旧vnode是否都有子代，若是则updateChildren处理
5. 若新vnode有子代则先判断处理旧vnode的text之后再新增新vnode的子代节点
6. 若旧vnode有子代，则remove子代
7. 若旧vnode有文本，则将文本置空



## vue-next

1. 根据type值判断新旧vnode是否为同类型节点，若不是则将旧vnode设置为null
2. 根据type值可以区分节点的类型，大致分为四类：Text、Comment、Static、Fragment、其他
3. 其他部分根据shapeFlag可以区分ELEMENT、COMPONENT、TELEPORT、SUSPENSE
4. 不同类型的节点通过不同的函数进行处理，如：processElement处理ELEMENT类型
5. setRef


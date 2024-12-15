## 最简单的diff
1. 将旧节点构造成key->node的oldmap, 声明一个变量lastIndex，存储上次复用节点的index
2. 遍历新节点，通过key从oldmap中查找是否存在旧节点，存在即可复用进入3，不存在不可复用进入4
3. 复用场景:1. patch新旧节点 2. 判断是否需要移动: 若index小于lastIndex 则需要移动 3. 更新oldIndex
4. 不可复用:找到合适的位置重新mount
5. 新节点处理完了之后看还有没有剩余的旧节点，有的话执行unmount处理

### 节点移动说明
可复用：取上一个处理过的节点的nextSimbling作为锚点
不可复用：取上一个处理过的节点的nextSimbling，若处理的是第一个节点，则取容器的第一个节点作为锚点

react是采取上述diff算法

## 双端diff算法(vue2)
其实对新旧node列表分别采用双指针遍历
当满足**新前小于等于新后且旧前小于等于旧后**条件时循环
1. 按照新前-旧前、新后-旧后、新前-旧后、新后-旧前的顺序比较是否可以复用，复用进入2  不可复用进入3
2. patch新旧节点；判断是否需要移动，新前-旧后、新后-旧前需要移动  移动都是通过insert，所以需要找锚点；更新索引。
3. 4种组合都没找到复用则取新前节点的key，遍历旧节点列表查找是否存在，存在则复用(复用完需要标记，用于下次跳过处理)，不存在执行mount
4. 最后通过索引比较判断新旧节点列表剩余情况，若新有剩余则继续遍历执行mount，若旧有剩余则继续遍历旧节点执行unmount

### 节点移动说明
1. 新前-旧后复用，锚点：旧前
2. 新后-旧前复用，锚点：旧后.nextSibling
3. 新前-旧某index复用， 锚点：旧前
4. 不可复用，即添加新元素，锚点：旧前

## 快速diff算法(vue3)
1. 预处理，双指针遍历新旧节点收尾两端，将可复用且不需要移动的节点patch完
2. 判断新旧节点列表剩余情况，新剩余->mount  旧剩余->unmount  新旧都剩余->继续diff
3. 初始化5个变量: 
source(长度为剩余新节点列表的长度，用于存储可复用的节点新旧位置的映射，结构为newIndex->oldIndex): new Array(restNewList.length).fill(-1)
keyToIndexMapForNewList(新节点key->index): 遍历剩余新节点，完善这个map
pos: 记录上个可复用节点的newIndex
moved: 标记是否需要移动
patched: 更新的数量
4. 遍历剩余旧节点列表，判断是否处理完毕(patched>剩余新节点总数)，否-取key去keyToIndexMapForNewList里查，查到进入5 查不到进入6  是-卸载
5. 复用，patch，更新source, 判断curNewIndex是否大于等于pos，否->设置moved为true(标记需要移动)
6. 不可复用直接卸载吧
7. 若moved为true，则需要统一移动
a. 根据之前维护的source结合**最长增序子序列**算法返回最长增序newIndex集合s
b. 逆向遍历source
source[i]为-1则表示旧节点不存在，直接mount 锚点为i+newStart+1位置的节点
i!==s[j]表示需要移动: 锚点为i+newStart+1位置的节点
i===s[j]表示不需要移动，j--

总结：快速diff算法的核心在于维护新旧节点的位置映射关系，根据最长增序子序列得出不需要移动的新节点索引集合，让移动次数尽可能降到最低

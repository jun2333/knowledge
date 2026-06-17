## vue2.x diff VS vue-next diff

#### vue2.x diff

通过newStartIdx/newEndIdx和oldStartIdx/oldEndIdx同时遍历新旧序列

1. 判断旧前和新前节点是否同一节点，若是则更新；否进行下一步
2. 判断旧后和新后节点是否同一节点，若是则更新；否进行下一步
3. 判断旧前和新后是否同一节点，若是则更新，并且将更新后的节点插入到已处理过的旧后节点的前面；否进行下一步
4. 判断旧后和新前是否同一节点，若是则更新，并且将更新后的节点插入到未处理的旧前节点的前面；否进行下一步
5. 针对旧序列生成key->index映射数组，取得新前的key，通过key拿到新前的旧位置oldIdx（此处若无法通过key得到则遍历旧序列找同一节点），若oldIdx不存在则表示新前元素为新增，直接生成新节点插入到未处理的旧前节点前面即可，否则更新旧节点（即oldIdx对应的节点）并插入到未处理的旧前节点前面。

#### vue-next diff

按照是否有key分别处理。

无key：

1. 新旧序列长度中取短的长度为条件从头进行遍历，依次patch更新每对新旧节点
2. 若旧序列长于新序列，则卸载旧序列的剩余节点；若新序列长于旧序列，则挂载新序列中剩余节点

有key:

1. 从头开始遍历，若新旧节点type相同则patch更新，若不相同则跳出循环
2. 从尾开始遍历，若新旧节点type相同则patch更新，若不相同则跳出循环
3. 新序列已经处理完了旧序列还有未处理的，则卸载旧序列的剩余节点；相反，则挂载新序列中剩余节点
4. 新旧序列都有剩余情况，先针对新序列生成key->index映射map(keyToNewIndex)，初始化一个新旧index映射数组(newIndexToOldIndexMap)。
5. 遍历旧序列，通过key值拿到旧节点新位置newIndex(若无key则遍历新序列取type值相同的节点作为新节点，取其index)，若newIndex不存在则代表节点被删除，直接unmount旧节点即可；若存在，先更新newIndex在newIndexToOldIndexMap中的值，然后patch更新旧节点
6. mount和move阶段：根据newIndexToOldIndexMap生成一个最长增序子序列数组increasingNewIndexSequence，从尾部开始遍历剩余新节点序列，若新节点对应的旧位置为0，则说明是新增的节点，执行mount操作；若需要移动，则判断新节点位置是否在increasingNewIndexSequence中存在，若不存在则执行move操作(此阶段通过最长增序子序列算法达到最少移动dom的目的，提升性能)
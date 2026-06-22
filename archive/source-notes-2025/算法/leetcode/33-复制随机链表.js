// 给你一个长度为 n 的链表，每个节点包含一个额外增加的随机指针 random ，该指针可以指向链表中的任何节点或空节点。

// 构造这个链表的 深拷贝。 深拷贝应该正好由 n 个 全新 节点组成，其中每个新节点的值都设为其对应的原节点的值。
// 新节点的 next 指针和 random 指针也都应指向复制链表中的新节点，并使原链表和复制链表中的这些指针能够表示相同的链表状态。
// 复制链表中的指针都不应指向原链表中的节点 。

// 第一次遍历将旧链表存入hash表，构造Node->index的结构
// 第二次遍历复制新链表，random暂时用index描述，同时构建index->Node的hash表
// 第三次遍历处理新链表的random，将random的值由index转成Node(利用第二次遍历生成的hash表映射)
// 时间O(n) 空间O(n)
/**
 * // Definition for a _Node.
 * function _Node(val, next, random) {
 *    this.val = val;
 *    this.next = next;
 *    this.random = random;
 * };
 */

/**
 * @param {_Node} head
 * @return {_Node}
 */
function copyRandomList(head){
    if(head === null) return null
    let i = head
    // 构建旧链表的map
    const oldNodeList = new Map()
    let index = -1
    while(i!==null){
        index++
        oldNodeList.set(i, index) // object->index
        i = i.next
    }
    // 遍历旧链表生成新链表和新链表map
    let preCopyHead = new _Node(-1) // 新链表
    const newNodeList = []
    let copyI = preCopyHead
    i = head
    index = -1
    while(i!==null){
        index++
        const {val, random} = i
        const newNode = new _Node(val, null, oldNodeList.get(random))
        newNodeList[index] = newNode
        copyI.next = newNode
        copyI = copyI.next
        i = i.next
    }

    // 遍历新链表更新random
    copyI = preCopyHead.next
    while(copyI!==null){
        const {random} = copyI
        if(random!==null){
            copyI.random = newNodeList[random]
        }
        copyI = copyI.next
    }
    return preCopyHead.next
}


// 将旧链表和新链表错位拼接起来
// 如旧链表为:A-B-C  新:A'-B'-C'  拼接起来则为: A-A'-B-B'-C-C'

// 第一次遍历拼接两链表
// 第二次遍历处理新链表的random
// 第三次遍历解开连接(注意最后一个新节点的处理)
// 时间O(n) 空间O(1)
function copyRandomList(head){
    if(head === null) return null
    for(let node=head; node!==null; node = node.next.next){ // 交叉拼接新老链表
        const newNode = new _Node(node.val, node.next) // 新链表节点指向旧的next
        node.next = newNode
    }
    for(let node=head; node!==null; node = node.next.next){ // 更新新链表的random
        const newNode = node.next
        newNode.random = node.random !== null ? node.random.next : null
    }
    let newHead = head.next
    for(let node=head; node!==null; node = node.next){ // 拆线新老链表
        const newNode = node.next
        node.next = node.next.next
        newNode.next = newNode.next === null ? null : node.next.next
    }
    return newHead
}
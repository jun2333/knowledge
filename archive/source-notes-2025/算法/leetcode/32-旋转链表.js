// 给你一个链表的头节点 head ，旋转链表，将链表每个节点向右移动 k 个位置。

// 思路：先环化，再找到head位置，然后解开
/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @param {number} k
 * @return {ListNode}
 */
function rotateRight(head, k){
    if(head === null) return head
    let i = head
    let n = 1 // 链表长度
    // 环化链表
    while(i.next!==null){
        n++
        i = i.next
    }
    i.next = head // i指向旧tail位置
    // 找到新的tail位置
    k = k%n
    for(let j=0; j<n-k; j++){ // 旧tail向右旋转k个位置之后(k<n)，新tail为旧tail后n-k个节点
        i = i.next
    }
    head = i.next
    i.next = null // 解开环
    return head
}
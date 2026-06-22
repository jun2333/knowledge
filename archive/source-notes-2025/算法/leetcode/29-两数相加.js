// 给你两个 非空 的链表，表示两个非负的整数。它们每位数字都是按照 逆序 的方式存储的，并且每个节点只能存储 一位 数字。

// 请你将两个数相加，并以相同形式返回一个表示和的链表。

// 你可以假设除了数字 0 之外，这两个数都不会以 0 开头。

// 思路：顺着链表遍历，将对应位置的值相加，进位忘右边进
/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
function addTwoNumbers(l1, l2){
    let isAdd = false
    const getVal = (cur) => {
        return cur?.val || 0
    }
    const getNext = (cur)=>{
        return cur?.next || null
    }
    const sum = (val1, val2) => {
        let ext = isAdd ? 1 : 0
        return val1+val2+ext
    }
    const preNode = new ListNode(-1, null)
    let i = preNode // 作为新链表的指针
    while(l1!==null || l2!==null){
        const realVal = sum(getVal(l1), getVal(l2)) // 值相加(考虑进位问题)
        isAdd = realVal >= 10
        const newNode = new ListNode(realVal % 10, null) // 存储小于10的部分
        i.next = newNode
        i = getNext(i)
        l1 = getNext(l1)
        l2 = getNext(l2)
    }
    if(isAdd){ // 处理最后需要进位的问题，此时i指针位于新链表最后一个位置，如果需要进位则直接赋值next为1即可
        i.next = new ListNode(1, null)
    }
    return preNode.next
}
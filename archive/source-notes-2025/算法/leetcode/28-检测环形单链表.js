// 直接用快慢指针
// 时间O(n) 空间O(1)
/**
 * Definition for singly-linked list.
 * function ListNode(val) {
 *     this.val = val;
 *     this.next = null;
 * }
 */

/**
 * @param {ListNode} head
 * @return {boolean}
 */
function hasCycle(head) {
    const getNext = (cur) => {
        return cur?.next || null
    }
    let slow = getNext(head)
    let fast = getNext(getNext(head))
    while (slow !== null && fast !== null) {
        if (slow === fast) return true
        slow = getNext(slow)
        fast = getNext(getNext(fast))
    }
    return false
}

// 哈希表
// 时间O(n) 空间O(n)
/**
 * Definition for singly-linked list.
 * function ListNode(val) {
 *     this.val = val;
 *     this.next = null;
 * }
 */

/**
 * @param {ListNode} head
 * @return {boolean}
 */
function hasCycle2(head){
    const list = new Set()
    let i = head
    while(i!==null){
        if(list.has(i)){
            return true
        }
        list.add(i)
        i = i.next
    }
    return false
}

// 20241116
// 给你单链表的头指针 head 和两个整数 left 和 right ，其中 left <= right 。
// 请你反转从位置 left 到位置 right 的链表节点，返回 反转后的链表 。

// 拆分+反转+缝线
// 时间O(n) 空间O(1)
// 注意下面两步拆链表动作，若没有则空间复杂度升到O(n)
function reverseBetween(head, left, right){
    let i = head
    let index = 0
    let leftTail, targetHead, rightHead
    while(i!==null){
        index++
        let next = i.next
        if(index+1 === left){
            leftTail = i
            leftTail.next = null // 拆1
        }
        if(index === left){
            targetHead = i
        }
        if(index === right){
            rightHead = i.next
            i.next = null // 拆2
            break
        }
        i = next
    }
    const reverseNode = (h) => {
        let last = null
        let node = h
        while(node!==null){
            const next = node.next
            node.next = last
            last = node
            node = next
        }
        return [last, h]
    }
    const [start, end] = reverseNode(targetHead)
    let res = start
    if(leftTail){
        leftTail.next = start
        res = head
    }
    if(rightHead){
        end.next = rightHead
    }
    return res
}

// 边遍历边穿线拉直法
// 时间O(n) 空间O(1)
function reverseBetween2(head, left, right){
    // 设置 dummyNode 是这一类问题的一般做法
    const dummy_node = new ListNode(-1);
    dummy_node.next = head;
    let pre = dummy_node;
    for (let i = 0; i < left - 1; ++i) {
        pre = pre.next;
    }

    let cur = pre.next;
    for (let i = 0; i < right - left; ++i) {
        const next = cur.next;
        cur.next = next.next;
        next.next = pre.next;
        pre.next = next;
    }
    return dummy_node.next;
}
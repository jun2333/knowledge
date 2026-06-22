// 将两个升序链表合并为一个新的 升序 链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。 


// 通过递归或者迭代方式解决
// 时间复杂度都是O(n) 不同的是空间复杂度：递归空间复杂度来源于调用栈，所以没法优化
// 迭代的话可以让指针指向原来的链表节点，并且串起来，这样就不用浪费O(n)的内存去创建节点了

function mergeTwoLists(l1, l2){
    const createNode = (val) => {
        return new ListNode(val)
    }
    let prehead = createNode(-1) // 新建一个head的前一个节点，其next指向新链表
    let i = prehead 
    while(l1!==null && l2!==null){
        if(l1.val <= l2.val){
            i.next = l1
            l1 = l1.next
        }else{
            i.next = l2
            l2 = l2.next
        }
        i = i.next
    }
    i.next = l1===null ? l2: l1 // 最后处理没处理完的节点
    return prehead.next
}
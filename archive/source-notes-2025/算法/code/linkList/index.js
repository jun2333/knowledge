class Node {
    pre = null;
    next = null;
    constructor(data = null) {
        this.data = data;
    }
}
//由传入数组初始化链表
function createLinkListByArray(arr) {
    const head = new Node();
    const tail = new Node();
    const newArr = [head];
    const push = (arr, target) => {
        const last = arr[arr.length - 1];
        last.next = target;
        target.pre = last;
        arr.push(target);
    };
    for (let i = 0; i < arr.length; i++) {
        let nodeItem = new Node(arr[i]);
        push(newArr, nodeItem);
    }
    push(newArr, tail);
    return {
        head,
        tail,
    };
}
//查找
function find(headNode, val) {
    let i = headNode.next;
    while (i.next !== null) {
        if (i.data === val) return i;
        i = i.next;
    }
}
//nextNode前插入
function insert(headNode, nextValue, value) {
    let i = headNode.next;
    const newNode = new Node(value)
    while (i.next !== null) {
        if (i.data === nextValue) {
            let temp = i.pre;
            newNode.next = i;
            i.pre = newNode;
            temp.next = newNode;
            return true
        };
        i = i.next;
    }
}
//遍历打印双向链表
function traversePrintLinkList(headNode) {
    //遍历链表
    let i = headNode.next;
    while (i.next !== null) {
        console.log(i.data);
        i = i.next;
    }
}
//双向链表逆序
function reverseLinkList(headNode, tailNode) {
    let i = headNode.next;
    let j = tailNode.pre;
    while (j.data - i.data > 1) {
        let temp = j.data;
        j.data = i.data;
        i.data = temp;
        i = i.next;
        j = j.pre;
    }

    return Promise.resolve();
}

//合并两个有序链表
function mergeLinkList(linkList1, linkList2) {
    const head1 = linkList1.head;
    const head2 = linkList2.head;
    const head = new Node();
    const tail = new Node();
    const newList = [head];
    let i = head1.next;
    let j = head2.next;
    const push = (arr, target) => {
        const last = arr[arr.length - 1];
        last.next = target;
        target.pre = last;
        arr.push(target);
    };
    while (i.next !== null && j.next !== null) {
        if (i.data <= j.data) {
            push(newList, i);
            i = i.next;
        } else {
            push(newList, j);
            j = j.next;
        }
    }
    if (i.next !== null) {
        while (i.next !== null) {
            push(newList, i);
            i = i.next;
        }
    }
    if (j.next !== null) {
        while (j.next !== null) {
            push(newList, j);
            j = j.next;
        }
    }
    push(newList, tail);
    // console.log(newList);
    return {
        head,
        tail,
    };
}

module.exports = {
    createLinkListByArray,
    find,
    traversePrintLinkList,
    reverseLinkList,
    mergeLinkList,
    insert
};

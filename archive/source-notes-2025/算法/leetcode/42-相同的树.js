// 给你两棵二叉树的根节点 p 和 q ，编写一个函数来检验这两棵树是否相同。

// 如果两个树在结构上相同，并且节点具有相同的值，则认为它们是相同的。


/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} p
 * @param {TreeNode} q
 * @return {boolean}
 */
// 递归手法(最简单,代码也少)
var isSameTree = function(p, q) {
    if(p===null||q===null) { // 这里分两种情况，1是都为null 2是其中一个是null  所以用p===q判断是否相同
        return p === q
    }
    return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right)
};

// 广度优先遍历比较
// 两棵树放到一个栈里，两两出栈进栈
var isSameTree2 = function(p, q){
    const queue = []
    queue.push(p)
    queue.push(q)
    while(queue.length>0){
        p = queue.shift()
        q = queue.shift()
        if(!p && !q) continue
        if(!p || !q || p.val!==q.val) return false
        queue.push(p.left)
        queue.push(q.left)
        queue.push(p.right)
        queue.push(q.right)
        console.log(queue)
    }
    return true
}
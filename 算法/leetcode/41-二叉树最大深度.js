// 给定一个二叉树 root ，返回其最大深度。

// 二叉树的 最大深度 是指从根节点到最远叶子节点的最长路径上的节点数。

/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number}
 */
// 深度优先遍历(递归)
var maxDepth = function(root) {
    if(root===null) return 0
    return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1
}

// 广度优先遍历
var maxDepth2 = function(root) {
    if(root===null) return 0
    const queue = []
    queue.push(root)
    let res = 0
    while(queue.length>0){
        let size = queue.length // 记录每一层节点个数
        while(size>0){ // 遍历每层的节点
            let cur = queue.shift()
            if(cur.left!==null){
                queue.push(cur.left)
            }
            if(cur.right!==null){
                queue.push(cur.right)
            }
            size--
        }
        res++
    }
    return res
}
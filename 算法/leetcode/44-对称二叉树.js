
// 递归写法
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
var isSymmetric1 = function(root) {
    const check = (p, q)=>{
        if(!p && !q) return true // 都为null
        if(!p || !q) return false // 只有一个为null
        return p.val === q.val && check(p.left, q.right) && check(p.right, q.left) // left、right都不为null,进入递归
    }
    return check(root.left, root.right)
};


// 迭代写法
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
var isSymmetric2 = function(root) {
    const check = (p, q)=>{
        const queue = []
        queue.push(p)
        queue.push(q)
        while(queue.length){
            // 成对出
            p = queue.shift()
            q = queue.shift()
            if(!p && !q) continue // p,q都为null直接不用处理
            if(!p || !q || p.val!==q.val) return false // 处理false情况
            // 交错成对入
            queue.push(p.left)
            queue.push(q.right)
            queue.push(p.right)
            queue.push(q.left)
        }
        return true
    }
    return check(root, root)
};

// 总结：无论迭代还是递归，思路都是左子树与右子树对比，右子树与左子树对比
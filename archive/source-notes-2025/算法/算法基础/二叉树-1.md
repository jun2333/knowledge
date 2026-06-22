## 二叉树

#### 基础概念

1.节点深度：根节点到节点经历的边的个数

2.节点高度：节点到叶节点的最长路径（边数）

3.节点层数：节点的深度+1

4.树的高度 ：根节点的高度

#### 二叉树

满二叉树和完全二叉树概念

存储方式：链表、数组(节点位置为i，左子节点位置=2*i ，右子节点=2*i+1)

遍历方式：前序遍历、中序遍历、后序遍历、广度优先遍历

<img src="https://static001.geekbang.org/resource/image/ab/16/ab103822e75b5b15c615b68560cb2416.jpg" alt="img" style="zoom:50%;" />

```javascript
// 前序遍历递归版本
function preOrder(root){
    console.log(root.val)
    preOrder(root.left)
    preOrder(root.right)
}
```
```javascript
// 前序遍历非递归版本
function preOrder(root){
    const stack = [root]
    while(stack.length){
        const cur = stack.pop()
        console.log(cur.val)
        if(cur.right!==null){
            stack.push(cur.right)
        }
        if(cur.left!==null){
            stack.push(cur.left)
        }
    }
}
```

```javascript
//中序遍历递归版本
function inOrder(root){
    preOrder(root.left)
    console.log(root.val)
    preOrder(root.right)
}
```
```javascript
// 中序遍历非递归版本
function inOrder(root){
}
```

```javascript
//后序遍历
function postOrder(root){
    preOrder(root.left)
    preOrder(root.right)
    console.log(root.val)
}
```

```javascript
//广度优先遍历
function gdOrder(root){
    const queue = [root]//用队列维护需要遍历的数
    const printItem = (o) => {
        for(let key in o){
            console.log(o.val)
            if(o.left!==null){
                queue.push(o.left)
            }
            if(o.right!==null){
                queue.push(o.right)
            }
        }
    }
    while(queue.length){
        printItem(queue.shift())
    }
}
```


# 二叉查找树

#### 结构

二叉查找树要求，在树中的任意一个节点，其左子树中的每个节点的值，都要小于这个节点的值，而右子树节点的值都大于这个节点的值

#### 查找

```javascript
function search(tree,data){
    let p = tree
    while(p!==null){
        if(data < p.data) p = p.left
        else if(data > p.data) p = p.right
        else return p
    }
    return null
}
```

#### 插入

```javascript
function insert(tree, newNode){
    if(tree===null){
        tree = newNode
        return
    }
    let p = tree
    while(p!==null){
        if(newNode.data < p.data){
            if(p.left===null){
                p.left = newNode
                return
            }
            p = p.left
        }
        if(newNode.data > p.data){
            if(p.right===null){
                p.right = newNode
                return
            }
            p = p.right
        }
    }
}
```

#### 删除

第一种情况是，如果要删除的节点没有子节点，我们只需要直接将父节点中，指向要删除节点的指针置为 null。比如图中的删除节点 55。

第二种情况是，如果要删除的节点只有一个子节点（只有左子节点或者右子节点），我们只需要更新父节点中，指向要删除节点的指针，让它指向要删除节点的子节点就可以了。比如图中的删除节点 13。

第三种情况是，如果要删除的节点有两个子节点，这就比较复杂了。我们需要找到这个节点的右子树中的最小节点，把它替换到要删除的节点上。然后再删除掉这个最小节点，因为最小节点肯定没有左子节点（如果有左子结点，那就不是最小节点了），所以，我们可以应用上面两条规则来删除这个最小节点。比如图中的删除节点 18。

<img src="https://static001.geekbang.org/resource/image/29/2c/299c615bc2e00dc32225f4d9e3490e2c.jpg" alt="img" style="zoom:50%;" />

```java
public void delete(int data) {
  Node p = tree; // p指向要删除的节点，初始化指向根节点
  Node pp = null; // pp记录的是p的父节点
  while (p != null && p.data != data) {
    pp = p;
    if (data > p.data) p = p.right;
    else p = p.left;
  }
  if (p == null) return; // 没有找到

  // 要删除的节点有两个子节点
  if (p.left != null && p.right != null) { // 查找右子树中最小节点
    Node minP = p.right;
    Node minPP = p; // minPP表示minP的父节点
    while (minP.left != null) {
      minPP = minP;
      minP = minP.left;
    }
    p.data = minP.data; // 将minP的数据替换到p中
    p = minP; // 下面就变成了删除minP了
    pp = minPP;
  }

  // 删除节点是叶子节点或者仅有一个子节点
  Node child; // p的子节点
  if (p.left != null) child = p.left;
  else if (p.right != null) child = p.right;
  else child = null;

  if (pp == null) tree = child; // 删除的是根节点
  else if (pp.left == p) pp.left = child;
  else pp.right = child;
}
```

#### 二叉查找树的其他操作

除了插入、删除、查找操作之外，二叉查找树中还可以支持快速地查找最大节点和最小节点、前驱节点和后继节点。这些操作我就不一一展示了。我会将相应的代码放到 GitHub 上，你可以自己先实现一下，然后再去上面看。

二叉查找树除了支持上面几个操作之外，还有一个重要的特性，就是中序遍历二叉查找树，可以输出有序的数据序列，时间复杂度是 O(n)，非常高效。因此，二叉查找树也叫作二叉排序树。

#### 支持重复数据的二叉查找树

第一种方法比较容易。二叉查找树中每一个节点不仅会存储一个数据，因此我们通过链表和支持动态扩容的数组等数据结构，把值相同的数据都存储在同一个节点上。

第二种方法比较不好理解，不过更加优雅。每个节点仍然只存储一个数据。在查找插入位置的过程中，如果碰到一个节点的值，与要插入数据的值相同，我们就将这个要插入的数据放到这个节点的右子树，也就是说，把这个新插入的数据当作大于这个节点的值来处理。

#### 二叉查找树的时间复杂度分析:时间复杂度其实都跟树的高度成正比，也就是 O(height)

两个极端情况的时间复杂度分别是 O(n) 和 O(logn)，分别对应二叉树退化成链表的情况和完全二叉树。

#### 编程写出求二叉树高度的代码

```javascript
//求二叉树高度
//利用递归，分别求出左右子节点高度，取最大值+1
function getHeight(node) {
    if (node.left !== null && node.right !== null) {
        return Math.max(getHeight(node.left), getHeight(node.right)) + 1;
    } else if (node.left !== null) {
        return getHeight(node.left) + 1;
    } else if (node.right !== null) {
        return getHeight(node.right) + 1;
    } else {
        return 0;
    }
}
```


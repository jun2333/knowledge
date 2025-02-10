## 堆

#### 概念

堆是一种特殊的二叉树，需要满足如下两个条件：

1. 完全二叉树
2. 任何节点的子树节点都大于等于(都小于等于)自身

对于每个节点的值都大于等于子树中每个节点值的堆，我们叫做“大顶堆”。对于每个节点的值都小于等于子树中每个节点值的堆，我们叫做“小顶堆”

#### 插入

插入到数组尾部，然后进行"自下而上"的堆化(以“大顶堆”为例)

```javascript
function insertHeap(heap, value){
    heap.push(value);
    if(heap.length === 1) return;
    let i = heap.length;
    while(i/2>0 && heap[i]>heap[Math.floor(i/2)]){
        swrap(heap, i/2, i)
        i = i/2
    }
}
```



#### 删除顶元素

1. 删除顶元素
2. 将最后一个元素放到顶元素位置
3. 针对新的顶元素进行“自上而下”堆化

```javascript
function removeHeapTop(heap){
    let lastEle = heap.pop();
    if(heap.length === 1) return;
    heap.splice(1, 1, lastEle);
    let len = heap.length;
    let i = 1;
    while(true){
        let maxIndex = i;
        if(i*2 < len && heap[i*2] > heap[i]) maxIndex = i*2;
        if(i*2+1 < len && heap[i*2+1] > heap[maxIndex]) maxIndex = i*2+1;
        if(maxIndex === i) break;
        swrap(heap, i, maxIndex);
        i = maxIndex
    }
}
```

堆化的时间复杂度：

每次交换时间复杂度为O(1)，“自上而下”堆化过程中时间复杂度与树的高度成正比，完全二叉高度为logn，所以堆化时间复杂度为：O(logn)

#### 堆排序

- ##### 建堆

从中间元素进行“自上而下”堆化，时间复杂度为O(n)

```javascript
function buildHeap(heap, n){
    for(let i=n/2; i>=1; i--){
        heapify(heap, n, i)
    }
}
function heapify(heap, k, i){
    while(true){
        let maxIndex = i;
        if(i*2 < k && heap[i*2] > heap[i]) maxIndex = i*2;
        if(i*2+1 < k && heap[i*2+1] > heap[maxIndex]) maxIndex = i*2+1;
        if(maxIndex === i) break;
        swrap(heap, i, maxIndex);
        i = maxIndex
    }
}
```

时间复杂度：

每一层元素个数*当层高度之和

- ##### 排序

类似于删除顶元素过程，代码如下：（时间复杂度O(nlogn)）

```javascript
function sortHeap(heap, n){
    buildHeap(heap, n);//时间复杂度O(n)
    let k = n;
    while(k>=1){//时间复杂度为O(nlogn)
        swrap(heap, 1, k);//交换顶元素到最后一位
        k--;
        heapify(heap, k, 1)//把顶元素堆化
    }
}
```


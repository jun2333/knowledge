## 归并排序算法

```javascript
function mergeSort(arr){
    return mergeSortC(arr, 0, arr.length-1)
}
function mergeSortC(data, start, end){
    if(start >= end) return [].concat(data[start])//递归终止条件
    let mid = Math.floor((end - start)/2)
    return merge(mergeSortC(data, start, start + mid), mergeSortC(data, start + mid + 1, end))
}
function merge(left, right){ //合并数组
    let arr = []//申请一个新数组
    let i = 0, j = 0;
    while(i < left.length && j < right.length){
        if(left[i] < right[j]){
            arr.push(left[i])
            i++
        }else{
            arr.push(right[j])
            j++
        }
    }
    if(i < left.length){
        arr = arr.concat(left.slice(i,left.length))
    }
    if(j < right.length){
        arr = arr.concat(right.slice(j,right.length))
    }
    return arr
}
```


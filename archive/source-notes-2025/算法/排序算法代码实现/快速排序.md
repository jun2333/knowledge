## 快速排序

```javascript
function quickSort(arr){
    quickSortC(arr, 0, arr.length-1)
    console.log(arr)
}
function quickSortC(data, start, end){
    if(start >= end) return
    let mid = partition(data, start, end)
    quickSortC(data, start, mid - 1)
    quickSortC(data, mid + 1, end)
}
function partition(data, start, end){
    let privot = data[end]
    let i = 0, j = 0;
    while(j < end){
        if(data[j] < privot){
            //将小于privot的项与i项交换，i右移1个单位
            swrapArrItem(data, i, j)
            i++
        }
        j++
    }
    swrapArrItem(data, i, end)
    return i
}
function swrapArrItem(data, a, b){
    let temp = data[b]
    data[b] = data[a]
    data[a] = temp
}
```


## 冒泡、插入、选择排序

```javascript
function bubbleSort(arr){
    let swrapFlag = false
    for(let i=0; i<arr.length; i++){
        for(let j=0; j<arr.length-i-1; j++){
            if(arr[j]>arr[j+1]){
                swrapArrItem(arr, j, j+1)
                swrapFlag = true
            }
        }
        if(!swrapFlag) break //一轮下来都没有交换，说明已经排序好了
    }
    console.log(arr)
}
function swrapArrItem(data, a, b){
    let temp = data[b]
    data[b] = data[a]
    data[a] = temp
}
```

```javascript
function insertSort(arr){
    for(let i=1;i<arr.length; i++){
        let j = i - 1
        let value = arr[i]//由于下面有移动操作，所以此处需要暂存a[i]的值
        for(; j>=0; j--){//此处j的条件必须大于等于0，为啥要等于0呢？因为处理第一项的时候j需要移动到-1位置
            if(value < arr[j]){
                arr[j+1] = arr[j]//右移位置
            }else{
                break
            }
        }
        arr[j+1] = value
    }
    console.log(arr)
}
```

```javascript
function selectSort(arr){
    for(let i=0; i<arr.length; i++){
        let minIndex = i
        for(let j=i+1;j<arr.length; j++){
            if(arr[j]<arr[minIndex]){
                minIndex = j
            }
        }
        swrapArrItem(arr, i, minIndex)
    }
    console.log(arr)
}
function swrapArrItem(data, a, b){
    let temp = data[b]
    data[b] = data[a]
    data[a] = temp
}
```

#### 对比三种排序算法

| 算法     | 时间复杂度(最好、最坏、平均) | 空间复杂度 | 是否稳定 |
| -------- | ---------------------------- | ---------- | -------- |
| 冒泡排序 | O(n2)、O(n)、O(n2)           | O(1)       | 是       |
| 插入排序 | O(n2)、O(n)、O(n2)           | O(1)       | 是       |
| 选择排序 | O(n2)、O(n2)、O(n2)          | O(1)       | 否       |
## 变形二分法

#### 变形体一：查找第一个值等于给定值的元素

```javascript
function bsearch(arr, value){
    let len = arr.length
    let low = 0,high = len - 1,mid;
    while(low <= high){
        mid = low + ((high - low) >> 1)
        if(arr[mid] > value){
            high = mid - 1
        }else if(arr[mid] < value){
            low = mid + 1
        }else{
            if(mid === 0 || arr[mid - 1] !== value) return mid
            else high = mid - 1
        }
    }
    return -1
}
```

#### 变形体二：查找最后一个值等于给定值的元素

```javascript
function bsearch(arr, value){
    let len = arr.length
    let low = 0,high = len - 1,mid;
    while(low <= high){
        mid = low + ((high - low) >> 1)
        if(arr[mid] > value){
            high = mid - 1
        }else if(arr[mid] < value){
            low = mid + 1
        }else{
            if(mid === len-1 || arr[mid + 1] !== value) return mid
            else low = mid + 1
        }
    }
    return -1
}
```

#### 变形体三：查找第一个值大于等于给定值的元素

```javascript
function bsearch(arr, value){
    let len = arr.length
    let low = 0,high = len - 1,mid;
    while(low <= high){
        mid = low + ((high - low) >> 1)
        if(arr[mid] < value){
            low = mid + 1
        }else{
            if(mid === 0 || arr[mid - 1] < value) return mid
            else high = mid - 1
        }
    }
    return -1
}
```

#### 变形体四：查找最后一个值小于等于给定值的元素

```javascript
function bsearch(arr, value){
    let len = arr.length
    let low = 0,high = len - 1,mid;
    while(low <= high){
        mid = low + ((high - low) >> 1)
        if(arr[mid] > value){
            high = mid - 1
        }else{
            if(mid === len-1 || arr[mid + 1] > value) return mid
            else low = mid + 1
        }
    }
    return -1
}
```


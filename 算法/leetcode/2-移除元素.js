// 给定一个数组和一个数组中存在的值，移除数组中等于给定值的元素，并将剩下的元素移动到数组前面，返回剩下元素的长度(顺序不重要)

// 同侧双指针
// 时间复杂度O(n)，最坏情况下遍历两次n
function f1(arr, val){
    let slow = 0
    let fast = 0
    while(fast<arr.length){
        if(arr[fast]!==val){ 
            arr[slow++]=arr[fast]
        }
        fast++
    }
    return slow
}

// 双端双指针
// 事件复杂度O(n),最坏情况也只遍历一次n
function f2(arr, val){
    let left=0
    let right=arr.length-1
    while(left<right){
        if(arr[left]===val){ // 左边需要排除，把最右端值换过来，右边指针左移
            arr[left]=arr[right--]
        }else{ // 左边不需要排除，左边指针右移
            left++
        }
    }
    return left
}
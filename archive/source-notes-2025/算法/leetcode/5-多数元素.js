// 给定一个数组，长度为n，找到多数元素(多数元素的定义是出现次数大于n/2)
// 输入数组一定不为空且存在多数元素

// 假设多数元素为x，遍历数组，等于x则+1，不等于x则-1；遍历完之后结果一定大于0
function f(arr){
    let count = 0
    let candidate = null
    for(let i=0; i<arr.length; i++){
        if(count === 0){
            candidate = arr[i]
        }
        count += (candidate === arr[i]) ? 1 : -1
    }
    return candidate
}
// 给定一个升序数组，删除其重复项，返回处理完之后的数组
// 如[1,1,2,2,3]->[1,2,3]

// 快慢指针
function f1(arr){
    let slow=1
    let fast=1
    while(fast<arr.length){
        if(arr[fast]!==arr[slow-1]){
            arr[slow++]=arr[fast]
        }
        fast++
    }
    console.log(arr.slice(0, slow), slow)
    return arr.slice(0, slow)
}
f1([1,1,2,2,2,3,3,4,5,5,6,6])
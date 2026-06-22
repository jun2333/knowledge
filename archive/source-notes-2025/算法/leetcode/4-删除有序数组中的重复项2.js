// 给定一个升序数组，删除其重复项(只允许重复一次)，返回处理完之后的数组
// 如[1,1,2,2,2,3]->[1,1,2,2,3]

// 快慢指针
function f1(arr){
    if(arr.length<2) return arr
    let slow=2
    let fast=2
    while(fast<arr.length){
        if(arr[fast]!==arr[slow-2]){ // slow代表当前处理的位置，此处通过slow-2获取前面处理的结果，由于只允许重复1次，则满足slow-2与fast不等即可
            arr[slow++]=arr[fast]
        }
        fast++
    }
    console.log(arr.slice(0, slow), slow)
    return arr.slice(0, slow)
}

// 同样可以写通用一点，给定一个数组和允许重复次数，做去重操作
function f2(arr, num){
    const jump = num+1 // 先确定前面jump项不用处理
    if(arr.length<jump) return arr
    let slow=jump
    let fast=jump
    while(fast<arr.length){
        if(arr[fast]!==arr[slow-jump]){ 
            arr[slow++]=arr[fast]
        }
        fast++
    }
    console.log(arr.slice(0, slow), slow)
    return arr.slice(0, slow)
}

function test(){
    const arr = [1,1,2,2,2,3,3,4,5,5,6,6,6,6,7]
    console.log(arr, arr.length)
    // f1(arr)
    f2(arr, 0)
}

test()

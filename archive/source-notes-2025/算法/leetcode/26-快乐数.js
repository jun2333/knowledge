// 编写一个算法来判断一个数 n 是不是快乐数。

// 「快乐数」 定义为：

// 对于一个正整数，每一次将该数替换为它每个位置上的数字的平方和。
// 然后重复这个过程直到这个数变为 1，也可能是 无限循环 但始终变不到 1。
// 如果这个过程 结果为 1，那么这个数就是快乐数。
// 如果 n 是 快乐数 就返回 true ；不是，则返回 false 。

// 判断如何跳出循环有两个条件: 1. n === 1 2. 存在环

// 使用一个Set存n
// 时间复杂度O(lgn) 空间复杂度O(lgn)
function f1(n){
    const set = new Set()
    while(n!==1 && !set.has(n)){
        set.add(n)
        n = getNext(n)
    }
    return n===1
}

// 快慢指针检测环，慢指针一次走一步，快指针一次走两步
// 存在环时，快指针会追上慢指针
// 时间复杂度O(lgn) 空间O(1)
function f2(n){
    let slow = n // 乌龟
    let fast = getNext(n) // 兔子
    while(fast!==1 && slow!==fast){
        slow = getNext(slow)
        fast = getNext(getNext(fast))
    }
    return fast === 1
}

function getNext(num){
    let sum = 0
    while(num>0){
        let d = num % 10
        num = Math.floor(num/10)
        sum += d**2
    }
    return sum
}

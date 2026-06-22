// 假设你正在爬楼梯。需要 n 阶你才能到达楼顶。

// 每次你可以爬 1 或 2 个台阶。你有多少种不同的方法可以爬到楼顶呢？

// 考虑到最后一次可能爬1，也可能爬2 所以f(n) = f(n-1) + f(n-2)

// 递归法
// 时间复杂度O(n) 空间复杂度O(n)
const cache = new Map([[1,1], [2,2]])
function f1(n){
    if(cache.has(n)) return cache.get(n)
    cache.set(n, f1(n-1)+f1(n-2))
    return cache.get(n)
}

// 动态规划
// 时间复杂度O(n) 空间复杂度O(1)
function f2(n){
    if(n === 1) return 1
    if(n === 2) return 2
    let cur=2, last=1
    for(let i=3; i<=n; i++){
        const sum = last + cur
        last = cur
        cur = sum
    }
    return cur
}
// 给定一个长度为n的数组，跳跃可达n-1，求最小跳跃次数

// 贪心算法，每次尽可能跳远一点
// 实现方式，维护一个边界变量，遍历数组，每次index到达边界之后更新跳跃次数，并且把边界更新为此时最远可达位置
function f(nums){
    const len = nums.length
    let max = 0 // 记录最远可达位置
    let end = 0 // 边界
    let res = 0 // 结果
    for(let i=0; i<len-1; i++){ // 最后一个元素不必遍历，因为最后一步跳跃之前已经到达边界，更新了跳跃次数
        max = Math.max(nums[i]+i, max) // 更新最远可达位置
        if(i === end){ // 到达边界
            res++
            end = max
        }
    }
    return res
}
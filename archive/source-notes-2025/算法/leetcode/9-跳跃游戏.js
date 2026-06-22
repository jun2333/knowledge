// 给你一个非负整数数组 nums ，你最初位于数组的 第一个下标 。数组中的每个元素代表你在该位置可以跳跃的最大长度
// 判断你是否能够到达最后一个下标，如果可以，返回 true ；否则，返回 false 

// 贪心算法时间复杂度O(n),空间复杂度O(1)
function f(nums){
    let max = 0 // 记录最远可达位置
    for(let i=0; i<nums.length; i++){
        if(i <= max){ // 保证可达
            max = Math.max(nums[i]+i, max) // 遇到更大的可达位置则更新
            if(max >= nums.length-1) return true
        }
    }
    return false
}

// 20241119
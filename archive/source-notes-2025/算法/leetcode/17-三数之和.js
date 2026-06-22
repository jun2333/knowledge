// 给你一个整数数组 nums ，判断是否存在三元组 [nums[i], nums[j], nums[k]] 满足 i != j、i != k 且 j != k ，
// 同时还满足 nums[i] + nums[j] + nums[k] == 0 。请你返回所有和为 0 且不重复的三元组。

// 注意：答案中不可以包含重复的三元组。

// 先排序，再将问题分解成两数之和解法O(n**2)
function f(nums){
    nums = nums.sort((a,b)=>a-b) // O(nlgn)
    const res = []
    const twoSum = (target, start, end)=>{ // O(n)
        while(start<end){
            if(nums[start]+nums[end]===-target){
                res.push([target, nums[start], nums[end]])
                // 跳过重复的项
                while(start+1<end && nums[start] === nums[start+1]){
                    start++
                }
                start++
                while(start<end-1 && nums[end] === nums[end-1]){
                    end--
                }
                end--
            }else if(nums[start]+nums[end]>-target){
                end--
            }else{
                start++
            }
        }
    }
    for(let i=0; i<nums.length-2;i++){// 依次计算每一项作为target的结果，最后留俩
        const target = nums[i]
        if(i>0 && target===nums[i-1]) continue // 跳过重复项
        // 由于数组是升序的，所以有两个优化可以加入进去，进一步提升性能
        if(target + nums[i+1] + nums[i+2] > 0) break // target和后面两项之和如果大于0的话，后面就不用考察了
        if(target + nums[nums.length-1] + nums[nums.length-2] < 0) continue // target与最后两项之和小于0的话，那就看下一个target
        twoSum(target, i+1, nums.length-1)
    }
    return res
}
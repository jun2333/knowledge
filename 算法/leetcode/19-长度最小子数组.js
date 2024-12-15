// 给定一个正整数数组和一个值，返回一个子数组的最小长度，使得子数组每一项之和大于等于这个值
// 若不存在结果则返回0

// 遍历子数组，将当前项作为子数组的第一项start，嵌套循环滑动找到满足条件的子数组的末项end，此时更新min length
// 时间复杂度O(n) 空间复杂度O(1)
var minSubArrayLen = function(target, nums) {
    let start = 0
    let minLen = nums.length
    let end = 0
    let sum = 0
    while(start<nums.length){
        while(end<nums.length){ // end快指针
            if(sum+nums[end]<target){
                sum+=nums[end++]
            }else{ // 找到跳出循环
                break
            }
        }
        if(end >= nums.length){ // 没找到，跳出循环
            break
        }else{ // 找到end，更新minLen，并更新sum和滑动start
            minLen = Math.min(minLen, end-start+1)
            sum -= nums[start++] // sum减掉start对应的值，给下一次循环用
        }
    }
    return start>0 ? minLen : 0 // start为0代表第一轮循环就跳出了，即：不存在结果
};

// 还可以构造一个前缀数组，sums[i]代表i之前的所有值之和，然后遍历nums，依次用二分查找法在sums去找大于等于target的值
// 时间复杂度O(nlgn) 空间复杂度O(n)
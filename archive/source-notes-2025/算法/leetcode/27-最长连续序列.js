// 给定一个未排序的整数数组 nums ，找出数字连续的最长序列（不要求序列元素在原数组中连续）的长度。

// 请你设计并实现时间复杂度为 O(n) 的算法解决此问题。
// 示例 1：

// 输入：nums = [100,4,200,1,3,2]
// 输出：4
// 解释：最长数字连续序列是 [1, 2, 3, 4]。它的长度为 4。
// 示例 2：

// 输入：nums = [0,3,7,2,5,8,4,6,0,1]
// 输出：9

// 将原数组去重
// 存入到hash表里(方便读数)
// Set是最合适的类型
function longestConsecutive(nums){
    if(nums.length === 0) return nums.length
    const numsSet = new Set(nums) // 转化成hash表并去重
    let res = 1
    for(const value of numsSet){
        const lastVal = value-1
        if(numsSet.has(lastVal)) continue // 跳过不是首项的值
        let v = value
        let sum = 1
        while(numsSet.has(v+1)){
            v+=1
            sum++
        }
        res = Math.max(res, sum)
    }
    return res
}

// 求数组内最长连续序列之和
// 无序状态
function fn(nums){
    if(nums.length === 0) return nums.length
    const numsSet = new Set(nums) // 转化成hash表并去重
    let cnt = 1
    let start, end
    for(const value of numsSet){
        const lastVal = value-1
        if(numsSet.has(lastVal)) continue // 跳过不是首项的值
        let v = value
        let sum = 1
        while(numsSet.has(v+1)){
            v+=1
            sum++
        }
        if(sum >= cnt){ // 更新更长的序列头尾节点
            cnt = sum
            start = value
            end = v
        }
    }
    let res
    if(cnt>1){
        res = (start + end)*cnt/2
    }else{
        res = nums[nums.length-1]
    }
    return res
}

// 有序不重复数组
function fn2(nums){
    let i = 0
    let start = 0
    let end = 0
    let cnt = 0
    while(i<nums.length){
        let j = i
        while(j+1<num.length && nums[j+1] - nums[j] === 1){
            j++
        }
        if(j-i+1 >= cnt){
            start = i
            end = j
            cnt = j-i+1
        }
        i = j+1
    }
    if(end===start){
        nums[nums.length-1]
    }
    return (nums[start]+nums[end])*cnt/2
}

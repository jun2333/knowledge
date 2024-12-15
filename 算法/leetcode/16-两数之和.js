// 给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出 和为目标值 target  的那 两个 整数，并返回它们的数组下标。
// 你可以假设每种输入只会对应一个答案，并且你不能使用两次相同的元素。
// 你可以按任意顺序返回答案。
// 注意：数组是无序的

// 暴力法(双循环) O(n**2)
function f1(nums, target){
    for(let i=0; i<nums.length; i++){
        const cur = nums[i]
        for(let j=i+1; j<nums.length; j++){
            if(nums[j]+cur === target){
                return [i, j]
            }
        }
    }
}

// 哈希 O(n) 空间换时间
function f2(nums, target){
    const map = new Map()
    for(let i=0; i<nums.length; i++){
        const res = target-nums[i]
        if(map.has(res)){
            retrun [i, map.get(res)]
        }
        map.set(nums[i], i)
    }
}

// 先排序，再用双指针O(nlgn+n)->O(nlgn)
function f3(nums, target){
    nums = nums.sort((a,b)=>a-b) // O(nlgn)
    let start=0
    let end=nums.length-1
    while(start<end){ // O(n)
        if(nums[start]+nums[end]===target){
            return [start,end]
        }else if(nums[start]+nums[end]>target){
            end--
        }else{
            start++
        }
    }
}
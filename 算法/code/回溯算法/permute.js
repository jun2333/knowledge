// 排列组合
function permute(nums) {
    var result = [];
    function backtrack(track) {
        if (track.length === nums.length) { // 递归终止条件
            result.push(track);
            return;
        }
        for (var _i = 0; _i < nums.length; _i++) {
            var num = nums[_i];
            if (track.includes(num)) // 包含跳过
                continue;
            track.push(num);
            backtrack(track.slice());
            track.pop();
        }
    }
    backtrack([]);
    return result;
}
console.log(permute([1, 2, 3]));

function demo(nums){
    const ret = []
    function trackback(track){
        if(track.length === nums.length){
            ret.push(track)
            return
        }
        for(let i=0; i<nums.length; i++){
            if(track.includes(nums[i])) continue
            track.push(nums[i])
            trackback(track.slice())
            track.pop()
        }
    }
    trackback([])
    return ret
}

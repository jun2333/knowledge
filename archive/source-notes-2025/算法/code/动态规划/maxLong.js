//最长增序子序列长度
//动态规划,根据前面的结果推导后面的结果
// 时间O(n**2) 空间O(n)
function f1(arr) {
    let len = arr.length;
    const maxLArr = new Array(arr.length).fill(1) //存储数组每个元素对应的最大增序子序列长度
    for (let i = 1; i < len; i++) {
        for (let j = i - 1; j >= 0; j--) {
            if (arr[i] > arr[j]) { // 增序
                maxLArr[i] = Math.max(maxLArr[j] + 1, maxLArr[i]);
            } else {
                continue;
            }
        }
    }
    let max = 1;
    for (let i = 0; i < len; i++) {
        if (maxLArr[i] > max) max = maxLArr[i];
    }
    return max;
}
function demo(arr){
    const dp = new Array(arr.length).fill(1)
    for(let i=1; i<arr.length; i++){
        for(let j=i-1; j>=0; j--){
            if(arr[i]>arr[j]){
                dp[i] = Math.max(dp[j]+1, dp[i])
            }
        }
    }
    console.log(dp)
    return dp.reduce((i, sum)=>{
        return Math.max(i, sum)
    }, 1)
}
// 时间O(nlgn) 空间O(n)
function f2(arr) {
    let resArr = [];
    let maxL = 0;
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        let lo = 0,
            hi = maxL;
        while (lo < hi) {
            //二分法查找resArr内小于item且最靠近item的lo位置
            let mid = Math.floor(lo + (hi - lo) / 2);
            if (resArr[mid] < item) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        resArr[lo] = item;
        if (lo === maxL) maxL++;
    }
    return maxL;
}
let a = [2, 9, 3, 6, 5, 1, 7];
console.log(f2(a));

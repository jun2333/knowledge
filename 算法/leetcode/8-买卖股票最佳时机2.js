// 给定一个数组，第i个元素代表第i天的价格，设计个算法，算出最大利润
// 要求每天可以买入卖出，最多只能持有一只股票(持有数小于2)

// 动态规划
// 记录每天交易完成后的利润状态(分两种情况，持有一只股票和不持有股票)
function f1(prices){
    const n = prices.length
    const dp = Array(n).fill(0).map(v=>Array(2).fill(0))
    dp[0][0] = 0
    dp[0][1] -= prices[0]
    for(let i=0; i<n; i++){
        dp[i][0] = Math.max(dp[i-1][0], dp[i-1][1]+prices[i])
        dp[i][1] = Math.max(dp[i-1][1], dp[i-1][0]-prices[i])
    }
    return dp[n-1][0]
}
// 优化：不需要记录整个周期的数据，只需要前一天的利润情况
// dp0和dp1分别记录前一天不持有和持有的利润，遍历更新dp0和dp1，最后返回dp0，最后一天不持有了
function f2(prices){
    const n = prices.length
    let dp0 = 0
    let dp1 = 0 - prices[0]
    for(let i=0; i<n; i++){
        const newDp0 = Math.max(dp0, dp1+prices[i])
        const newDp1 = Math.max(dp1, dp0-prices[i])
        dp0 = newDp0
        dp1 = newDp1
    }
    return dp0
}


 // 贪心算法
 var f3 = function(prices) {
    let j = 1 // 从第2天开始考察
    let profit = 0
    while(j<prices.length){
     profit += Math.max(prices[j]-prices[j-1], 0) // 把递增的累加起来，其他情况视为0
     j++
    }
    return profit
 }
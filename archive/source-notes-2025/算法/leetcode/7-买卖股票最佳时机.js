// 给定一个数组，第i个元素代表第i天的价格，设计个算法，算出最大利润

// 分析：就跟实际买股票一样，记录之前最低价格和最大收益
// 每天都拿当天价格对比之前的最低价格，如果低于之前价格就可以卖掉之前的重新买入(假设买卖不要手续费)，如果高于之前价格就看收益是否高于之前最大收益
// 若收益大于之前的最大收益就全部卖掉(赚钱美滋滋)
function f(prices){
    let maxProfit = 0
    let minPrice = Infinity
    for(let i=0; i<prices.length; i++){ // 遍历一次
        if(prices[i]<minPrice){ // 找到最低价格(若满足条件就可以买入)
            minPrice = prices[i]
        }else if(prices[i]-minPrice>maxProfit){ // 找到最大利润(若满足条件就可以卖出)
            maxProfit = prices[i]-minPrice
        }
    }
    return maxProfit
}
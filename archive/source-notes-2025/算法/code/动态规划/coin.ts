//找零钱问题，给的不同面额硬币和固定金额，求接近金额最少硬币数的硬币组合
// 思路就是遍历硬币，挨个递归调用考察，并且记录最小硬币数
//自顶而下穷举法
function coin1(arr: number[], amount: number): number {
  if (amount === 0) return 0
  if (amount < 0) return -1
  let result = Infinity
  for (let item of arr) { // 遍历每个硬币，每个硬币都使用下，穷举得到最小的硬币数
    result = Math.min(result, 1 + coin1(arr, amount - item))
  }
  return result
}

function demo(arr, amount){
  if(amount === 0) return 0
  if(amount < 0) return -1
  let ret = arr.length+1
  for(let i=0; i<arr.length; i++){
    ret = Math.min(ret, demo(arr, amount-arr[i]))
  }
  return ret
}
//备忘录优化
function coin2(arr: number[], amount: number): number {
  const memoryMap = new Map<number, number>() // 记录某个金额所需的硬币数
  function coin(amount: number): number {
    if (memoryMap.has(amount)) return memoryMap.get(amount) || 0
    if (amount === 0) return 0
    if (amount < 0) return -1
    let result = Infinity
    for (let item of arr) {
      let res = coin(amount - item)
      if (res === -1) continue
      result = Math.min(result, 1 + res)
    }
    memoryMap.set(amount, result === Infinity ? -1 : result)
    return memoryMap.get(amount) || 0
  }
  return coin(amount)
}


//动态规划自底向上使用dp数组优化
function coin3(coins: number[], amount: number): number {
  const dp: number[] = Array(amount + 1).fill(amount + 1)//初始化dp数组，长度amount+1，值为amout+1 记录某个金额所需要的硬币数
  dp[0] = 0
  for (let i = 1; i < dp.length; i++) { // 自底向上
    for (const coin of coins) {
      if (i - coin < 0) continue
      dp[i] = Math.min(dp[i], 1 + dp[i - coin]) // 比较使用当前硬币和不使用哪种情况更小
    }
  }
  return dp[amount] === amount + 1 ? -1 : dp[amount]
}


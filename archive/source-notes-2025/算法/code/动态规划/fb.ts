//斐波那契数列
//自顶而下穷举法+备忘录优化
function fb1(num: number): number {
  const memoryMap = new Map<number, number>()
  function fb(n: number): number {
    if (memoryMap.has(n)) return memoryMap.get(n) || 0
    if (n === 1 || n === 2) return 1
    let res: number = fb(n - 1) + fb(n - 2)
    memoryMap.set(n, res)
    return memoryMap.get(n) || 0
  }
  return fb(num)
}

//动态规划自底而上解法,使用dp:number[]
function fb2(num: number): number {
  const dp: number[] = [0, 1, 1]
  for (let i = 3; i < num; i++) {
    dp[i] = dp[i - 1] + dp[i - 2]
  }
  return dp[num]
}


//考虑到整个dp数组只是用到了前两项，因此空间造成浪费，进一步优化
function fb3(num: number): number {
  if (num === 0) return 0
  if (num === 1 || num === 2) return 1
  let pre: number = 1
  let cur: number = 1
  for (let i = 3; i < num; i++) {
    let sum = pre + cur
    pre = cur
    cur = sum
  }
  return cur
}

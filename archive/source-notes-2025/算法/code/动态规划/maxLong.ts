//申请一个dp数组，用于存放数组中每项的最长增序子序列长度
function maxLong(arr: number[]): number {
  const dp: number[] = Array(arr.length).fill(1)
  for (let i: number = 1; i < dp.length; i++) {
    for (let j: number = i - 1; j >= 0; j--) {//找出i前面的比arr[i]小的所有值对应的dp值，取最大的
      if (arr[i] > arr[j]) {
        dp[i] = Math.max(dp[i], dp[j] + 1)
      }
    }
  }
  let max = -1
  for (let i: number = 0; i < dp.length; i++) {
    if (dp[i] > max) max = dp[i]
  }
  return max
}

function maxLongDemo(arr: number[]): number {
  const dp: number[] = Array(arr.length).fill(1)
  for(let i=1; i<arr.length; i++){
    for(let j=i-1; j>=0; j--){
      if(arr[i]>arr[j]){
        dp[i] = Math.max(dp[i], 1 + dp[j])
      }
    }
  }
  let result = 0
  for (let item of dp) {
    if (item > result) {
      result = item
    }
  }
  return result
}

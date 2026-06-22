function bubble(arr: number[]): number[] {
  for (let i = 0; i < arr.length; i++) {
    let flag: boolean = false
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[i] > arr[j]) {//swrap
        [arr[i], arr[j]] = [arr[j], arr[i]]
        flag = true
      }
    }
    if (!flag) break //一轮下来没有swrap则表明已经是有序的
  }
  return arr
}

function bubbleDemo(arr: number[]): number[] {
  for (let i: number = 0; i < arr.length; i++) {
    let flag: boolean = false
    for (let j: number = 0; j < arr.length - i - 1; j++) {
      if (arr[i] > arr[j]) {
        [arr[i], arr[j]] = [arr[j], arr[i]]
        flag = true
      }
    }
    if (flag === false) break
  }
  return arr
}

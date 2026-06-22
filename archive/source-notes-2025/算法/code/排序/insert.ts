function insert(arr: number[]): number[] {
  if (arr.length < 2) return arr
  for (let i = 1; i < arr.length; i++) {
    let value: number = arr[i]
    let j = i - 1;
    for (; j >= 0; j--) {
      if (arr[j] > value) {
        arr[j + 1] = arr[j]
      } else {
        break
      }
    }
    arr[j + 1] = value
  }
  return arr
}

function insertDemo(arr: number[]): number[] {
  if (arr.length <= 1) return arr
  for (let i = 1; i < arr.length; i++) {
    let value: number = arr[i]
    let j: number = i - 1
    for (; j >= 0; j--) {//将大于目标值的元素右移操作
      if (arr[j] > value) {
        arr[j + 1] = arr[j]
      } else {
        break
      }
    }
    arr[j + 1] = value
  }
  return arr
}


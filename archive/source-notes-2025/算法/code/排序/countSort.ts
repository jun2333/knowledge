//计数排序
function countSort(arr: number[], range: number): number[] {
  const countArr: number[] = Array(range+1).fill(0)
  for (let item of arr) {
    countArr[item]++
  }
  for (let i: number = 1; i < range; i++) {
    countArr[i] += countArr[i - 1]
  }
  const newArr: number[] = []
  for (let i = arr.length - 1; i >= 0; i--) {
    let index = countArr[arr[i]]
    newArr[index - 1] = arr[i]
    countArr[arr[i]]--
  }
  return newArr
}

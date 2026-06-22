//给定一个数组，输出满足下列条件的数字
//1. 比前面的数都大 2. 比后面的数都小 3. 时间复杂度O(n)，空间复杂度O(n)
function demo(arr) {
  let minValueOnBack = [] //用于记录当前指针后面最小的值（包括自己）
  let len = arr.length
  minValueOnBack[len - 1] = arr[len - 1]
  for (let i = len - 2; i >= 0; i--) {
    minValueOnBack[i] = Math.min(minValueOnBack[i + 1], arr[i])
  }
  let maxValueForFront = -Infinity
  let res = []
  console.log(minValueOnBack)
  for (let i = 0; i < len; i++) {
    if (arr[i] > maxValueForFront && arr[i] <= minValueOnBack[i]) {
      res.push(arr[i])
    }
    if (arr[i] > maxValueForFront) {
      maxValueForFront = arr[i]
    }
  }
  return res
}

let a = [21, 11, 45, 56, 9, 66, 77, 89, 78, 68, 100, 120, 111]
console.log(demo(a))

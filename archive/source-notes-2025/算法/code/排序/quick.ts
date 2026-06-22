function quick(arr: number[]): number[] {
  let len: number = arr.length
  sortMain(arr, 0, len - 1)
  return arr
}

function sortMain(arr: number[], start: number, end: number): void {
  if (start >= end) return
  let mid = patition(arr, start, end)
  sortMain(arr, start, mid - 1)
  sortMain(arr, mid + 1, end)
}

function patition(arr: number[], start: number, end: number): number {
  let privot = arr[end]//固定privot为末尾值
  let i: number = start;
  let j: number = i
  const swrap = (m: number, n: number): void => {
    [arr[m], arr[n]] = [arr[n], arr[m]]
  }
  while (j < end) {
    if (arr[j] <= privot) {
      swrap(i, j)
      i++
    }
    j++
  }
  swrap(i, end)
  return i
}


class QuickDemo {
  arr: number[]
  privotIndex: number
  constructor(arr: number[], privotIndex: number) {
    this.arr = arr
    this.privotIndex = privotIndex
  }
  sort() {
    this.sortMain(0, this.arr.length - 1)
  }
  sortMain(start: number, end: number) {
    const mid: number = this.patition(start, end)
    this.sortMain(start, mid - 1)
    this.sortMain(mid + 1, end)
  }
  patition(start: number, end: number): number {
    const privot = this.arr[this.privotIndex]
    this.movePrivot()
    let i: number = 0
    let j: number = 0
    while (j < end) {
      if (this.arr[j] <= privot) {
        this.swrap(i, j)
        i++
      }
      j++
    }
    this.swrap(i, end)
    return i
  }
  movePrivot() {
    const value = this.arr[this.privotIndex]
    this.arr.splice(this.privotIndex, 1)
    this.arr.push(value)
  }
  swrap(i: number, j: number) {
    [this.arr[i], this.arr[j]] = [this.arr[j], this.arr[i]]
  }
}

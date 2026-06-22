function mergeSort(arr: number[]): number[] {
  let len = arr.length
  return mergeSortC(arr, 0, len - 1)
}
function mergeSortC(arr: number[], start: number, end: number): number[] {
  if (start >= end) return [arr[start]]
  let mid = Math.floor(start + (end - start) / 2)
  return merge(mergeSortC(arr, start, mid), mergeSortC(arr, mid + 1, end))
}

function merge(arr1: number[], arr2: number[]): number[] {
  let result: number[] = []
  let i: number = 0
  let j: number = 0
  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      result.push(arr1[i])
      i++
    } else {
      result.push(arr2[j])
      j++
    }
  }
  if (i < arr1.length) {
    result = result.concat(arr1.slice(i))
  }
  if (j < arr2.length) {
    result = result.concat(arr2.slice(j))
  }

  return result
}


class MergeSortDemo {
  arr: number[]
  constructor(arr: number[]) {
    this.arr = arr
  }
  merge(){
    return this.mergeSort(0, this.arr.length - 1)
  }
  mergeSort(start: number, end: number) {
    if (start >= end) return [this.arr[start]]
    let mid = Math.floor(start + (end - start) / 2)
    return this.mergeArr(
      this.mergeSort(start, mid),
      this.mergeSort(mid + 1, end)
    )
  }
  mergeArr(left: number[], right: number[]) {
    let leftIndex:number = 0
    let rightIndex:number = 0
    let result:number[] = []
    while(leftIndex<left.length&&rightIndex<right.length){
      if(left[leftIndex]<=right[rightIndex]){
        result.push(left[leftIndex])
        leftIndex++
      }else{
        result.push(right[rightIndex])
        rightIndex++
      }
    }
    if(leftIndex<left.length){
      result = result.concat(left.slice(leftIndex))
    }
    if(rightIndex<right.length){
      result = result.concat(right.slice(rightIndex))
    }
    return result
  }
}

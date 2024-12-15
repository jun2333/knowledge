function select(arr: number[]): number[] {
  for (let i = 0; i < arr.length; i++) {
    let mixIndex: number = i
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] < arr[mixIndex]) {
        mixIndex = i
      }
    }
    [arr[i], arr[mixIndex]] = [arr[mixIndex], arr[i]]//swrap
  }
  return arr
}

function selectDemo(arr: number[]): number[] {
  if (arr.length <= 1) return arr
  for (let i: number = 0; i < arr.length; i++) {
    let mixIndex = i
    for (let j: number = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[mixIndex]) {
        mixIndex = j
      }
    }
    [arr[i], arr[mixIndex]] = [arr[mixIndex], arr[i]]
  }
  return arr
}

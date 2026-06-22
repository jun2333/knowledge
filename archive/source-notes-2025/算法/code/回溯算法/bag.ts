function bag(arr: number[], w: number): number {
  let maxW: number = 0
  let n: number = arr.length
  function backtrack(i: number, cw: number): void {
    if (cw === w || i === n) {
      if (cw > maxW) maxW = cw
      return
    }
    backtrack(i + 1, cw)//不装
    if (cw + arr[i + 1] <= w) {
      backtrack(i + 1, cw + arr[i + 1])//装
    }
  }
  backtrack(-1, 0)
  return maxW
}

function bagDemo(arr: number[], w: number): number {
  const n: number = arr.length - 1
  let maxW: number = 0
  const memoryW: number[] = []
  trackback(-1, 0)
  function trackback(i: number, cw: number): void {
    if (i === n || cw === w) {
      if (cw > maxW) maxW = cw
      return
    }
    if (memoryW[i] === cw) return
    memoryW[i] = cw
    trackback(i + 1, cw)
    if (cw + arr[i + 1] <= w) trackback(i + 1, cw + arr[i + 1])
  }
  return maxW
}

//优化版本使用备忘录
function bag1(arr: number[], w: number): number {
  let maxW: number = 0
  let n: number = arr.length
  let memery: number[] = [] //备忘录 记录 当前物品序号->当前总重量 的映射关系
  function backtrack(i: number, cw: number): void {
    if (cw === w || i === n) {
      if (cw > maxW) maxW = cw
      return
    }
    if (memery[i] === cw) return
    memery[i] = cw
    backtrack(i + 1, cw)//不装
    if (cw + arr[i + 1] <= w) {
      backtrack(i + 1, cw + arr[i + 1])//装
    }
  }
  backtrack(-1, 0)
  return maxW
}

//变形问题：若每个物体都有自己的价值，怎么保证不超过背包总重量前提下，价值最大，并返回最大价值
interface objArr {
  w: number,
  p: number
}
function bag2(arr: objArr[], w: number): number {
  let maxPrice: number = 0
  let n: number = arr.length
  let memoryP: number[] = []
  function backtrack(i: number, cw: number, cp: number): void {
    if (cw === w || i === n) {
      if (cp > maxPrice) maxPrice = cp
      return
    }
    if (memoryP[i] === cp) return
    memoryP[i] = cp
    backtrack(i + 1, cw, cp)
    let next = arr[i + 1] || { w: 0, p: 0 }
    if (cw + next.w <= w) {
      backtrack(i + 1, cw + next.w, cp + next.p)
    }
  }
  backtrack(-1, 0, 0)
  return maxPrice
}

const b: objArr[] = [
  { w: 1, p: 2 },
  { w: 99, p: 19 },
  { w: 12, p: 3 },
];
console.log(bag2(b, 112))

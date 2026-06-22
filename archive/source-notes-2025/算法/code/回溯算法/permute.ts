function permute(nums: number[]): number[][] {
    const result: number[][] = []
    function backtrack(track: number[]): void {
        if (track.length === nums.length) {
            result.push(track)
            return
        }
        for (const num of nums) {
            if (track.includes(num)) continue
            track.push(num)
            backtrack(track.slice())
            track.pop()
        }
    }
    backtrack([])
    return result
}

console.log(permute([1, 2, 3]))

function demo(arr:number[]):number[][]{
  const result:number[][] = []
  trackback([])
  function trackback(selectedArr:number[]):void{
    if(selectedArr.length === arr.length){
      result.push(selectedArr)
      return
    }
    for(let item of arr){
      if(selectedArr.includes(item)) continue
      selectedArr.push(item)
      trackback(selectedArr.slice())
      selectedArr.pop()
    }
  }
  return result
}

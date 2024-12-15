function solveNQueens(num: number): void {
  const result: number[] = []
  backtrack(0)
  function backtrack(row: number): void {
    if (row === num) {
      print()
      return
    }
    for (let col = 0; col < num; col++) {
      if (isValid(row, col)) {
        result[row] = col
        backtrack(row + 1)
      }
    }
  }
  function isValid(row: number, col: number): boolean {
    let leftCol: number = col - 1
    let rightCol: number = col + 1
    for (let i = row - 1; i >= 0; i--) {
      if (result[i] === col) return false
      else if (leftCol >= 0 && result[i] === leftCol) return false
      else if (rightCol < num && result[i] === rightCol) return false
      leftCol--
      rightCol++
    }
    return true
  }
  function print(): void {
    for (let i = 0; i < num; i++) {
      let str: string = ''
      for (let j = 0; j < num; j++) {
        let res: string = result[i] === j ? 'Q ' : '* '
        str += res
      }
      console.log(str)
    }
    console.log('\n')
  }
}

solveNQueens(5)



function demo(num: number): void {
  const result: number[] = []
  trackback(0)
  function trackback(row: number): void {
    if (row === num) {
      print()
      return
    }
    for (let col = 0; col < num; col++) {
      if (isOk(row, col)) {
        result[row] = col
        trackback(row + 1)
      }
    }
  }
  function isOk(r: number, c: number): boolean {
    let lastRow: number = r - 1
    let leftCol: number = c - 1
    let rightCol: number = c + 1
    for (let row = lastRow; row > 0; row--) {
      if (result[row] === c) return false
      else if (leftCol >= 0 && result[leftCol] === c) return false
      else if (rightCol < num && result[rightCol] === c) return false
      leftCol--
      rightCol++
    }
    return true
  }
  function print(): void {
    for (let i = 0; i < num; i++) {
      let str: string = ''
      for (let j = 0; j < num; j++) {
        let res: string = result[i] === j ? 'Q ' : '* '
        str += res
      }
      console.log(str)
    }
    console.log('\n')
  }
}

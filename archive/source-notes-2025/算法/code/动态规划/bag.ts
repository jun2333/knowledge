function bag(arr: number[], w: number): number {
    const dp: boolean[][] = Array(arr.length).fill(Array(w + 1))
    dp[0][0] = true
    if (arr[0] < w) dp[0][arr[0]] = true
    for (let i = 1; i < arr.length; i++) {
        for (let j = 0; j < w; j++) {
            if (dp[i - 1][j] === true) dp[i][j] = true
        }
        for (let j = 0; j < w - arr[i]; j++) {
            if (dp[i - 1][j] === true) dp[i][j + arr[i]] = true
        }
    }
    for (let i = w; i >= 0; i--) {
        if (dp[arr.length - 1][i] === true) return i
    }
}
//优化空间，使用一维数组
function bag1(arr: number[], w: number): number {
    const dp: boolean[] = Array(w + 1)
    dp[0] = true
    for (let i = 1; i < arr.length; i++) {
        for (let j = w - arr[i]; j >= 0; j--) {
            if (dp[j] === true) dp[j + arr[i]] = true
        }
    }
    for (let i = w; i >= 0; i--) {
        if (dp[i] === true) return i
    }
}
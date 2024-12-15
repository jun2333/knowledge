// 以数组 intervals 表示若干个区间的集合，其中单个区间为 intervals[i] = [starti, endi] 。请你合并所有重叠的区间，并返回 一个不重叠的区间数组，该数组需恰好覆盖输入中的所有区间 。



// 示例 1：

// 输入：intervals = [[1,3],[2,6],[8,10],[15,18]]
// 输出：[[1,6],[8,10],[15,18]]
// 解释：区间 [1,3] 和 [2,6] 重叠, 将它们合并为 [1,6].
// 示例 2：

// 输入：intervals = [[1,4],[4,5]]
// 输出：[[1,5]]
// 解释：区间 [1,4] 和 [4,5] 可被视为重叠区间。

// 先排序，然后合并区间
// 时间复杂度O(nlgn) 空间复杂度O(1)
function merge(intervals) {
    intervals = intervals.sort((a, b) => a[0] - b[0])
    let n = intervals.length - 1
    intervals.push(intervals.shift())
    const isIntersectant = (a, b) => {
        if (a[1] < b[0]) return [a, b]
        return [[a[0], Math.max(a[1], b[1])]]
    }
    while (n > 0) {
        intervals.push(...isIntersectant(intervals.pop(), intervals.shift()))
        n--
    }
    return intervals
}
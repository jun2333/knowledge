// 给定一个字符串 s ，请你找出其中不含有重复字符的 最长子串的长度。(子串不是子序列，得连续)

// 滑动 也可以说是快慢指针
function lengthOfLongestSubstring(s){
    let i = 0 // 慢指针，确定最长子串起始位置
    let end = 0 // 快指针，确定最长子串结束位置
    let res = 0
    const stringMap = new Set // 用于判断重复
    while(i<s.length){
        while(end<s.length && !stringMap.has(s[end])){
            stringMap.add(s[end++])
        }
        res = Math.max(res, end-i)
        stringMap.delete(s[i++])
    }
}

// 20241117
// 给你两个字符串 haystack 和 needle ，请你在 haystack 字符串中找出 needle 字符串的第一个匹配项的下标（下标从 0 开始）
// 如果 needle 不是 haystack 的一部分，则返回  -1 

// 暴力查找O(mn)
function strStr(haystack, needle){
    const n = haystack.length
    const m = needle.length
    for(let i=0;i+m<=n;i++){
        let flag = true
        for(let j=0;j<m;j++){
            if(haystack[i+j]!==needle[j]){ // 遇到不等则跳出内循环，外层循环滑动一位
                flag = false
                break
            }
        }
        if(flag){
            return i
        }
    }
    return -1
}

//KMP算法 待补充...
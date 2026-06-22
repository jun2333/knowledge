// 编写一个函数来查找字符串数组中的最长公共前缀，如果不存在公共前缀，返回空字符串 ""
// 示例
// 输入：strs = ["flower","flow","flight"]
// 输出："fl"

// 直接扫描
function longestCommonPrefix(strs){
    let i = 0 // 行号
    let j = 0 // 列号
    let curStr = ''
    let res = ''
    while(true){
        if(strs[i] === '') return ''
        const cur = strs[i][j]
        if(cur === undefined) break // j不受上限控制，可能为undefined
        if(curStr === '') { // 初次赋值当前字符
            curStr = cur
        }else if(cur !== curStr){
            break
        }

        if(i === strs.length-1){ // 扫描到对后一行，重置行号和curStr、累加结果、滑动列号
            i = 0
            res += curStr
            curStr = ''
            j++
        }else{
            i++
        }
    }
    return res
}
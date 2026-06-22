// 给你一个字符串 s，由若干单词组成，单词前后用一些空格字符隔开。返回字符串中 最后一个 单词的长度

// 单词 是指仅由字母组成、不包含任何空格字符的最大子字符串
// 示例
// 输入：s = "   fly me   to   the moon  "
// 输出：4
// 解释：最后一个单词是“moon”，长度为 4

// 反向遍历找到第一个单词，并输出其长度
function lengthOfLastWord(s){
    let i = s.length - 1
    let res = 0
    while(i>=0){
        if(s[i]!==' '){
            res++
        }else if(res>0){
            break
        }
    }
    return res
}
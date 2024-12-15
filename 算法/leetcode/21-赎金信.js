// 给你两个字符串：ransomNote 和 magazine ，判断 ransomNote 能不能由 magazine 里面的字符构成。

// 如果可以，返回 true ；否则返回 false 。

// magazine 中的每个字符只能在 ransomNote 中使用一次

// 使用hash表
function canConstruct(ransomNote, magazine){
    const charMap = new Map
    for(let i=0; i<magazine.length; i++){ // 预处理，将magazine中的字符存在hash表中，值为出现次数
        const key = magazine[i]
        const value = charMap.has(key) ? charMap.get(key)+1 : 1
        charMap.set(key, value)
    }
    for(let j=0; j<ransomNote.length; j++){ // 遍历ransomNote,消费charMap中的字符，当不存在或者消费完了就return false
        const cur = ransomNote[j]
        if(charMap.has(cur)){
            const charNum = charMap.get(cur) // 字符个数
            if(charNum === 0){ // 消费完了
                charMap.delete(cur)
                return false
            }
            charMap.set(cur, charMap.get(cur)-1) // 消费计数更新
        }else{
            return false
        }
    }
    return true
}

// 计数法
var canConstruct2 = function(ransomNote, magazine) {
    const arr = new Array(26).fill(0)
    for(let i=0; i<ransomNote.length; i++){
        const index = ransomNote[i].charCodeAt()-'a'.charCodeAt()
        arr[index]++
    }
    for(let i=0; i<magazine.length; i++){
        const index = magazine[i].charCodeAt()-'a'.charCodeAt()
        arr[index]--
    }
    return arr.filter(i=>i>0).length === 0
};
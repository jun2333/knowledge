// 字母异位词是通过重新排列不同单词或短语的字母而形成的单词或短语，并使用所有原字母一次。
// 给定两个字符串 s 和 t ，编写一个函数来判断 t 是否是 s 的 字母异位词

// 哈希表法 适用所有场景
function isAnagram(s, t){
    const sMap = new Map()
    for(let i=0; i<s.length; i++){
        const key = s[i]
        const value = sMap.has(key) ? sMap.get(key)+1 : 1
        sMap.set(key, value)
    }
    for(let i=0; i<t.length; i++){
        const cur = t[i]
        if(!sMap.has(cur)){
            return false
        }else{
            const newVal = sMap.get(cur) - 1
            if(newVal>0){
                sMap.set(cur, newVal)
            }else{
                sMap.delete(cur)
            }
        }
    }
    return sMap.size === 0
}

// 计数法(只适用于都是小写字母)
// 空间复杂度降低到O(1)
var isAnagram2 = function(s, t) {
    const arr = new Array(26).fill(0)
    for(let i=0; i<s.length; i++){
        const index = s[i].charCodeAt()-'a'.charCodeAt()
        arr[index]++
    }
    for(let i=0; i<t.length; i++){
        const index = t[i].charCodeAt()-'a'.charCodeAt()
        console.log(index, i)
        arr[index]--
    }
    return arr.filter(i=>i!==0).length === 0
};
// 给定一种规律 pattern 和一个字符串 s ，判断 s 是否遵循相同的规律。

// 这里的 遵循 指完全匹配，例如， pattern 里的每个字母和字符串 s 中的每个非空单词之间存在着双向连接的对应规律。

// 双向映射
function wordPattern(pattern, s){
    const sMap = new Map
    const pMap = new Map
    const sArr = s.split(' ')
    if(sArr.length !== pattern.length) return false
    for(let i=0; i<sArr.length;i++){
        const p = pattern[i]
        const w = sArr[i]
        if(sMap.has(w) && sMap.get(w)!==p || pMap.has(p) && pMap.get(p)!==w) return false
        sMap.set(w, p)
        pMap.set(p, w)
    }
    return true
}
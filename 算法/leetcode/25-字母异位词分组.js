// 给你一个字符串数组，请你将 字母异位词 组合在一起。可以按任意顺序返回结果列表。

// 字母异位词 是由重新排列源单词的所有字母得到的一个新单词。

// 假设字符串由小写字母构成

// 用哈希表存储数组，将字符串排序后的结果作为key
// 时间复杂度O(nklgk) 空间复杂度O(nk)  n为数组长度 k为字符串长度
function f1(strs){
    const map = new Map()
    for(let i=0; i<strs.length; i++){
        const cur = strs[i]
        const key = cur.split('').sort().join('') // O(klgk)
        const value = map.has(key) ? [...map.get(key), cur] : [cur]
        map.set(key, value)
    }
    return Array.from(map.values())
}

// 计数法，将上述排序后的结果作为key换成计数的方式作为key
// 时间空间复杂度都是O(n(k+|Σ|))
function f2(strs){
    const map = new Map()
    for(let i=0; i<strs.length; i++){
        const cur = strs[i]
        // 时间复杂度O(k+∣Σ∣)
        const counts = new Array(26).fill(0)
        for(let j=0; j<cur.length; j++){
            counts[cur[j].charCodeAt()-'a'.charCodeAt()]++ // O(∣Σ∣)
        }
        const key = counts.toString()

        const value = map.has(key) ? [...map.get(key), cur] : [cur]
        map.set(key, value)
    }
    return Array.from(map.values())
}

// 主要目的是将异位词分组，解题思路在于找到异位词直接同样的信息作为哈希表的key，这样遍历的时候就能分类处理了
// 上面的两种解法，1是异位词排序后的字符串作为key 2是计数之后的26个小写字母toString()后的结果作为key
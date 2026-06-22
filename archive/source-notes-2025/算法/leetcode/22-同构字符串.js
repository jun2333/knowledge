// 给定两个长度相同且大于1的字符串 s 和 t ，判断它们是否是同构的。

// 如果 s 中的字符可以按某种映射关系替换得到 t ，那么这两个字符串是同构的。

// 每个出现的字符都应当映射到另一个字符，同时不改变字符的顺序。
// 不同字符不能映射到同一个字符上(换言之一个字符只能被唯一字符映射)，相同字符只能映射到同一个字符上，字符可以映射到自己本身。

function isIsomorphic(s, t){
    const charMap = new Map // 记录映射关系
    const valueMap = new Set // 记录被映射过的字符串
    for(let i=0; i<s.length; i++){
        if(charMap.has(s[i])){ // s[i]映射过
            if(charMap.get(s[i])!==t[i]){ // 但值不是t[i]
                return false
            }
        }else if(!valueMap.has(t[i])){ // s[i]未映射过，t[i]也未被映射过 建立映射关系
            charMap.set(s[i], t[i])
            valueMap.add(t[i])
        }else{ // s[i]未映射过，t[i]被映射过
            return false
        }
    }
    return true
}
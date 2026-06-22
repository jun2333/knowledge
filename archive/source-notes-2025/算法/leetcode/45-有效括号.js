function isValid(s){
    const stack = []
    const flagMap = new Map([['(', ')'], ['[', ']'], ['{', '}']])
    for(let i=0; i<s.length; i++){
        const cur = s[i]
        if(flagMap.has(cur)){
            stack.push(cur)
        }else{
            if(flagMap.get(stack[stack.length-1])!==cur){
                return false
            }
            stack.pop()
        }
    }
    return stack.length === 0
}
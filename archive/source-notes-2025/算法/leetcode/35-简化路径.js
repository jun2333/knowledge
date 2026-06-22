/**
 * @param {string} path
 * @return {string}
 */
var simplifyPath = function(path) {
    const stack = [] // 用来存储目录名
    let s = ''
    let i = 0
    const handleStack = (item) => {
        if(item === '..'){ // 返回上个目录
            stack.pop()
        }else if(item && item !== '.'){ // 添加目录
            stack.push(item)
        }
        return ''
    }
    while(i<path.length){
        if(path[i] === '/'){
            s = handleStack(s)
        }else{
            s+=path[i]
        }
        i++
    }
    s && handleStack(s)
    console.log(stack)
    return `/${stack.join('/')}`
};

// 20241109

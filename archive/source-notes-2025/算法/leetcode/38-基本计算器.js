// 给你一个字符串表达式 s ，请你实现一个基本计算器来计算并返回它的值。

// 注意:不允许使用任何将字符串作为数学表达式计算的内置函数，比如 eval() 。
// 1 <= s.length <= 3 * 105
// s 由数字、'+'、'-'、'('、')'、和 ' ' 组成
// s 表示一个有效的表达式
// '+' 不能用作一元运算(例如， "+1" 和 "+(2 + 3)" 无效)
// '-' 可以用作一元运算(即 "-1" 和 "-(2 + 3)" 是有效的)
// 输入中不存在两个连续的操作符
// 每个数字和运行的计算将适合于一个有符号的 32位 整数

// 优秀算法
// 由于入参只有+-两种运算符，所以通过用符号代替括号的方式将括号忽视掉，依次从左到右两两计算
// 用sign作为当前运算的符号，由于括号存在嵌套，因此用一个栈存各个括号代表的符号
function calculate(s) {
    const stack = [1]
    let sign = 1
    let res = 0
    let i = 0
    while (i < s.length) {
        const cur = s[i]
        switch (cur) {
            case ' ':
                i++
                break;
            case '+':
                sign = stack[stack.length - 1]
                i++
                break;
            case '-':
                sign = -stack[stack.length - 1]
                i++
                break;
            case '(':
                stack.push(sign)
                i++
                break;
            case ')':
                stack.pop()
                i++
                break;
            default:
                let val = `${cur}`
                while (i < s.length && !isNaN(Number(s[i + 1])) && s[i + 1] !== ' ') {
                    val += s[i + 1]
                    i++
                }
                res += sign * Number(val)
                i++
        }
    }
    return res
}

// 实现了基本计算器
// 运算符包括+-*/
function calculate2(s) {
    console.log('before', s)
    s = `(${s})`
    let i = 0
    const stack1 = [] // 存数字和(
    const stack2 = [] // 存操作符和(
    while (i < s.length) {
        const cur = s[i]
        if (cur === ' ') {
            // 不处理
        } else if(cur === '*' || cur === '/'){
            const startIndex = Math.max(findLastIndex(stack2, item => item === '('), findLastIndex(stack2, item => (item === '+' || item === '-')))
            const cnt = (stack2.length - startIndex - 1)*2
            if (cnt > 1) { // 满足有两个数字才触发计算
                stack1.push(calc(stack1.pop(), stack1.pop(), stack2.pop()))
            }
            stack2.push(cur)
        } else if (cur === '+' || cur === '-') {
            const startIndex = findLastIndex(stack1, item => item === '(')
            const cnt = stack1.length - startIndex - 1
            if (cnt > 1) { // 满足有两个数字才触发计算
                stack1.push(calc(stack1.pop(), stack1.pop(), stack2.pop()))
            }
            stack2.push(cur)
        } else if (cur === '(') {
            const pushAll = (val)=>{
                stack1.push(val)
                stack2.push(val)
            }
            pushAll(cur)
            // 针对括号内出现(-1)或者(1)这两种类型的情况做格式化处理，确保运算符和数字的比例是1:2
            // '('后面紧跟的字符只有四种可能：['(', '-', 数字, 空格]
            while(i < s.length && (s[i+1] === '(' || s[i+1] === ' ')){ // 过滤掉后面的'('和空格
                s[i+1] === '(' && pushAll(s[i+1])
                i++
            }
            if(s[i+1] === '-'){ // 遇到'-'统一前面加0 使得表达式变成(0-数字)
                stack1.push(0)
            }else{ // 遇到数字则统一在前面加上0+ 
                stack1.push(0)
                stack2.push('+')
            }
        } else if (!isNaN(Number(cur))) {
            let val = cur
            while (i < s.length && !isNaN(Number(s[i + 1])) && s[i + 1] !== ' ') {
                val = `${val}${s[i + 1]}`
                i++
            }
            stack1.push(Number(val))
        } else if (cur === ')') {
            const queue = stack1.splice(findLastIndex(stack1, item => item === '('))
            const flagQueue = stack2.splice(findLastIndex(stack2, item => item === '('))
            queue.shift() // 去除'('
            flagQueue.shift() // 去除'('
            // 前面的处理确保了每个括号内的数字和运算符的比例是2:1
            // 下面每轮循环取2个数字和1一个运算符进行计算,直到运算符用尽
            while(flagQueue.length){
                let left = queue.shift()
                let right = queue.shift()
                queue.unshift(calc(right, left, flagQueue.shift()))
            }
            stack1.push(queue.pop())
        }
        i++
    }
    return stack1.pop()
}
function findLastIndex(arr, cb){
    for(let i=arr.length-1; i>=0; i--){
        if(cb(arr[i])){
            return i
        }
    }
    return undefined
}

function calc(right, left, flag) {
    let res
    switch (flag) {
        case '+':
            res = left + right
            break;
        case '-':
            res = left - right
            break;
        case '*':
            res = left * right
            break;
        case '/':
            res = left / right
    }
    const v = Math.trunc(res)
    console.log('step:', `${left}${flag}${right}=${v}`)
    return v
}

const test = (str, res)=>{
    if(calculate2(str) === res) {
        console.log('passed!', `${str} = ${res}`)
    }else{
        console.log('failed!', `${str} != ${res}`)
    }
}
const s1 = '3+3*(4/2*3)-1'
const s2 = '1+(-1)-(3)*4/2'
test(s1, 20)
test(s2, -6)

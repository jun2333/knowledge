// 给你一个字符串数组 tokens ，表示一个根据 逆波兰表示法 表示的算术表达式。

// 请你计算该表达式。返回一个表示表达式值的整数。
// 有效的算符为 '+'、'-'、'*' 和 '/' 。
// 每个操作数（运算对象）都可以是一个整数或者另一个表达式。
// 两个整数之间的除法总是 向零截断 。
// 表达式中不含除零运算。
// 输入是一个根据逆波兰表示法表示的算术表达式。
// 答案及所有中间计算结果可以用 32 位 整数表示。
// 示例 1：

// 输入：tokens = ["2","1","+","3","*"]
// 输出：9
// 解释：该算式转化为常见的中缀算术表达式为：((2 + 1) * 3) = 9



/**
 * @param {string[]} tokens
 * @return {number}
 */
// 用一个栈存数字，遇到运算符则取俩数字计算，将结果推入栈中
// 时间复杂度O(n) 空间复杂度O(n)
var evalRPN = function (tokens) {
    const stack1 = []
    const stack2 = []
    const calc = (right, left, flag) => {
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
        return Math.trunc(res)
    }
    for (let i = 0; i < tokens.length; i++) {
        const cur = tokens[i]
        if (!isNaN(Number(cur))) {
            stack2.push(Number(cur))
        } else {
            if (stack2.length > 1) {
                stack2.push(calc(stack2.pop(), stack2.pop(), cur))
            } else {
                stack1.push(cur)
            }
        }
    }
    return Number(stack2.pop())
};

// 中序表达式转后序(逆波兰)
function transferToRPN(s){
    const queue = []
    const stack = []
    let i = 0
    while(i<s.length){
        const cur = s[i]
        if(!isNaN(Number(cur))){ // 数字入队列
            let val = cur
            while(i+1<s.length && !isNaN(Number(s[i+1]))){
                val = `${val}${s[i + 1]}`
                i++
            }
            queue.push(val)
        }else if(cur === '+' || cur === '-'){ // 低优
            // 在循环中把栈里的高优出栈入列，遇到(则停止
            while(stack.length>0 && stack[stack.length-1]!=='('){ 
                queue.push(stack.pop())
            }
            stack.push(cur)
        }else if(cur === '*' || cur === '/'){ // 高优
            // 在循环中把栈里的高优出栈入列，遇到低优或者(则停止
            while(stack.length>0 && (stack[stack.length-1] === '*' || stack[stack.length-1] === '/')){ 
                queue.push(stack.pop())
            }
            stack.push(cur)
        }else if(cur === '('){
            stack.push(cur)
        }else { // 遇到)
            while(stack[stack.length-1]!=='('){
                queue.push(stack.pop())
            }
            stack.pop() // 把(去掉
        }
        i++
    }
    while(stack.length>0){
        queue.push(stack.pop())
    }
    console.log(queue)
    return queue
}

// transferToRPN('132-23+(36-47+5*61)')
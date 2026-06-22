/**
 * @param {string} s
 * @return {number}
 */

const map = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000
}
// 逆序遍历
var romanToInt = function (s) {
    let i = s.length - 1
    let res = 0
    let lastVal = 0
    while (i >= 0) {
        const curVal = map[s[i--]]
        res += curVal >= lastVal ? curVal : -curVal 
        lastVal = curVal
    }
    return res
};
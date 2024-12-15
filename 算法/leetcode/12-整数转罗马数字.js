// 维护一个数字，表示整数与罗马字符的对应关系
// const valueSymbols = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
// 遍历valueSymbols，由大到小依次处理罗马字符
// 在while循环中依次减
function intToRoman(num){
    const roman = []
    const valueSymbols = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]
    for(const [value, symbol] of valueSymbols){
        while(num>=value){
            num -= value
            roman.push(symbol)
        }
        if(num == 0) break
    }
    return roman.join('')
}

// 硬编码O(1)
// 维护各个单位的编码，将num与单位数值取模进行匹配
function intToRoman2(num){
    const thousands = ["", "M", "MM", "MMM"] // 1000-3000
    const hundreds = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"] // 表示100-900
    const tens     = ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"] // 10-90
    const ones     = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"] // 0-9

    const roman = []
    roman.push(thousands[Math.floor(num / 1000)])
    roman.push(hundreds[Math.floor(num % 1000 / 100)])
    roman.push(tens[Math.floor(num % 100 / 10)])
    roman.push(ones[num % 10])
    return roman.join('')
}
function bag(arr, w) {
    var maxW = 0;
    var n = arr.length;
    function backtrack(i, cw) {
        if (cw === w || i === n) { // 递归终止条件
            if (cw > maxW) // 更新最大重量
                maxW = cw;
            return;
        }
        // 考察下一个
        backtrack(i + 1, cw); //不装
        if (cw + arr[i + 1] <= w) {
            backtrack(i + 1, cw + arr[i + 1]); //装
        }
    }
    backtrack(-1, 0);
    return maxW;
}
//优化版本使用备忘录
function bag1(arr, w) {
    var maxW = 0;
    var n = arr.length;
    var memery = []; //备忘录 记录 当前物品序号->当前总重量 的映射关系
    function backtrack(i, cw) {
        if (cw === w || i === n) {
            if (cw > maxW)
                maxW = cw;
            return;
        }
        if (memery[i] === cw) return;
        memery[i] = cw;
        backtrack(i + 1, cw); //不装
        if (cw + arr[i + 1] <= w) {
            backtrack(i + 1, cw + arr[i + 1]); //装
        }
    }
    backtrack(-1, 0);
    return maxW;
}
function bag2(arr, w) {
    var maxPrice = 0;
    var n = arr.length;
    var memoryP = [];
    function backtrack(i, cw, cp) {
        if (cw === w || i === n) {
            if (cp > maxPrice)
                maxPrice = cp;
            return;
        }
        if (memoryP[i] === cp) return;
        memoryP[i] = cp;
        backtrack(i + 1, cw, cp);
        var next = arr[i + 1] || { w: 0, p: 0 };
        if (cw + next.w <= w) {
            backtrack(i + 1, cw + next.w, cp + next.p);
        }
    }
    backtrack(-1, 0, 0);
    return maxPrice;
}
var b = [
    { w: 1, p: 2 },
    { w: 99, p: 19 },
    { w: 12, p: 3 },
];
console.log(bag2(b, 112));

function demo(arr, w){
    let n = arr.length
    let maxW = -Infinity
    const memery = [] // 记录每个物体是否被考察过
    function backtrack(i, iw){
        if(iw===w || i===n){
            if(iw>maxW) maxW = iw
            return 
        }
        if(memery[i] === iw) return
        memery[i] = iw
        backtrack(i+1, iw)
        if(iw+arr[i+1]<w){
            backtrack(i+1, iw+arr[i+1])
        }
    }
    return backtrack(-1, 0)
}

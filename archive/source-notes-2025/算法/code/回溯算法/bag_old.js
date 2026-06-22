//0-1背包算法
//有一个最大承重为w的背包，现有n个物品不可分割，将物体装入背包，求不超重情况下的最大装载重量
//利用回溯算法，一个一个物体装，每个物体只有两种情况，装或者不装，一共有2**n种方法。
let maxW = 0;
/*
 * @params i-当前物品 cw-当前总重量 arr-存放物品的数组 n-物品数量 w-背包能承载总重量
 */
function f(i, cw, arr, n, w) {
    if (cw === w || i === n) {
        //递归结束条件
        if (cw > maxW) maxW = cw;
        return;
    }
    f(i + 1, cw, arr, n, w); //不放
    if (cw + arr[i + 1] < w) {
        f(i + 1, cw + arr[i + 1], arr, n, w); //放
    }
}
const a = [2, 5, 12, 10, 11, 3, 5, 7, 32];
// f(-1, 0, a, a.length, 100);
// console.log(maxW);

//使用"备忘录"优化上面算法
let memoryArr = [];
function f1(i, cw, arr, n, w) {
    if (cw === w || i === n) {
        //递归结束条件
        if (cw > maxW) maxW = cw;
        return;
    }
    if (memoryArr[i] === cw) return;
    memoryArr[i] = cw;
    f1(i + 1, cw, arr, n, w); //不放
    if (cw + arr[i + 1] < w) {
        f1(i + 1, cw + arr[i + 1], arr, n, w); //放
    }
}
f1(-1, 0, a, a.length, 100);
console.log(maxW);

//若每个物体有自己的价值，如何在不超重的前提下保证总价值最大？
let maxP = 0;
function f2(i, cw, cp, arr, n, w) {
    if (cw === w || i === n) {
        //递归结束条件
        if (cp > maxP) maxP = cp;
        return;
    }
    f2(i + 1, cw, cp, arr, n, w); //不放
    if (!arr[i + 1]) return;
    if (cw + arr[i + 1].w <= w) {
        f2(i + 1, cw + arr[i + 1].w, cp + arr[i + 1].p, arr, n, w); //放
    }
}
const b = [
    { w: 1, p: 2 },
    { w: 99, p: 0 },
    { w: 12, p: 3 },
];
f2(-1, 0, 0, b, 3, 100);
console.log(maxP);

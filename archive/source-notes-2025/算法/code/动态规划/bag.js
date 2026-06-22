let list = [2, 5, 3, 7];
console.log(f(list, 4, 100));
console.log(f1(list, 4, 100));
//时间复杂度O(n*w) 空间复杂度O(n*w)
function f(item, n, w) {
    //申请一个二维数组a[n][w+1] 将每个物品不放和放的情况都存起来
    let a = createArray(n, w + 1);
    a[0][0] = true;
    if (item[0] <= w) {
        //第一个特殊处理
        a[0][item[0]] = true;
    }
    for (let i = 1; i < n; i++) {
        //不放
        for (let j = 0; j <= w; j++) { // 找到上一个物品
            if (a[i - 1][j] === true) a[i][j] = true;
        }
        //放
        for (let j = 1; j <= w - item[i]; j++) { // 找到上一个物品(注意控制不超重)
            if (a[i - 1][j] === true) a[i][j + item[i]] = true;
        }
    }
    for (let i = w; i >= 0; i--) { // 返回最后一个物品放进去时的重量
        if (a[n - 1][i] === true) return i;
    }
    return 0;
}
function createArray(m, n) {
    let arr = Array(m);
    for (let i = 0; i < arr.length; i++) {
        arr[i] = Array(n);
    }
    return arr;
}

//优化版本，使用一维数组节省空间
function f1(item, n, w) {
    let a = Array(w); // 记录能触达的重量
    if (item[0] <= w) {
        //第一个特殊处理
        a[item[0]] = true;
    }
    for (let i = 1; i < n; i++) {
        //默认放入背包，寻找此物品放入对应的上一个物品的重量j
        for (let j = w - item[i]; j >= 0; j--) {
            //找到->放
            if (a[j] === true) a[j + item[i]] = true;
        }
    }
    for (let i = w; i >= 0; i--) { // 找出最大能放多少重量
        if (a[i] === true) return i;
    }
    return 0;
}


//升级版本：若每个物体有自己的价值，如何在不超重的前提下保证总价值最大？
//@params item-重量数组 value-价值数组 n-物体数量 w-背包总承重
function f2(item, value, n, w) {
    //申请一个二维数组a[n][w+1]
    let a = createArray(n, w + 1);
    a[0][0] = 0;
    if (item[0] <= w) {
        //第一个特殊处理
        a[0][item[0]] = value[0];
    }
    for (let i = 1; i < n; i++) {
        for (let j = 0; j <= w; j++) {
            //不放
            if (a[i - 1][j] > 0) a[i][j] = a[i - 1][j];
        }
        for (let j = 1; j <= w - item[i]; j++) {
            //放
            let v = a[i - 1][j] + value[i];
            if (v > a[i][j + item[i]]) a[i][j + item[i]] = v;
        }
    }
    let maxValue = -1;
    for (let i = 0; i <= w; i++) {
        if (a[n - 1][i] > maxValue) maxValue = a[n - 1][i];
    }
    return maxValue;
}

function demo(item, value, n, w){
    const dp = createArray(n, w+1)
    dp[0][0] = 0
    if(item[0]<w){
        dp[0][item[0]] = value[0]
    }
    for(let i=0; i<n; i++){
        for(let j=0; j<w; j++){
            if(dp[i-1][j]>0) dp[i][j] = dp[i-1][j]
        }
        for(let j=0; j<w; j++){
            const v = dp[i-1][j]+value[i]
            if(v>dp[i][j+item[i]]) dp[i][j+item[i]] = v
        }
    }
    let max = -1
    for(let i=0; i<w; i++){
        max = Math.max(dp[n-1][i], max)
    }
    return max
}

//双11抢购满200减50，求购物车商品最佳选择方案，能达到最大程度薅羊毛
//问题实质性求价值总和大于200的最小值的商品组合
//@params item-商品列表 n-商品数量 w-满减条件
function f3(item, n, w) {
    //申请一个二维数组a[n][w+1]
    let a = createArray(n, 3 * w + 1); //设定门槛值3*w
    a[0][0] = true;
    if (item[0] <= w) {
        //第一个特殊处理
        a[0][item[0]] = true;
    }
    for (let i = 1; i < n; i++) {
        for (let j = 0; j <= w; j++) {
            //不放
            if (a[i - 1][j] === true) a[i][j] = true;
        }
        for (let j = 1; j <= w - item[i]; j++) {
            //放
            if (a[i - 1][j] === true) a[i][j + item[i]] = true;
        }
    }
    let j = 0;
    //得出大于w的最小值
    for (j = w + 1; j <= 3 * w; j++) {
        if (a[n - 1][j] === true) break;
    }

    for (let i = n - 1; i >= 1; i--) {
        //从后往前推导出上一个物品
        if (j - item[i] > 0 && a[i - 1][j - item[i]] === true) {
            console.log(i);
            j = j - item[i];
        }
    }
    if (j !== 0) console.log(item[0]); //处理第一个
    return 0;
}

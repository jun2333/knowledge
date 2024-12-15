//单for+includes
//时间复杂度:O(n)*includes的时间复杂度 空间复杂度:O(n)
function distinct(arr) {
    let newArr = [];
    for (let i = 0; i < arr.length; i++) {
        if (!newArr.includes(arr[i])) {
            newArr.push(arr[i]);
        }
    }
    console.log(newArr);
    return newArr;
}
//双for循环
//时间复杂度O(n2)*splice时间复杂度 空间复杂度O(1)
function distinct1(arr) {
    for (let i = 0, len = arr.length; i < len; i++) {
        for (let j = 0; j < len; j++) {
            if (i === j) continue;
            if (arr[i] === arr[j] || (isNaN(arr[i]) && isNaN(arr[j]))) { // 简单的===不行，NaN === NaN 返回false
                arr.splice(j, 1);
                j--;
                len--;
            }
        }
    }
    console.log(arr);
    return arr;
}
//filter+indexOf
//时间复杂度：O(n)*indeOf时间复杂度 空间复杂度：O(n)
function distinct2(arr) {
    let newArr = arr.filter((item, index, arr) => {
        return arr.indexOf(item) === index;
    });
    console.log(newArr);
    return newArr;
}
//sort+冒泡比对
//时间复杂度：O(n2)/O(n) * splice时间复杂度  空间复杂度O(n)
function distinct3(arr) {
    let newArr = arr.sort(); // O(nlgn)
    for (let i = 0, len = newArr.length; i < len; i++) {
        if (newArr[i + 1] && newArr[i] === newArr[i + 1] || (isNaN(newArr[i]) && isNaN(newArr[i + 1]))) { // 简单的===不行，NaN === NaN 返回false
            newArr.splice(i + 1, 1);
            i--;
            len--;
        }
    }
    console.log(newArr);
    return newArr;
}
//利用object key唯一性
//时间复杂度：O(n) * splice时间复杂度 空间复杂度：O(n)
function distinct4(arr) {
    let obj = {};
    for (let i = 0, len = arr.length; i < len; i++) {
        let key = `${typeof arr[i] + arr[i]}`;
        if (!obj.hasOwnProperty(key)) {
            obj[key] = true;
        } else {
            arr.splice(i, 1);
            i--;
            len--;
        }
    }
    console.log(arr);
    return arr;
}

//Set去重
//时间复杂度：Set时间复杂度 空间复杂度：O(n)
function distinct5(arr) {
    let newArr = [...new Set(arr)];
    console.log(newArr);
    return newArr;
}


let myArr = [3, 5, 1, NaN, 6, 8, NaN, 8];
distinct3(myArr);

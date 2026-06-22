/*
 * 二分法查找
 * 时间复杂度：O(logn)
 */
function dichotomyMain(arr, value) {
    return dichotomy2(arr, 0, arr.length - 1, value);
}
//递归方式实现
function dichotomy(arr, start, end, value) {
    count++;
    if (start > end) return -1;
    let midIndex = start + Math.floor((end - start) / 2);
    if (value < arr[midIndex]) {
        return dichotomy(arr, start, midIndex - 1, value);
    } else if (value > arr[midIndex]) {
        return dichotomy(arr, midIndex + 1, end, value);
    } else {
        return midIndex;
    }
}
//循环方式实现
function dichotomy1(arr, start, end, value) {
    while (start <= end) {
        let midIndex = start + Math.floor((end - start) / 2);
        if (value < arr[midIndex]) {
            end = midIndex - 1;
        } else if (value > arr[midIndex]) {
            start = midIndex + 1;
        } else {
            return midIndex;
        }
    }
    return -1;
}

//查找出第一个等于给定值的元素
function dichotomy2(arr, start, end, value) {
    while (start <= end) {
        let midIndex = start + Math.floor((end - start) / 2);
        if (value < arr[midIndex]) {
            end = midIndex - 1;
        } else if (value > arr[midIndex]) {
            start = midIndex + 1;
        } else {
            if (midIndex === 0 || arr[midIndex - 1] !== value) {
                return midIndex;
            } else {
                end = midIndex - 1;
            }
        }
    }
    return -1;
}
//查找出最后一个等于给定值的元素
function dichotomy2(arr, start, end, value) {
    while (start <= end) {
        let midIndex = start + Math.floor((end - start) / 2);
        if (value < arr[midIndex]) {
            end = midIndex - 1;
        } else if (value > arr[midIndex]) {
            start = midIndex + 1;
        } else {
            if (midIndex === end || arr[midIndex + 1] !== value) {
                return midIndex;
            } else {
                start = midIndex + 1;
            }
        }
    }
    return -1;
}
//查找第一个大于等于给定值的元素
function dichotomy2(arr, start, end, value) {
    while (start <= end) {
        let midIndex = start + Math.floor((end - start) / 2);
        if (arr[midIndex] >= value) {
            if (midIndex === 0 || arr[midIndex - 1] < value) {
                return midIndex;
            } else {
                end = midIndex - 1;
            }
        } else {
            start = midIndex + 1;
        }
    }
    return -1;
}
//查找最后一个小于等于给定值的元素
function dichotomy2(arr, start, end, value) {
    while (start <= end) {
        let midIndex = start + Math.floor((end - start) / 2);
        if (arr[midIndex] <= value) {
            if (midIndex === end || arr[midIndex + 1] > value) {
                return midIndex;
            } else {
                start = midIndex + 1;
            }
        } else {
            end = midIndex - 1;
        }
    }
    return -1;
}

let arrVal = n => {
    let arr = [];
    for (let i = 0; i < n; i++) {
        arr.push(i + 1);
    }
    return arr;
};
let arr = arrVal(100000);
// console.log(arr);
let count = 0;
const res = dichotomyMain([1, 2, 2, 2, 4], 2);
console.log(res, count);

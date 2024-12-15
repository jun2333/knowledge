//插入
// 将数组分成左右两部分，左边为有序，右边待处理
// 遍历处理右边元素的时候将元素放到左边合适的位置中(通过内层循环处理)
function insertSort(arr) {
    let len = arr.length;
    for (let i = 1; i < len; i++) {
        let value = arr[i];
        let j = i - 1;
        for (; j >= 0; j--) {
            if (arr[j] > value) { // 将比value大的已排序部分的项整体右移，腾出一个位置给value
                arr[j + 1] = arr[j];
            } else {
                break;
            }
        }
        arr[j + 1] = value;
    }
    console.log(arr);
}
//冒泡 O(n**2)
// 两两比较，交换  排好序的项会冒泡到最右边
function bubbleSort(arr) {
    for (let i = 0; i < arr.length; i++) {
        let flag = false;
        for (let j = 0; j < arr.length - i - 1; j++) { //排好的都放在最右边
            if (arr[j] > arr[i]) {
                [arr[j], arr[i]] = [arr[i], arr[j]];
                flag = true; //有数据交换
            }
        }
        console.log(arr);
        if (!flag) break;
    }
    console.log(arr);
}
// 选择排序 O(n**2)
// 每轮循环选出一个最小的放在最前面
function selectSort(arr) {
    for (let i = 0; i < arr.length; i++) {
        let minIndex = i; // 记录最小值index
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[j] < arr[minIndex]) {
                minIndex = j;
            }
        }
        [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]]; // 每次选完之后交换元素即可
        console.log(arr);
    }
    // console.log(arr);
}
/*
 * 递归
 * 空间复杂度O(1);可通过递归树分析时间复杂度为O(logn) 所以总时间复杂度为O(nlogn)
 */
function fastSort(arr) {
    let len = arr.length;
    quickSort(arr, 0, len - 1);
    console.log(arr);
}
function quickSort(arr, start, end) {
    if (start >= end) return;
    let mid = partition(arr, start, end);
    console.log(mid, arr);
    quickSort(arr, start, mid - 1);
    quickSort(arr, mid + 1, end);
}

/*
 * 此处默认取最后一个元素为关键节点,将数组分为小于关键节点和大于关键节点两部分
 * 遍历数组，将小于privot的元素换到i的左边(已处理区间),最后将i位置元素与privot交换,此时i的右边都是大于privot的元素
 * 此函数时间复杂度为:O(n) 空间复杂度为:O(1)
 * 下面是采取同侧双指针遍历法，最多访问2n次，如果用双端双指针最多n次
 */

// 同侧双指针
function partition(arr, start, end) {
    let privot = arr[end];
    let i = start,
        j = i;
    while (j < end) {
        if (arr[j] < privot) { // 将小于privot的项放到i左边
            swrapForArr(arr, i, j);
            i++;
        }
        j++;
    }
    swrapForArr(arr, i, end); // 最后将i和privot换位置
    return i;
}

// 双端双指针
function partition2(arr, start, end) {
    let privot = arr[end];
    let i = start,
        j = end-1;
    while (i < j) {
        if (arr[j] < privot) { // 将小于privot的项放到i左边
            swrapForArr(arr, i, j);
            i++;
        }
        j--;
    }
    swrapForArr(arr, i, end); // 最后将i和privot换位置
    return i;
}


/* 
 * 归并排序
*/
function mergeSort(arr) {
    let len = arr.length;
    arr = mergeSortC(arr, 0, len - 1);
    console.log(arr);
}

function mergeSortC(data, start, end) {
    if (start >= end) return [data[start]];//终止递归条件
    let mid = Math.floor((end - start) / 2);
    return merge(
        mergeSortC(data, start, start + mid),
        mergeSortC(data, start + mid + 1, end)
    );
}

function merge(left, right) {
    let newArr = [];
    let i = 0;
    let j = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
            newArr.push(left[i]);
            i++;
        } else {
            newArr.push(right[j]);
            j++;
        }
    }
    if (i < left.length) {
        newArr = newArr.concat(left.slice(i, left.length));
    }
    if (j < right.length) {
        newArr = newArr.concat(right.slice(j, right.length));
    }
    return newArr;
}

function swrapForArr(arr, i, j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
}


/*
 * 利用计数排序给10w用户按照年龄排序(假设年龄在0-120之间)
 */

function countSort(arr, maxAge = 120) {
    let countArr = [];
    for (let i = 0; i < maxAge; i++) {
        countArr[i] = 0;
    }

    for (let i = 0; i < arr.length; i++) {
        countArr[arr[i]]++;
    }
    //累加桶数组
    for (let i = 1; i < countArr.length; i++) {
        countArr[i] += countArr[i - 1];
    }

    let newArr = [];
    // console.log(countArr);
    for (let i = arr.length - 1; i >= 0; i--) {
        let num = countArr[arr[i]];
        newArr[num - 1] = arr[i];
        countArr[arr[i]]--;
    }
    console.log(newArr);
}

function initUserArr(n){
    const arr = [];
    for(let i=0; i<n; i++){
        arr.push(parseInt(Math.random()*119))
    }
    return arr
}
let a = initUserArr(100000)
console.log(a);
countSort(a);

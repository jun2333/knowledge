/* 斐波那契数列 */
/*
 * 时间复杂度:O(2**(n/2)) ~ O(2**n)
 */
function f(n) {
    if (n === 1) return 1;
    if (n === 2) return 2;
    if (n === 3) return 2;
    return f(n - 1) + f(n - 2) + f(n - 3);
}

console.log(f(5));

/* 全排 */

// f(n) = {最后一位是1, f(n-1)} + {最后一位是2, f(n-1)} + ... + {最后一位是n, f(n-1)}
/*
 * parmas arr:数组 len:数组长度 k:处理的个数
 */
function permutations(arr, len, k) {
    //终止递归条件
    if (k === 1) {
        let str = '';
        for (let i = 0; i < len; i++) {
            str += arr[i];
        }
        console.log(str);
        return;
    }
    for (let i = 0; i < len; i++) {
        [arr[i], arr[len - 1]] = [arr[len - 1], arr[i]]; //第一位和最后一位交换位置
        permutations(arr, len, k - 1);
        [arr[len - 1], arr[i]] = [arr[i], arr[len - 1]]; //还原位置
    }
}
permutations([1, 2, 3], 3, 3);

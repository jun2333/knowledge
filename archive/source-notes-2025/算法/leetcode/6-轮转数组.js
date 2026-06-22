// 给定一个整数数组 nums，将数组中的元素向右轮转 k 个位置，其中 k 是非负数。
// 输入: nums = [1,2,3,4,5,6,7], k = 3
// 输出: [5,6,7,1,2,3,4]
// 解释:
// 向右轮转 1 步: [7,1,2,3,4,5,6]
// 向右轮转 2 步: [6,7,1,2,3,4,5]
// 向右轮转 3 步: [5,6,7,1,2,3,4]

// 翻转：经历三次翻转即可
// 1. 0~length-1全部翻转
// 2. 0~n%length-1翻转
// 3. n%length~length-1翻转
// 数组每一项被翻转2次，时间复杂度O(2n)，即O(n)  空间复杂度O(1)
function reverse(arr, start, end){
    while(start<end){
        let tmp = arr[end]
        arr[end] = arr[start]
        arr[start] = tmp
        start++
        end--
    }
}
function f1(nums, k){
    const n = k%nums.length
    reverse(nums, 0, nums.length-1)
    reverse(nums, 0, n-1)
    reverse(nums, n, nums.length-1)
}

(function(){
    const a = [1,2,3,4,5,6,7]
    console.log(a)
    f1(a, 3)
    console.log(a)
})()

// 方案2：额外搞个数组一一复制过去，只是空间复杂度是O(n)，时间复杂度还是O(n)
function f2(nums, k) {
    const n = nums.length;
    const newArr = new Array(n);
    for (let i = 0; i < n; ++i) {
        newArr[(i + k) % n] = nums[i];
    }
    for (let i = 0; i < n; ++i) {
        nums[i] = newArr[i];
    }
};

// 方案3：环形替换  时间复杂度O(n)  空间复杂度O(1)
const gcd = (x, y) => y ? gcd(y, x % y) : x; // 求最大公约数

function f3(nums, k) {
    const n = nums.length;
    k = k % n;
    let count = gcd(k, n);
    for (let start = 0; start < count; ++start) {
        let current = start;
        let prev = nums[start];
        do {
            const next = (current + k) % n;
            const temp = nums[next];
            nums[next] = prev;
            prev = temp;
            current = next;
        } while (start !== current);
    }
};
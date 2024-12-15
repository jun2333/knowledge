/* 判断回文字符串实现 */
function isHuiwenString(str, start, end) {
    while (end - start >= 1) {
        if (str[start] !== str[end]) {
            return false;
        }
        start++;
        end--;
        return true;
    }
}
/* 
    1、为了避免回文串中间字符为空的情况，预处理字符串，将字符串之间加#
    2、然后遍历整个字符串，用一个数组来记录以该字符为中心的回文长度，为了方便计算右边界，我在数组中记录长度的一半（向下取整）
    3、每一次遍历的时候，如果该字符在已知回文串最右边界的覆盖下，那么就计算其相对最右边界回文串中心对称的位置，得出已知回文串的长度
    4、判断该长度和右边界，如果达到了右边界，那么需要进行中心扩展探索。当然，如果第3步该字符没有在最右边界的“羽翼”下，则直接进行中心扩展探索。进行中心扩展探索的时候，同时又更新右边界
    5、最后得到最长回文之后，去掉其中的特殊符号即可
*/
//找出字符串的最长回文子串(马拉车算法)
var longestPalindrome = function (s) {
    //预处理字符串
    s = s.split('').join('#');
    console.log(s);
    let len = s.length;
    let arr = []; //存放每个字符的最大回文串长度,这里为了方便求右边界,存长度的一半向下取整
    let rightSide = 0; //右边距
    let rightSideCenter = 0; //右边距对应的中间位置
    let maxLength = 0; //最长回文串长度一半向下取整
    let maxCenter = 0; //最长回文串对应的中间位置
    for (let i = 0; i < len; i++) {
        let shouldSearch = true; //是否需要中心扩展探索
        if (i < rightSide) {
            let leftSide = 2 * rightSideCenter - i;
            arr[i] = arr[leftSide];
            if(i + arr[i] > rightSide) {//需要从rightSide内开始进行中心扩展探索
                arr[i] = rightSide - i
            }
            if (i + arr[i] < rightSide) {
                shouldSearch = false;
            }
        }
        if (shouldSearch) {
            arr[i] = typeof arr[i] === 'undefined' ? 0 : arr[i];
            while (i - 1 - arr[i] >= 0 && i + 1 + arr[i] < len) {
                if (s[i - 1 - arr[i]] === s[i + 1 + arr[i]]) {
                    arr[i]++;
                } else {
                    break;
                }
            }
            rightSide = i + arr[i];
            rightSideCenter = i;
            //取长度较大的，当长度相等时，特殊判断
            if (arr[i] > maxLength || arr[i] === maxLength && s[maxCenter+maxLength] === '#') {
                maxLength = arr[i];
                maxCenter = i;
            }
        }
    }
    let res = '';
    console.log(maxCenter,maxLength,arr)
    for (let i = s[maxCenter - maxLength] === '#' ? maxCenter - maxLength + 1 : maxCenter - maxLength; i <= maxCenter + maxLength; i += 2) {
        res += s[i];
    }
    return res;
};

console.log(longestPalindrome("bananas"));

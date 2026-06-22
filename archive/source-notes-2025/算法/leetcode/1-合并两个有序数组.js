// 要求：将两个有序数组合并为一个有序数组，结果存到其中一个数组中
// 入参为数组arr1, n为arr1的有效值长度,arr2为数组2,m为arr2长度,结果存入arr1,所以arr1长度为n+m

// 合并之后，调用排序函数
// 时间复杂度O(n+mlgn+m) 空间复杂度O(n+mlgn+m)
function f1(arr1, n, arr2, m){
    arr1.splice(n, arr1.length-n, ...arr2)
    arr1.sort((a,b)=>a-b)
}
// 双指针分别遍历链两个数组，结果存入临时数组，最后复制到其中一个数组
// 时间复杂度为O(n+m) 空间复杂度O(n+m)
function f2(arr1, n, arr2, m){
    let i=0
    let j=0
    let cur
    const tmpArr = Array(n+m)
    while(i<n || j<m){
        if(i===n){
            cur = arr2[j++]
        }else if(j===m){
            cur = arr1[i++]
        }else if(arr1[i]<arr2[j]){
            cur = arr1[i++]
        }else{
            cur = arr2[j++]
        }
        tmpArr[i+j-1]=cur // 由于i或j已经在前面++操作了，所以下标需要-1
    }
    for(let k=0; k<tmpArr.length; k++){
        arr1[k] = tmpArr[k]
    }
}
// 逆向双指针
// 时间复杂度为O(n+m) 空间复杂度O(1)
function f3(arr1, n, arr2, m){
    let i=n-1
    let j=m-1
    let cur
    while(i>-1 || j>-1){
        if(i===n){
            cur = arr2[j--]
        }else if(j===m){
            cur = arr1[i--]
        }else if(arr1[i]<arr2[j]){
            cur = arr2[j--]
        }else{
            cur = arr1[i--]
        }
        arr1[i+j+1+1]=cur // 由于i或j已经在前面--操作了，所以下标需要+1
    }
}


function quanpai(arr, k) {
    let len = arr.length;
    if (k === 1) {
        for (let i = 0; i < len; i++) {
            console.log(arr[i]);
        }
        console.log();
    }
    for (let i = 0; i < k; i++) {
        [arr[i], arr[k - 1]] = [arr[k - 1], arr[i]]; // 将第一个和最后一个换位置
        quanpai(arr, k - 1); // 固定最后一个，继续考察剩余的排列情况
        [arr[i], arr[k - 1]] = [arr[k - 1], arr[i]]; // 还原
    }
}


function demo(arr, k){
    if(k===1){
        for(let i=0; i<arr.length; i++){
            console.log(arr[i])
        }
        console.log()
    }
    for(let i=0; i<k; i++){
        [arr[i], arr[k-1]] = [arr[k-1], arr[i]];
        demo(arr, k-1);
        [arr[i], arr[k-1]] = [arr[k-1], arr[i]];
    }
}

function quanpai2(arr){
    function trackback(track){
        if(track.length === arr.length){
            for(let i=0; i<track.length; i++){
                console.log(track[i])
            }
            console.log()
        }
        for(let i=0; i<arr.length; i++){
            if(track.includes(arr[i])) continue
            track.push(arr[i])
            trackback(track.slice())
            track.pop()
        }
    }
    trackback([])
}

quanpai2([1, 2, 3, 4], 4);


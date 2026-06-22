function shuffle(arr) {
    var i = arr.length
    var j
    while (i > 0) {
        j = Math.floor(Math.random() * i--)
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr;
}
console.log(shuffle([1, 2, 3, 4, 5, 6]));

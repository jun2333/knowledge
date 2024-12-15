const result = [];
cal8queens(0);
function cal8queens(row) {
    //调用方式cal8queens(0)
    if (row === 8) {
        // console.log(result);
        print();
        return;
    }
    for (let column = 0; column < 8; column++) {
        if (isOk(row, column)) {
            result[row] = column;
            cal8queens(row + 1);
        }
    }
}
function isOk(row, col) {
    let leftCol = col - 1,
        rightCol = col + 1;
    for (let i = row - 1; i >= 0; i--) {
        if (result[i] === col) return false;
        if (leftCol >= 0 && result[i] === leftCol) return false;
        if (rightCol < 8 && result[i] === rightCol) return false;
        leftCol--;
        rightCol++;
    }
    return true;
}

function print() {
    for (let i = 0; i < 8; i++) {
        let str = '';
        for (let j = 0; j < 8; j++) {
            let res = result[i] === j ? 'Q ' : '* ';
            str += res;
        }
        console.log(str);
    }
    console.log('\n');
}

const demoRes = []
function demo(row){
    if(row===n){
        return print()
    }
    for(let col=0; col<n; col++){
        if(isOkDemo(row, col)){
            demoRes[row] = col
        }
    }
}
function isOkDemo(r, c){
    let leftC = c-1
    let rightC = c+1
    for(let j=r-1; j>=0; j--){
        if(demoRes[j] === c) return false
        if(leftC>=0 && demoRes[j] === leftC) return false
        if(rightC<n && demoRes[j] === rightC) return false
    }
    return true
}

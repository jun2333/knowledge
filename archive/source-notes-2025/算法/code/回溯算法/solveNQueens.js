function solveNQueens(num) {
    var result = [];
    backtrack(0);
    function backtrack(row) {
        if (row === num) {
            print();
            return;
        }
        for (var col = 0; col < num; col++) {
            if (isValid(row, col)) {
                result[row] = col;
                backtrack(row + 1);
            }
        }
    }
    function isValid(row, col) {
        var leftCol = col - 1;
        var rightCol = col + 1;
        for (var i = row - 1; i >= 0; i--) {
            if (result[i] === col)
                return false;
            else if (leftCol >= 0 && result[i] === leftCol)
                return false;
            else if (rightCol < num && result[i] === rightCol)
                return false;
            leftCol--;
            rightCol++;
        }
        return true;
    }
    function print() {
        for (var i = 0; i < num; i++) {
            var str = '';
            for (var j = 0; j < num; j++) {
                var res = result[i] === j ? 'Q ' : '* ';
                str += res;
            }
            console.log(str);
        }
        console.log('\n');
    }
}
solveNQueens(5);

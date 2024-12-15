// console.log(global)

const arr = [];
// function bianli(obj){
//     for(let key in obj){
//         arr.push(key)
//         if(typeof obj[key] === 'object'){
//             bianli(obj[key])
//         }
//     }
// }
function bianli(obj) {
    let arr1 = [obj];
    const firstBl = o => {
        for (let key in o) {
            console.log(key);
            if (typeof o[key] === 'object') {
                arr1.push(o[key]);
            }
        }
    };
    while (arr1.length) {
        firstBl(arr1.shift());
    }
    console.log(i);
}

//求二叉树高度
function gaodu(node) {
    if (node.left !== null && node.right !== null) {
        return Math.max(gaodu(node.left), gaodu(node.right)) + 1;
    } else if (node.left !== null) {
        return gaodu(node.left) + 1;
    } else if (node.right !== null) {
        return gaodu(node.right) + 1;
    } else {
        return 0;
    }
}

let o = {
    a: 1,
    b: {
        b1: {
            'b1-1': 1,
        },
        b2: 1,
    },
    c: {
        c1: 1,
        c2: {
            'c2-1': 1,
            'c2-2': 0,
        },
    },
    d: 5,
};
// bianli(o);

let tree = {
    data: 6,
    left: {
        data: 4,
        left: {
            data: 2,
            left: {
                data: 1,
                left: null,
                right: null,
            },
            right: {
                data: 3,
                left: null,
                right: null,
            },
        },
        right: {
            data: 5,
            left: null,
            right: null,
        },
    },
    right: {
        data: 8,
        left: {
            data: 7,
            left: null,
            right: null,
        },
        right: {
            data: 9,
            left: null,
            right: null,
        },
    },
};

let h = gaodu(tree);
console.log(h);

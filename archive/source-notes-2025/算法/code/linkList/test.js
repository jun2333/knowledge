const {
    createLinkListByArray,
    find,
    traversePrintLinkList,
    reverseLinkList,
    mergeLinkList,
    insert
} = require('./index');
const arr1 = [1, 4, 6, 7];
const arr2 = [2,3,5]
const link1 = createLinkListByArray(arr1);
// insert(link1.head, 6, 7);
// traversePrintLinkList(link1.head);
// const link2 = createLinkListByArray(arr2);
// const link3 = mergeLinkList(link1, link2);
// reverseLinkList(link3.head, link3.tail).then(() => {
//     traversePrintLinkList(link3.head);
// });

function delay(time) {
    let now = performance.now();
    while (performance.now() - now < time) {
        // ...
    }
}

let elementNum = 0
function idleCallback() {
    let emptyPoints = 0
    for (let i = 1; i <= 9; i++) {
        // x轴采样点
        const xElements = document?.elementFromPoint((window.innerWidth * i) / 10, window.innerHeight / 2);
        // y轴采样点
        const yElements = document?.elementFromPoint(window.innerWidth / 2, (window.innerHeight * i) / 10);
        // 上升的对角线采样点
        const upDiagonalElements = document?.elementFromPoint(
            (window.innerWidth * i) / 10,
            (window.innerHeight * i) / 10,
        );
        // 下降的对角线采样点
        const downDiagonalElements = document?.elementFromPoint(
            (window.innerWidth * i) / 10,
            window.innerHeight - (window.innerHeight * i) / 10,
        );

        if (isContainer(xElements)) emptyPoints++;

        // 中心点只计算一次
        if (i !== 5) {
            if (isContainer(yElements)) emptyPoints++;
            if (isContainer(upDiagonalElements)) emptyPoints++;
            if (isContainer(downDiagonalElements)) emptyPoints++;
        }
    }
    // console.log('emptyPoints', emptyPoints, elementNum)
    console.log('是否为白屏：', emptyPoints === elementNum)
}

function isContainer(dom){
    elementNum++
    console.log('isContainer',dom, dom.tagName)
    const containerTag = ['HTML', 'BODY']
    return containerTag.includes(dom.tagName)
}

function render(){
    const text = document.createElement('p')
    text.textContent = 'hello'
    text.id = 'text'
    const button = document.createElement('button')
    button.textContent = 'change text'
    button.id = 'btn'
    console.log('dom', text, button)
    document.body.appendChild(text)
    document.body.appendChild(button)
}

// 定义工具函数
const int = v => parseFloat(v);
const countRows = (h, l) => Math.round(h / l);
const binarySearch = (text, cb) => {
    let min = 0, max = text.length - 1;
    while(min <= max) {
        const mid = parseInt((max + min) / 2);
        const result = cb(mid);
        max = result > 0 ? mid - 1 : max;
        min = result < 0 ? mid + 1 : min;
        if (result === 0) return mid;
    }
};
// 具体实现
class MultiClamp {
    constructor(element, config = (params || {})) {
        // 设置默认配置，并将用户配置添加到this
        Object.assign(this, {
            rows: 2,
            ellipsis: '...',
            expandText: '展开',
            closeText: '收起',
        }, config);

        this.ele = element;
        this.text = element.innerText;
        this.singleLineHeight = this.eleLineHeight();

        // 判断文本行数是否需要显示省略号，不需要直接返回
        const initRows = countRows(this.contentHeight(), this.singleLineHeight);
        if (initRows <= this.rows) return;

        // 如需要展开/收起功能，创建对应标签
        if (this.expandable) this.expandableDom = this.createExpandableDom();
        if (this.closeable) this.closeableDom = this.createCloseableDom();

        // 文本溢出隐藏
        this.clamp();
    }
    // 创建展开功能标签
    createExpandableDom = () => {
        const expendDom = document.createElement('span');
        expendDom.innerHTML = this.expandText;
        expendDom.className = 'expand';
        expendDom.onclick = () => {
            this.ele.innerHTML = this.text;
            if (this.closeableDom) this.ele.appendChild(this.closeableDom);
        };
        return expendDom;   
    }
    // 创建收起功能标签
    createCloseableDom = () => {
        const closeDom = document.createElement('span');
        closeDom.innerHTML = this.closeText;
        closeDom.className = 'close';
        closeDom.onclick = () => { this.clamp(); };
        return closeDom;        
    }
    // 填充容器文本
    fillText(text, addExp) {
        this.ele.innerHTML = text;
        if (addExp) this.ele.appendChild(this.expandableDom);
    }
    // 获取文本行数
    textRows = text => {
        this.fillText(text, this.expandable);
        return countRows(this.contentHeight(), this.singleLineHeight);
    }
    // 根据位置截取文本
    sliceText = pos => `${this.text.slice(0, pos)}${this.ellipsis}`
    // 获取元素计算属性
    getStyle = attr => (
        window.getComputedStyle ? 
            window.getComputedStyle(this.ele, null)[attr] : 
            this.ele.currentStyle[attr]
    )
    // 获取容器高度
    contentHeight() {
        const height = this.ele.offsetHeight;
        const attrs = ['borderTop', 'borderBottom', 'paddingTop', 'paddingBottom'];
        return height - attrs.reduce((total, cur) => (total + int(this.getStyle(cur))), 0);
    }
    // 获取每行文本高度
    eleLineHeight() {
        let lineHeight = int(this.getStyle('lineHeight'));
        if (isNaN(lineHeight)) {
            this.fillText('test');
            lineHeight = this.contentHeight(this.ele);
            this.fillText(this.text);
        }
        return lineHeight;
    }
    // 文本溢出隐藏
    clamp() {
        const { text, rows, sliceText, textRows } = this;
        // 用二分法查找当行数为rows的时候切割点位置在哪
        const pos = binarySearch(text, cur => {
            const curRows = textRows(sliceText(cur));
            if (curRows !== rows) return curRows - rows;
            // 当满足curRows===rows时，进一步确定切割点，需要满足当前点cur下一个位置应该比当前行curRows多1
            return textRows(sliceText(cur + 1)) - rows - 1; 
        });
        this.fillText(sliceText(pos), this.expandable);
    }         
}

(function(win){
    win.MultiClamp = MultiClamp
})(window)

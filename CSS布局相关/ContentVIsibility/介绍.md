## content-visibility: visible/hidden/auto
css3新出的一个api用于控制元素是否渲染其内容

### content-visibility: hidden vs display: none
设置了content-visibility: hidden的元素的内容不会被渲染，但其自身会存在于DOM中；而display: none下元素和其内容都不会出现在DOM中

### content-visibility: hidden vs visibility: hidden
设置了后者的元素及其子元素都会被渲染到DOM中，只是不展示而已，且会撑开高度；而前者高度是0

### content-visibility: auto
其实就是相当于css3提供了api可以自动实现虚拟列表，可视区域内的元素会被渲染，区域外的不会渲染其内容。

### 滚动抖动问题
对于区域外的元素高度是0，所以滚动到视窗内的时候高度会发生变化，所以会有一定的视觉抖动
使用contain-intrinsic-size属性设置宽高

### 思考
1. 使用之后占用内存是否减少？没有
2. 若元素内容隐藏，元素内的脚本是否能正常加载？能，不影响脚本加载和执行，仅仅不渲染内容而已
3. 可访问性？在视窗外的元素虽然没有渲染，但其仍然在文档模型树中存在

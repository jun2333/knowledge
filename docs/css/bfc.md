## BFC 块级格式化上下文原理，渲染规则：

1. 内部的 Box 会在垂直方向一个个排列
2. 垂直方向上的距离由 margin 决定。（完整的说法是：属于同一个 BFC 的两个相邻 Box 的 margin 会发生重叠（塌陷），与方向无关。margin 水平方向不会发生重叠）
3. 每个元素的左外边距与包含块的左边界相接触（从左向右），即使浮动元素也是如此。（这说明 BFC 中子元素不会超出他的包含块，而 position 为 absolute 的元素可以超出他的包含块边界）
4. BFC 的区域不会与 float 的元素区域重叠
5. 计算 BFC 的高度时，浮动子元素也参与计算
6. BFC 就是页面上的一个隔离的独立容器，容器里面的子元素不会影响到外面元素，反之亦然


## 产生条件
以下条件会创建新的 BFC：

1. 根元素
2. float 属性不为 none(脱离文档流，浮动元素)
3. position 属性为 absolute 或 fixed (绝对与固定定位)
4. display 属性为 inline-block、table-cell、table-caption、flex、inline-flex、grid、inline-grid、flow-root(最佳，无副作用)，定义成块级的非块级元素。
5. overflow 属性不为 visible（- overflow: auto/ hidden)，非溢出的可见元素。

## 应用
1. 自适应两栏布局
2. 解决margin合并问题
3. 清除内部浮动
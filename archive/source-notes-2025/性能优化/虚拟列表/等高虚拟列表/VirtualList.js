const VirtualList = (Component) => ({
    list,
    onRequest,
    onRefresh,
    itemHeight,
    containerHeight,
    bufferCount,
    offset,
    bottomThreshold = 100, // 默认底部阈值
    topThreshold = 50, // 默认顶部阈值
    ...props
}) => {
    // 状态变量，用于存储当前视口内第一个和最后一个可见的列表项的索引
    const [startIndex, setStartIndex] = useState(0);
    const [endIndex, setEndIndex] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0); // 当前的偏移量

    // 引用列表容器
    const containerRef = useRef(null);

    // 计算当前视口内可见的列表项索引
    const calculateIndices = useCallback(() => {
        if (!containerRef.current) return; // 如果容器未挂载，直接返回

        const scrollTop = containerRef.current.scrollTop; // 获取当前滚动位置
        const visibleStartIndex = Math.floor((scrollTop - offset) / itemHeight); // 计算第一个可见项的索引，考虑偏移量
        const visibleEndIndex = visibleStartIndex + Math.ceil(containerHeight / itemHeight) + bufferCount; // 计算最后一个可见项的索引，加上缓冲数量

        setStartIndex(visibleStartIndex); // 更新第一个可见项的索引
        setEndIndex(visibleEndIndex); // 更新最后一个可见项的索引
        setCurrentOffset(scrollTop - (scrollTop % itemHeight)); // 更新当前的偏移量
    }, [itemHeight, containerHeight, bufferCount, offset]);

    // 监听滚动事件，当滚动时重新计算可见项索引
    useEffect(() => {
        const handleScroll = () => {
            requestAnimationFrame(calculateIndices); // 使用 requestAnimationFrame 在渲染前计算

            // 检测是否滚动到底部
            if (containerRef.current.scrollTop + containerRef.current.clientHeight >= 
                containerRef.current.scrollHeight - bottomThreshold) {
                onRequest?.(); // 加载更多数据
            }

            // 检测是否滚动到顶部
            if (containerRef.current.scrollTop <= topThreshold) {
                onRefresh?.(); // 刷新数据
            }
        };

        containerRef.current?.addEventListener('scroll', handleScroll); // 添加滚动事件监听器
        return () => {
            containerRef.current?.removeEventListener('scroll', handleScroll); // 清除滚动事件监听器
        };
    }, [calculateIndices, onRequest, onRefresh, bottomThreshold, topThreshold]);

    // 初始渲染时计算可见项索引
    useEffect(() => {
        calculateIndices();
    }, [list, itemHeight, containerHeight, bufferCount, offset, calculateIndices]);

    // 渲染虚拟列表
    return (
        <div className="virtual-list-container" ref={containerRef} style={{ height: containerHeight, overflowY: 'auto' }}>
            {/* 占位，列表的总高度，用于生成滚动条 */}
            <div style={{ height: list.length * itemHeight }}>
                {/* 渲染区域 */}
                <div style={{ transform: `translate3d(0, ${currentOffset}px, 0)`, position: 'relative' }}>
                    {list.slice(startIndex, endIndex).map((item) => (
                        <div key={item} className="list-item" style={{ height: itemHeight }}>
                            {/* 子组件 */}
                            <Component id={item} {...props} />
                        </div>
                    ))}
                </div>
            </div>
            {list.length > 0 && <div className="loading-indicator">加载更多...</div>}
        </div>
    );
};

export default React.memo(VirtualList);



// startIndex 和 endIndex：这两个状态变量分别表示当前视口内第一个和最后一个可见的列表项的索引。
// containerRef：用于引用列表容器，以便获取其滚动位置及监听容器的滚动事件。
// calculateIndices：计算当前视口内可见的列表项第一个可见元素和最后一个可见元素的索引。使用 Math.ceil(containerHeight / itemHeight) + 1，加 1 是为了提供一些缓冲区，防止滚动时出现空白。
// loadMore: 无限滚动加载更多。
// containerRef.current.scrollTop: 容器当前的滚动距离，即从顶部到当前滚动位置的距离
// containerRef.current.clientHeight: 容器的可视区域高度，即用户当前能看到的部分的高度
// containerRef.current.scrollHeight: 容器的总高度，包括了所有内容的高度，即使这些内容超出了可视区域
// containerRef.current.scrollTop + containerRef.current.clientHeight：用户当前滚动到的位置加上可视区域的高度，即用户当前能看到的最底部的位置。
// containerRef.current.scrollHeight - 100: 容器的总高度减去一个阈值（这里是100像素）。这个阈值是为了提前加载更多数据，避免用户滚动到底部时出现空白或延迟。
// 定高虚拟滚动列表的核心实现思路：
// 通过只渲染当前视口内可见的列表项来减少 DOM 节点的数量，提高性能。首先，确定每个列表项的高度是固定的，
// 这样可以准确计算每个列表项的位置和大小。接着，通过监听滚动事件，计算当前视口内第一个和最后一个可见的列表项的索引，并动态渲染这些可见项，
// 使用 CSS 的 transform: translate3d 属性来移动列表项，利用硬件加速提高滚动性能。同时，通过设置缓冲区，提前加载即将进入视口的列表项，
// 避免滚动时出现空白区域。此外，处理滚动到底部和顶部时，分别触发加载更多数据和刷新数据的回调函数，实现无限加载和刷新功能。
// 这种机制能够高效地处理大量数据，提供流畅的滚动体验，同时保持较低的内存和 CPU 占用。


// 总结：
// 1. dom结构上需要三层，外层是定高的容器，然后是高度为list.length*itemHeight的滚动容器，最后是渲染区域(渲染区域需要随着滚动进行向下偏移,保证其一直出现在视窗内)
// 2. 监听容器滚动事件，回调函数需要做：
// 根据容器scrollTop和定高itemHeight计算出startIndex,endIndex以及渲染区域偏移量；计算完之后需要根据startIndex,endIndex截取数据即可，渲染区偏移量用于css动画控制下移
// 根据scrollTop判断是否需要下拉翻页以及上拉刷新
const VirtualList = ({ items, estimatedHeight, containerHeight, onLoadMore, onRefresh }) => {
    // 状态变量，用于存储当前视口内第一个和最后一个可见的列表项的索引
    const [startIndex, setStartIndex] = useState(0);
    const [endIndex, setEndIndex] = useState(0);
    const [listHeight, setListHeight] = useState(0); // 列表的总高度
    const [positions, setPositions] = useState([]); // 每个列表项的位置信息

    // 引用列表容器和列表内容
    const containerRef = useRef(null);
    const listRef = useRef(null);

    // 计算当前视口内可见的列表项索引
    const calculateIndices = useCallback(() => {
        if (!containerRef.current) return; // 如果容器未挂载，直接返回

        const scrollTop = containerRef.current.scrollTop; // 获取当前滚动位置
        const visibleStartIndex = binarySearch(positions, scrollTop); // 计算第一个可见项的索引
        const visibleEndIndex = visibleStartIndex + Math.ceil(containerHeight / estimatedHeight) + 1; // 计算最后一个可见项的索引，加上缓冲数量

        setStartIndex(visibleStartIndex); // 更新第一个可见项的索引
        setEndIndex(Math.min(items.length, visibleEndIndex)); // 更新最后一个可见项的索引
    }, [containerHeight, estimatedHeight, items, positions]);

    // 处理滚动事件
    const handleScroll = useCallback(() => {
        requestAnimationFrame(() => { // 使用 requestAnimationFrame 确保滚动事件处理在下一帧执行
            calculateIndices(); // 重新计算可见项索引

            const { scrollTop, clientHeight, scrollHeight } = containerRef.current; // 获取容器的滚动位置和尺寸
            const bottom = scrollHeight - clientHeight - scrollTop; // 计算距离底部的距离

            if (bottom <= 20) {
                onLoadMore?.(); // 滚动到底部时，加载更多数据
            }

            if (scrollTop <= 50) {
                onRefresh?.(); // 滚动到顶部时，刷新数据
            }
        });
    }, [calculateIndices, onLoadMore, onRefresh]);

    // 监听滚动事件
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.addEventListener('scroll', handleScroll); // 添加滚动事件监听器
            return () => {
                containerRef.current.removeEventListener('scroll', handleScroll); // 清除滚动事件监听器
            };
        }
    }, [handleScroll]);

    // 初始化位置信息
    useEffect(() => {
        if (items.length) {
            initPositions(); // 初始化每个列表项的位置信息
        }
    }, [items]);

    // 更新位置信息
    useEffect(() => {
        if (listRef.current) {
            updatePositions(); // 更新每个列表项的真实高度和位置
        }
    }, [startIndex, items]);

    // 初始化每个列表项的位置信息
    const initPositions = () => {
        const newPositions = items.map((item, index) => ({
            index: item.id,
            height: estimatedHeight, // 预估高度
            top: index * estimatedHeight, // 顶部位置
            bottom: (index + 1) * estimatedHeight, // 底部位置
            dHeight: 0, // 高度差
        }));
        setPositions(newPositions); // 更新位置信息
        setListHeight(newPositions[newPositions.length - 1].bottom); // 更新列表的总高度
    };

    // 更新每个列表项的真实高度和位置
    const updatePositions = () => {
        const nodes = listRef.current.children; // 获取所有渲染的列表项
        if (!nodes || !nodes.length) return; // 如果没有渲染的列表项，直接返回

        const newPositions = positions.map((pos) => ({ ...pos })); // 深拷贝位置信息

        // 根据真实dom高度，更新position对应信息
        for (let i = 0; i < nodes.length; i++) { 
            const node = nodes[i];
            const rect = node.getBoundingClientRect(); // 获取列表项的实际位置和尺寸
            const item = newPositions[+node.id]; // 获取对应的位置信息
            const dHeight = item.height - rect.height; // 计算高度差(预测高度-真实高度)

            if (dHeight) {
                item.height = rect.height; // 更新高度
                item.bottom = item.bottom - dHeight; // 更新底部位置
                item.dHeight = dHeight; // 更新高度差
            }
        }

        const startId = +nodes[0].id; // 获取第一个可见项的ID
        const len = newPositions.length; // 总列表项数量
        let startHeight = newPositions[startId].dHeight; // 第一个可见项的高度差
        newPositions[startId].dHeight = 0; // 重置高度差

        // 从渲染的第2个node开始遍历更新position所有项
        // 借助前面node的高度差总和(采取高度差累加)更新当前项的位置的top和bottom，并重置高度差(抹平上一个位置的高度差对当前位置bottom的影响)
        for (let i = startId + 1; i < len; i++) { 
            const item = newPositions[i];
            item.top = newPositions[i - 1].bottom; // 更新顶部位置
            item.bottom = item.bottom - startHeight; // 更新底部位置

            if (item.dHeight !== 0) {
                startHeight += item.dHeight; // 累加高度差(用于抹平当前位置对下一个位置的影响)
                item.dHeight = 0; // 重置高度差
            }
        }

        setPositions(newPositions); // 更新位置信息
        setListHeight(newPositions[len - 1].bottom); // 更新列表的总高度
    };

    // 二分查找算法，用于计算当前滚动位置下的第一个可见项索引
    // 如果找到了就用找到的索引 + 1 作为 startIndex，因为找到的 item 是它的 bottom 与 scrollTop 相等，即该 item 已经滚出去了
    // 但也可能存在找不到的情况，说明 startIndex 的 item 滚出去了一部分，这时候我们应该取到的是其 right 的索引位置作为 startIndex
    const binarySearch = (list, value) => {
        let left = 0;
        let right = list.length - 1;
        let templateIndex = -1; // 当找不到确切值的时候就用这个

        while (left < right) {
            const midIndex = Math.floor((left + right) / 2);
            const midValue = list[midIndex].bottom;

            if (midValue === value) return midIndex + 1;
            else if (midValue < value) left = midIndex + 1;
            else if (midValue > value) {
                if (templateIndex === -1 || templateIndex > midIndex) templateIndex = midIndex;
                right = midIndex;
            }
        }

        return templateIndex;
    };

    // 渲染虚拟列表
    return (
        <div className="virtual-list-container" ref={containerRef} style={{ height: containerHeight, overflowY: 'auto' }}>
            <div className="virtual-list" ref={listRef} style={{ height: listHeight }}>
                {/* 渲染区域 */}
                <div style={{ transform: `translate3d(0, ${positions[startIndex]?.top}px, 0)`, position: 'relative' }}>
                    {items.slice(startIndex, endIndex).map((item) => (
                        <div key={item.id} id={item.id} className="list-item" style={{ height: positions[item.id]?.height }}>
                            {item.content}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(VirtualList);

// 1. 预测每个元素的高度。
// 定高的虚拟列表实现要求用户传入固定的 item 高度，而现在我们不需要传入固定值，只需传入预测的 item 高度，而这里的高度值是有一定要求的：
// 需要保证预测的 item 高度尽量比真实的每一项 item 的高度要小或者接近所有 item 高度的平均值。
// 我们内部需要根据预测的 item 高度来计算整个虚拟列表的最大容量，假设如果你的预测 item 高度过大，就会出现真实 item 渲染到视图上时出现留白的情况。
// 而如果预测高度比真实 item 高度都要小，那就能保证预测计算出的最大容量一定会大于真实 item 渲染视图列表的最大容量，这样就不会出现留白的情况。
// 当然也不能过小，具体需要看真实 items 的高度情况，如果出现最小 item 和 最大 item 相差较大那也会造成最大容纳量设置过大的问题。
// 恰当的设置是所有 item 高度的平均值，这样计算更符合真实渲染，如果无法拿捏就设置一个最小值。
// 2. 存储元素位置信息。
// 如何计算出列表的高度和滚动偏移量？考虑之前定高的实现我们可以直接用 数据源长度 * 元素高度，
// 但现在元素高度不固定，那肯定就需要我们手动获取 DOM 信息再计算，我们可以直接通过 list DOM 来获取高度，
// 但是偏移量怎么办？滚动时的偏移量根据每滚动出去一项然后进行计算的，如果单单只获取 list 高度好像并不能解决这个问题 
// 因此将引入一个新的变量：positions，它用来存储每个元素的信息


// 总结：
// 预测高度由用户自己传(小于真实高度尽可能接近真实高度),理解position数组的维护和计算
// 根据渲染完之后的真实高度修正position信息
// 根据scrollTop计算出startIndex(用二分法查找position中的bottom)


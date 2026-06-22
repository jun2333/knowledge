import React, { useEffect, useMemo, useRef, useState } from 'react';

const FsVirtualWaterfall = (props) => {
    const containerRef = useRef(null); // 容器引用

    // 管理数据加载的状态
    const [dataState, setDataState] = useState({
        loading: false, // 是否正在加载
        isFinish: false, // 是否已加载完所有数据
        currentPage: 1, // 当前页码
        list: [] // 项目列表
    });

    // 管理滚动状态
    const [scrollState, setScrollState] = useState({
        viewWidth: 0, // 视口宽度
        viewHeight: 0, // 视口高度
        start: 0 // 滚动起始位置
    });

    // 管理列队列的状态
    const [queueState, setQueueState] = useState({
        queue: new Array(props.column).fill(0).map(() => ({ list: [], height: 0 })),
        len: 0 // 当前项目的总数
    });

    // 管理瀑布流容器的高度
    const [listStyle, setListStyle] = useState({});

    // 计算每个项目的尺寸信息
    const itemSizeInfo = useMemo(() => {
        return dataState.list.reduce((pre, current) => {
            const itemWidth = Math.floor((scrollState.viewWidth - (props.column - 1) * props.gap) / props.column);
            pre.set(current.id, {
                width: itemWidth,
                height: Math.floor((itemWidth * current.height) / current.width)
            });
            return pre;
        }, new Map());
    }, [dataState.list, scrollState.viewWidth, props.column, props.gap]);

    // 当项目尺寸信息更新时，将项目添加到队列中
    useEffect(() => {
        if (itemSizeInfo.size) {
            addInQueue();
        }
    }, [itemSizeInfo]);

    // 计算滚动结束位置
    const end = useMemo(() => scrollState.viewHeight + scrollState.start, [scrollState]);

    // 将所有列的项目合并成一个数组
    const cardList = useMemo(
        () => queueState.queue.reduce((pre, { list }) => pre.concat(list), []),
        [queueState]
    );

    // 过滤出当前视口内的项目
    const renderList = useMemo(
        () => cardList.filter((i) => i.h + i.y > scrollState.start && i.y < end),
        [cardList, end, scrollState.start]
    );

    // 动态规划算法，计算每个项目的最佳放置位置
    const dynamicProgramming = (items, columns) => {
        const dp = Array.from({ length: items.length + 1 }, () => Array(columns).fill(0)); // 动态规划表
        const path = Array.from({ length: items.length + 1 }, () => Array(columns).fill(0)); // 回溯路径

        for (let i = 1; i <= items.length; i++) { // 这里<=items.length 说明最后多出一个节点
            const item = items[i - 1];
            const rect = itemSizeInfo.get(item.id); // 拿到前一个的尺寸
            const height = rect.height;

            for (let j = 0; j < columns; j++) {
                let minHeight = Infinity;
                let bestColumn = -1;

                for (let k = 0; k < columns; k++) { // 从第i-1个元素的dp取最小高度的列数并更新最小高度
                    const newHeight = dp[i - 1][k] + (k === j ? height : 0); // 同列的话+height 否则计为+0
                    if (newHeight < minHeight) {
                        minHeight = newHeight;
                        bestColumn = k;
                    }
                }
                // 设置第i个元素在第j列的最小高度和最佳列号
                dp[i][j] = minHeight;
                path[i][j] = bestColumn;
            }
        }

        let result = [];
        let currentColumn = 0;
        for (let i = items.length; i > 0; i--) { // 倒序遍历处理
            const item = items[i - 1];
            const rect = itemSizeInfo.get(item.id);
            const height = rect.height;
            const y = dp[i - 1][currentColumn];
            result.push({
                item,
                y,
                h: height,
                style: {
                    width: `${rect.width}px`,
                    height: `${height}px`,
                    transform: `translate3d(${currentColumn === 0 ? 0 : (rect.width + props.gap) * currentColumn}px, ${y}px, 0)`
                }
            });
            currentColumn = path[i][currentColumn];
        }

        return result.reverse();
    };

    // 将项目添加到队列中
    const addInQueue = (size = props.pageSize) => {
        const items = dataState.list.slice(queueState.len, queueState.len + size);
        const newItems = dynamicProgramming(items, props.column);
        const newQueue = new Array(props.column).fill(0).map(() => ({ list: [], height: 0 }));

        newItems.forEach(item => {
            const index = Math.floor((item.style.transform.match(/\d+/g) || [0])[0] / (item.style.width + props.gap));
            newQueue[index].list.push(item);
            newQueue[index].height += item.h;
        });

        setQueueState({
            queue: queueState.queue.map((col, index) => ({
                list: [...col.list, ...newQueue[index].list],
                height: col.height + newQueue[index].height
            })),
            len: queueState.len + size
        });

        const maxHeight = Math.max(...queueState.queue.map(col => col.height));
        setListStyle({ height: `${maxHeight}px` });
    };

    // 异步加载数据
    const loadDataList = async () => {
        if (dataState.isFinish) return; // 如果已加载完所有数据，退出
        setDataState({ ...dataState, loading: true }); // 设置加载状态
        const list = await props.request(dataState.currentPage++, props.pageSize); // 请求数据
        if (!list.length) {
            setDataState({ ...dataState, isFinish: true }); // 如果没有更多数据，设置加载完成状态
            return;
        }
        setDataState({ ...dataState, list: [...dataState.list, ...list], loading: false }); // 更新项目列表和加载状态
    };

    // 处理滚动事件
    const handleScroll = rafThrottle(() => {
        const { scrollTop, clientHeight } = containerRef.current; // 获取容器的滚动位置和高度
        setScrollState({ ...scrollState, start: scrollTop }); // 更新滚动状态
        if (scrollTop + clientHeight > queueState.queue.reduce((max, col) => Math.max(max, col.height), 0)) {
            if (!dataState.loading) {
                loadDataList(); // 如果滚动到底部且未加载数据，加载更多数据
            }
        }
    });

    // 初始化滚动状态
    const initScrollState = () => {
        setScrollState({
            viewWidth: containerRef.current.clientWidth,
            viewHeight: containerRef.current.clientHeight,
            start: containerRef.current.scrollTop
        });
    };

    // 初始化组件，设置初始滚动状态并加载数据
    const init = async () => {
        initScrollState();
        await loadDataList();
    };

    // 在组件挂载时初始化
    useEffect(() => {
        init();
    }, []);

    // 渲染组件
    return (
        <div className="w-full h-full overflow-y-scroll overflow-x-hidden" ref={containerRef} onScroll={handleScroll}>
            <div className="relative w-full" style={listStyle}>
                {renderList.map(({ item, style }) => (
                    <div className="absolute top-0 left-0 box-border" key={item.id} style={style}>
                        {props.children(item)} {/* 渲染项目内容 */}
                    </div>
                ))}
            </div>
        </div>
    );
};

// 请求节流函数，使用 requestAnimationFrame 进行节流
const rafThrottle = (fn) => {
    let isPending = false;
    return () => {
        if (!isPending) {
            isPending = true;
            requestAnimationFrame(() => {
                fn();
                isPending = false;
            });
        }
    };
};

export default FsVirtualWaterfall;
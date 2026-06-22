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
      const itemWidth = Math.floor((scrollState.viewWidth - (props.column - 1) * props.gap) / props.column); // 算出每项宽度
      pre.set(current.id, {
        width: itemWidth,
        height: Math.floor((itemWidth * current.height) / current.width) // 等比例缩放
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

  // 计算当前最短列的索引和高度
  const computedHeight = () => {
    let minIndex = 0;
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    queueState.queue.forEach(({ height }, index) => {
      if (height < minHeight) {
        minHeight = height;
        minIndex = index;
      }
      if (height > maxHeight) {
        maxHeight = height;
      }
    });
    setListStyle({ height: `${maxHeight}px` }); // 更新瀑布流容器的高度
    return { minIndex, minHeight };
  };

  // 将项目添加到最短列中
  const addInQueue = (size = props.pageSize) => {
    const queue = queueState.queue;
    let len = queueState.len;
    for (let i = 0; i < size; i++) {
      const minIndex = computedHeight().minIndex; // 获取最短列的索引
      const currentColumn = queue[minIndex]; // 获取最短列
      const before = currentColumn.list[currentColumn.list.length - 1] || null; // 获取最短列的最后一个项目
      const dataItem = dataState.list[len]; // 获取当前项目
      if (!dataItem) break; // 如果没有更多项目，退出循环
      const item = generatorItem(dataItem, before, minIndex); // 生成项目的信息
      currentColumn.list.push(item); // 将项目添加到最短列
      currentColumn.height += item.h; // 更新最短列的高度
      len++;
    }
    setQueueState({ queue: [...queue], len }); // 更新队列状态
  };

  // 生成项目的信息
  const generatorItem = (item, before, index) => {
    const rect = itemSizeInfo.get(item.id); // 获取项目的尺寸信息
    const width = rect.width;
    const height = rect.height;
    let y = 0;
    if (before) y = before.y + before.h + props.gap; // 计算项目的y坐标
    return {
      item,
      y,
      h: height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate3d(${index === 0 ? 0 : (width + props.gap) * index}px, ${y}px, 0)` // 设置项目的绝对定位
      }
    };
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
    if (scrollTop + clientHeight > computedHeight().minHeight) {
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

// 虚拟列表实现：主要通过监听容器滚动，动态更新每个元素的位置
// 每个元素通过transform进行x,y轴的定位，实际上只需要计算出视窗范围内部分进行渲染即可
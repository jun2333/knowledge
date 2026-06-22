import React, { useState, useEffect, useRef } from 'react';

const Waterfall = ({ items, gap }) => {
  const containerRef = useRef(null); // 创建一个引用，用于保存容器元素

  const [columnCount, setColumnCount] = useState(3); // 初始列数
  const [columnHeights, setColumnHeights] = useState(new Array(columnCount).fill(0)); // 每列的高度数组
  const [itemPositions, setItemPositions] = useState([]); // 项目的位置信息

  // 监听容器尺寸变化，更新布局
  useEffect(() => {
    const updateLayout = () => {
      const containerWidth = containerRef.current.offsetWidth; // 获取容器宽度
      const newColumnCount = Math.max(1, Math.floor(containerWidth / 200)); // 计算新的列数，每个项目的最小宽度为200px
      setColumnCount(newColumnCount);

      const columnWidth = (containerWidth - (newColumnCount - 1) * gap) / newColumnCount; // 计算每列的宽度
      const colHeight = [...columnHeights]
      const positions = items.map((item, index) => {
        const columnIndex = getShortestColumnIndex(colHeight); // 获取最短列的索引
        const x = columnIndex * (columnWidth + gap); // 计算项目的 x 坐标
        const y = colHeight[columnIndex]; // 计算项目的 y 坐标

        colHeight[columnIndex] += item.height + gap; // 更新最短列的高度

        return {
          ...item,
          x,
          y,
          width: columnWidth,
        };
      });

      setItemPositions(positions);
      setColumnHeights(colHeight)
    };

    updateLayout();

    const resizeObserver = new ResizeObserver(updateLayout);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [items, gap, columnHeights]);

  // 获取最短列的索引
  const getShortestColumnIndex = (heights) => {
    let minIndex = 0; // 最短列索引
    let minHeight = heights[0]; // 最短列高度

    for (let i = 1; i < heights.length; i++) {
      if (heights[i] < minHeight) {
        minIndex = i;
        minHeight = heights[i];
      }
    }

    return minIndex;
  };

  // 渲染组件
  return (
    <div ref={containerRef} className="waterfall-container">
      {itemPositions.map((item, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            width: item.width,
            height: item.height,
            backgroundColor: 'lightblue',
            border: '1px solid #ccc',
            boxSizing: 'border-box',
          }}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
};

export default Waterfall;


// 总结：监听容器尺寸变化，回调函数进行如下处理
// 1. 限定每项最小宽度，超出部分按缩放处理；通过容器宽度计算列数，再通过 (容器宽度-(列数-1)*gap)/列数 得出每列宽度作为项目的宽度
// 2. 根据每列高度数组得出最短列，通过最短列更新项目的位置信息x,y 再更新最短列数组
// 3. 有了位置信息和长宽，就可以按照绝对定位布局了(长宽最好由后端给)



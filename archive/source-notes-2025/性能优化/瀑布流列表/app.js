// 示例
import React from 'react';
import Waterfall from './Waterfall';
import './Waterfall.css';

// 应用组件
const App = () => {
  const items = [
    { content: 'Item 1', height: 200 },
    { content: 'Item 2', height: 150 },
    { content: 'Item 3', height: 250 },
    { content: 'Item 4', height: 180 },
    { content: 'Item 5', height: 220 },
    { content: 'Item 6', height: 170 },
    { content: 'Item 7', height: 230 },
    { content: 'Item 8', height: 190 },
  ]; // 示例项目列表

  return (
    <div className="App">
      <Waterfall items={items} gap={20} />
    </div>
  );
};

export default App;
// 示例
import React, { useState, useEffect } from 'react';
import VirtualList from './VirtualList';
import './App.css';

const App = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // 加载更多数据
    const onLoadMore = () => {
        if (loading) return;
        setLoading(true);
        setTimeout(() => {
            const newData = Array.from({ length: 20 }).map((_, i) => ({
                id: items.length + i,
                content: `Item ${items.length + i} - ${Math.random().toString(36).substring(7)}`
            }));
            setItems([...items, ...newData]);
            setLoading(false);
        }, 1000);
    };

    // 刷新数据
    const onRefresh = () => {
        if (loading) return;
        setLoading(true);
        setTimeout(() => {
            const newData = Array.from({ length: 20 }).map((_, i) => ({
                id: i,
                content: `Item ${i} - ${Math.random().toString(36).substring(7)}`
            }));
            setItems(newData);
            setLoading(false);
        }, 1000);
    };

    // 初始加载数据
    useEffect(() => {
        onLoadMore();
    }, []);

    return (
        <div className="app-container">
            <h1>Virtual List Example</h1>
            <VirtualList
                items={items}
                estimatedHeight={120}
                containerHeight="500px"
                onLoadMore={onLoadMore}
                onRefresh={onRefresh}
            />
        </div>
    );
};

export default App;
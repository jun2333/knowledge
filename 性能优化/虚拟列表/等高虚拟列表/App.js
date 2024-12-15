// App.js
import React, { useState, useEffect } from 'react';
import VirtualList from './VirtualList';
import ListItem from './ListItem';

const App = () => {
    const [list, setList] = useState(Array.from({ length: 100 }, (_, i) => i));
    const [loading, setLoading] = useState(false);

    const onRequest = () => {
        if (loading) return;
        setLoading(true);
        setTimeout(() => {
            setList((prevList) => [
                ...prevList,
                ...Array.from({ length: 100 }, (_, i) => prevList.length + i),
            ]);
            setLoading(false);
        }, 1000);
    };

    const onRefresh = () => {
        if (loading) return;
        setLoading(true);
        setTimeout(() => {
            setList((prevList) => Array.from({ length: 100 }, (_, i) => i));
            setLoading(false);
        }, 1000);
    };

    return (
        <div>
            <h1>Virtual List Example</h1>
            <VirtualList
                Component={ListItem}
                list={list}
                onRequest={onRequest}
                onRefresh={onRefresh}
                itemHeight={65}
                containerHeight="500px"
                bufferCount={6}
                offset={0}
                bottomThreshold={100}
                topThreshold={50}
            />
        </div>
    );
};

export default App;
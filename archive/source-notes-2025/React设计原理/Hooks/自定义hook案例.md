## useLog
1. log数据存全局
2. 上报函数缓存
3. 绑定/解绑事件在useEffect进行
```javascript
export const LogContext = React.createContext({})

export default function useLog(){
    /* 一些公共参数 */
    const message = React.useContext(LogContext)
    const listenDOM = React.useRef(null)

    /* 分清依赖关系 -> message 改变，   */
    const reportMessage = React.useCallback(function(data,type){
        if(type==='pv'){ // pv 上报
            console.log('组件 pv 上报',message)
        }else if(type === 'click'){  // 点击上报
            console.log('组件 click 上报',message,data)
        }
    },[ message ])

    React.useEffect(()=>{
        const handleClick = function (e){
            reportMessage(e.target,'click')
        }
        if(listenDOM.current){
            listenDOM.current.addEventListener('click',handleClick)
        }

        return function (){
            listenDOM.current && listenDOM.current.removeEventListener('click',handleClick)
        }
    },[ reportMessage  ])

    return [ listenDOM , reportMessage  ]
}
```

## useForceUpdate
内部维护一个state用于更新，返回一个函数更新state
```javascript
function useForceUpdate() {
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => {
    setTick(tick => tick + 1);
  }, []);
  return forceUpdate;
}
```

## useVisible
利用IntersectionObserver实现懒加载图片等功能
```javascript
import { useState, useEffect, useRef } from 'react';

function useVisible(options) {
  const { root = null, rootMargin = '0px', threshold = 0.1 } = options || {};
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      });
    }, { root, rootMargin, threshold });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [root, rootMargin, threshold]);

  return {
    ref,
    isVisible
  };
}
```

## usePrevious
保存上一次的值
```javascript
function usePrevious(value) {
  // 创建一个 ref 对象来保存上一次的值
  const ref = useRef();
  
  // 在 useEffect 中更新 ref 的值
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  // 返回上一次的值
  return ref.current;
}

// 测试用例
import React, { useState } from 'react';
import usePrevious from './usePrevious';

function MyComponent() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Current count: {count}</p>
      <p>Previous count: {prevCount}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

## React-Redux中的Hooks
一个是注入 Store 的 useCreateStore ，另外一个是负责订阅更新的 useConnect
### useCreateStore 
用于产生一个状态 Store ，通过 context 上下文传递 ，为了让每一个自定义 hooks useConnect 都能获取 context 里面的状态属性。
实际上就是用useRef缓存store
```javascript
export const ReduxContext = React.createContext(null)
/* 用于产生 reduxHooks 的 store */
export function useCreateStore(reducer,initState){
   const store = React.useRef(null)
   /* 如果存在——不需要重新实例化 Store */
   if(!store.current){
       store.current  = new ReduxHooksStore(reducer,initState).exportStore()
   }
   return store.current
}
```
ReduxHooksStore的设计：是一个自带状态，内部有发布订阅能力的类
```javascript
import { unstable_batchedUpdates } from 'react-dom'
class ReduxHooksStore {
    constructor(reducer,initState){
       this.name = '__ReduxHooksStore__'
       this.id = 0
       this.reducer = reducer
       this.state = initState
       this.mapConnects = {}
    }
    /* 需要对外传递的接口 */
    exportStore=()=>{
        return {
            dispatch:this.dispatch.bind(this),
            subscribe:this.subscribe.bind(this),
            unSubscribe:this.unSubscribe.bind(this),
            getInitState:this.getInitState.bind(this)
        }
    }
    /* 获取初始化 state */
    getInitState=(mapStoreToState)=>{
        return mapStoreToState(this.state)
    }
    /* 更新需要更新的组件 */
    publicRender=()=>{
        unstable_batchedUpdates(()=>{ /* 批量更新 */
            Object.keys(this.mapConnects).forEach(name=>{
                const { update } = this.mapConnects[name]
                update(this.state)
            })
        })
    }
    /* 更新 state  */
    dispatch=(action)=>{
       this.state = this.reducer(this.state,action)
       // 批量更新
       this.publicRender()
    }
    /* 注册每个 connect  */
    subscribe=(connectCurrent)=>{
        const connectName = this.name + (++this.id)
        this.mapConnects[connectName] =  connectCurrent
        return connectName
    }
    /* 解除绑定 */
    unSubscribe=(connectName)=>{
        delete this.mapConnects[connectName]
    }
}
```
### useConnect 
使用这个自定义 hooks 的组件，可以获取改变状态的 dispatch 方法，还可以订阅 state ，被订阅的 state 发生变化，组件更新。
使用方式:
```javascript
// 订阅 state 中的 number 
const mapStoreToState = (state)=>({ number: state.number  })
const [ state , dispatch ] = useConnect(mapStoreToState)
```
实现:
```javascript
export function useConnect(mapStoreToState=()=>{}){
    /* 获取 Store 内部的重要函数 */
   const contextValue = React.useContext(ReduxContext) // 拿到store实例
   const { getInitState , subscribe ,unSubscribe , dispatch } = contextValue
   /* 用于传递给业务组件的 state  */
   const stateValue = React.useRef(getInitState(mapStoreToState))

   const [ , forceUpdate ] = React.useState() // 用于强行渲染
   /* 产生 */
   const connectValue = React.useMemo(()=>{
       const state =  {
           /* 用于比较一次 dispatch 中，新的 state 和 之前的state 是否发生变化  */
           cacheState: stateValue.current,
           /* 更新函数 */
           update:function (newState) { // 交给发布订阅器去调用，传入新值
               /* 获取订阅的 state */
               const selectState = mapStoreToState(newState)
               /* 浅比较 state 是否发生变化，如果发生变化， */
               const isEqual = shallowEqual(state.cacheState,selectState)
               state.cacheState = selectState
               stateValue.current  = selectState
               if(!isEqual){
                   /* 更新 */
                   forceUpdate({})
               }
           }
       }
       return state
   },[ contextValue ]) // 将 contextValue 作为依赖项。

   React.useEffect(()=>{
       /* 组件挂载——注册 connect */
       const name =  subscribe(connectValue)
       return function (){
            /* 组件卸载 —— 解绑 connect */
           unSubscribe(name)
       }
   },[ connectValue ]) /* 将 connectValue 作为 useEffect 的依赖项 */

   return [ stateValue.current , dispatch ]
}
```
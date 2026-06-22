## Hooks介绍
### useState
状态管理，改变会造成组件更新，适合简单的视图状态存储
### useReducer
用于复杂的状态管理，传入reducer(明确状态改变规则的函数)和初始对象
返回一个对象和dispatch函数
### useEffect
用于异步获取数据、订阅/清除事件或定时器
### useContext
全局状态或者跨级状态传输
### useCallback
缓存函数，用于有一定性能瓶颈的场景，如大量计算或者大量渲染，切记不要滥用，否则反而增加了代码复杂度
### useMemo
缓存值，用于昂贵的计算或者排序，跟如上一样不要滥用
### useRef
引用存储，与useState不同的是，ref的更新不会触发组件更新
用于存储DOM引用，或者一些需要持久缓存的变量
### useImperativeHandle
与forwordRef一起使用，用于定义ref引用的组件可访问的范围
### useTransition
用于标记过渡状态，渲染优先级较低，避免阻塞用户交互
### useDerferredValue
延迟值更新，将这个值的更新延迟到浏览器空闲时进行
### useId
v18新出的，生成全局唯一id标识符；避免id冲突以及服务器渲染一致性保证

## 自定义Hook
至少包含一个内置hook的函数，需要按照hook规范去设计(比如不能用于条件语句中)。入参和返参自行定义，主要用于封装可复用的逻辑
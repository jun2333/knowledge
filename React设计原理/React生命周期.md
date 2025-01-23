## 类组件
### construstor
实例化类组件
### getDerivedStateFromProps/getSnapshotBeforeUpdate/componentWillMount/componentWillReceiveProps/componentWillUpdate/shouldComponentUpdate
以上生命周期除了getSnapshotBeforeUpdate都发生在render阶段, getSnapshotBeforeUpdate发生在commit的beforeMutation阶段
1. getDerivedStateFromProps用于替代componentWhillReceiveProps，所以在存在前者的时候不会执行后者
2. componentWillMount会在getDerivedStateFromProps和getSnapshotBeforeUpdate都不存在的时候执行
3. componentWillUpdate发生在更新阶段且需要更新条件下
4. shouldComponentUpdate用于配置更新策略，返回true代表需要更新
### componentDidMount/componentDidUpdate
都发生在commit的Layout阶段同步执行

## 函数组件
没有特别的生命周期函数，只有三个副作用hook
### useEffect/useInsertionEffect/useLayoutEffect
1. useEffect在commit的beforeMutation阶段异步调度，其回调函数执行时机发生在浏览器渲染完成之后
2. useInsertionEffect会在commit的Mutation阶段同步调用，此时访问不了DOM，专门用于css in js
3. useLayoutEffect会在commit的Layout阶段同步调用，用于浏览器渲染前做一些事情，可以访问DOM
三者发生时机：useInsertionEffect->useLayoutEffect->useEffect

## 生命周期在函数组件中的替代方案
### componentDidMount
useEffect的deps传空数组
### componentDidUpdate
useEffect不传deps
### getDerivedStateFromProps/componentWillReceiveProps
useEffect的deps指定一些props

总结：
以上替代方案只是能达到类似的效果，其本质还是不一样的，毕竟执行时机(哪个阶段)执行方式(同步/异步)都不一样~


import { useEffect } from 'react'
import { rootHistory } from '../component/Router'

/* 监听路由改变 */
function useListen(cb) {
    useEffect(()=>{
        if(!rootHistory) return ()=> {}
        /* 绑定路由事件监听器 */
        const unlisten = rootHistory.listen((location)=>{
             cb && cb(location)
        })
        return function () {
            unlisten && unlisten()
        }
    },[])
}
export default useListen

// 不想订阅 context 变化，而带来的更新作用，
// 另外一点就是这种监听有可能在 Router 包裹的组件层级之外，那么如何达到目的呢？
// 这个时候在 Router 中的 rootHistory 就派上了用场，这个 rootHistory 目的就是为了全局能够便捷的获取 history 对象。
// 接下来具体实现一个监听路由变化的自定义 hooks
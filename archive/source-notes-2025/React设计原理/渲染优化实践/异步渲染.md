## Suspense & React.lazy
### 原理
Suspense是一种异步组件，其原理是在调和过程中捕获到Promise错误就会从发生错误的fiber向上遍历并重置状态(unwind)直至找到最近的Suspense组件
当Promise到resolve状态的时候会触发一次update，组件重新render

React.lazy内部模拟Promise A规范，默认执行init方法，当Promise是pending状态的时候会throw这个Promise实例
```javascript
function lazy(ctor){
    return {
         $$typeof: REACT_LAZY_TYPE,
         _payload:{
            _status: -1,  //初始化状态
            _result: ctor,
         },
         _init:function(payload){
             if(payload._status===-1){ /* 第一次执行会走这里  */
                const ctor = payload._result;
                const thenable = ctor();
                payload._status = Pending;
                payload._result = thenable;
                thenable.then((moduleObject)=>{
                    const defaultExport = moduleObject.default;
                    resolved._status = Resolved; // 1 成功状态
                    resolved._result = defaultExport;/* defaultExport 为我们动态加载的组件本身  */ 
                })
             }
            if(payload._status === Resolved){ // 成功状态
                return payload._result;
            }
            else {  //第一次会抛出Promise异常给Suspense
                throw payload._result; 
            }
         }
    }
}
```

### 应用
Suspense结合React.lazy完成懒加载组件
```javascript
const LazyComponent = React.lazy(() => import('./test.js'))

export default function Index(){
   return <Suspense fallback={<div>loading...</div>} >
       <LazyComponent />
   </Suspense>
}
```
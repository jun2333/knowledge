## State
state 很“玄”，不同的执行环境下，或者不同的 React 模式下，State 更新流程都是不同的。React 是有多种模式的，基本平时用的都是 legacy 模式下的 React，除了 legacy 模式，还有 blocking 模式和 concurrent 模式， blocking 可以视为 concurrent 的优雅降级版本和过渡版本，React 最终目的是以 concurrent 模式作为默认版本，这个模式下会开启一些新功能。对于 concurrent 模式会采用不同的 State 更新逻辑。

### legacy模式
#### setState
工作流程：
1. 生成一个update对象，并赋予优先级expirationTime
2. render阶段调和找到更新的fiber，合并state并触发render方法更新视图
3. commit阶段更新实际的DOM
4. 执行setState的callback

#### 批量更新
合成事件配合“批量更新锁”控制
缺陷：js异步下的setState会逃脱React的管控
因此setState表现可以是异步，也可以是同步；在非异步下的调用会批量处理，表现是异步的；而在Promise/setTimeout等异步api调用下将表现为非批量，即同步
后面React提供了一个批量更新的api解决异步场景下无法批量更新的问题:batchedUpdate

#### flushSync
将更新的优先级提到最高，优先级表现为：
flushSync 中的 setState > 正常执行上下文中 setState > setTimeout ，Promise 中的 setState

#### useState
按传值分两种情况：
1. 非函数:lagacy下与上述批量处理机制一致
2. 函数(reducer):打破批量规则

#### useState与setState区别
1. 在设计上，setState倾向于将新值与旧值合并，useState主张重新赋值
2. 在非pureComponent组件模式下，setState不会对新旧值浅比较，只要调用就会执行更新；而useState会浅比较，无变化则跳过更新
3. setState有专门的回调函数来监听数据变化，而useState只能依赖useEffect监听状态变化，不过实质上setState的回调函数跟useEffect的回调函数执行时机都是在commit的Layout阶段

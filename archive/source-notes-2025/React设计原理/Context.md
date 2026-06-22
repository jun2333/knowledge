## Lagacy API
父子组件都需要声明类的静态属性childContextTypes和contextTypes，父类需要定义getChildContext方法返回context的值
```javascript
class Child extends React.Component {
  render() {
    // 4. 这里使用 this.context.value 获取
    return <p>{this.context.value}</p>
  }
}

// 3. 子组件添加 contextTypes 静态属性
Child.contextTypes = {
  value: PropTypes.string
};

class Parent extends React.Component {

  state = {
    value: 'foo'
  }

  // 1. 当 state 或者 props 改变的时候，getChildContext 函数就会被调用
  getChildContext() {
    return {value: this.state.value}
  }

  render() {
    return (
      <div>
        <Child />
      </div>
    )
  }
}

// 2. 父组件添加 childContextTypes 静态属性
Parent.childContextTypes = {
  value: PropTypes.string
};
```
### Conetxt中断问题
现象：如果组件提供的一个 context 发生了变化，而中间父组件的 shouldComponentUpdate 返回 false，那么使用到该值的后代组件不会进行更新。使用了 context 的组件则完全失控，所以基本上没有办法能够可靠的更新 context。

原因: 旧的context值是存在栈里
通过beginWork过程入栈，completeWork过程出栈取到对应的值
而命中了bailout策略的跳过整棵树的优化时，不会有**入栈、出栈**这种操作，因此context值变化后，子树也不会被更新
**意思就是只要用了旧的Context api,如果context值发生变化，就必然不能命中bailout策略**

解决方案：官方不建议用Lagacy Context API，如果硬要用，遇到Context中断问题可以采取发布订阅的方式解决，当context值变化的时候，通知到未被更新的消费子组件，让其调forceUpdate强行更新

新的context设计:
Provider和Consumer都是一个特殊的fiberNode存在于fiber树中，命中bailout后，如果context值变了，则深度遍历子树找到context consumer，找到之后为其附加renderLanes，然后再lanes冒泡到到root，这样子树的beginWork流程就不会被跳过了

## 新API
基本上围绕着React.createContext生成的Provider/Consumer去使用，另外displayName用于调试
新 API 的好处就在于从 Provider 到其内部 consumer 组件（包括 .contextType 和 useContext）的传播不受制于 shouldComponentUpdate 函数，因此当 consumer 组件在其祖先组件跳过更新的情况下也能更新
```javascript
const ThemeContext = React.createContext(null) // 上下文对象
const ThemeProvider = ThemeContext.Provider  //提供者
const ThemeConsumer = ThemeContext.Consumer // 订阅消费者
```
### Provider提供者
Provider组件传值value，value变化会导致消费value的组件重新渲染
```javascript
const ThemeProvider = ThemeContext.Provider  //提供者
export default function ProviderDemo(){
    const [ contextValue , setContextValue ] = React.useState({  color:'#ccc', background:'pink' })
    return <div>
        <ThemeProvider value={ contextValue } > 
            <Son />
        </ThemeProvider>
    </div>
}
```
### Consumer消费者
1. 类组件
给消费组件添加contextType静态属性值为Context对象，即可从this.context中访问到context value
```javascript
const ThemeContext = React.createContext(null)
// 类组件 - contextType 方式
class ConsumerDemo extends React.Component{
   render(){
       const { color,background } = this.context
       return <div style={{ color,background } } >消费者</div> 
   }
}
ConsumerDemo.contextType = ThemeContext

const Son = ()=> <ConsumerDemo />
```
2. 函数组件
使用useContext传入Context对象即可拿到值
```javascript
const ThemeContext = React.createContext(null)
// 函数组件 - useContext方式
function ConsumerDemo(){
    const  contextValue = React.useContext(ThemeContext) /*  */
    const { color,background } = contextValue
    return <div style={{ color,background } } >消费者</div> 
}
const Son = ()=> <ConsumerDemo />
```
3. 订阅方式
使用Consumer组件传递value值
```javascript
const ThemeConsumer = ThemeContext.Consumer // 订阅消费者

function ConsumerDemo(props){
    const { color,background } = props
    return <div style={{ color,background } } >消费者</div> 
}
const Son = () => (
    <ThemeConsumer>
       { /* 将 context 内容转化成 props  */ }
       { (contextValue)=> <ConsumerDemo  {...contextValue}  /> }
    </ThemeConsumer>
) 
```
### 高阶用法
1. 嵌套Provider： 当出现多个Provider嵌套的时候，分别使用Consumer组件消费各自接收信息
2. 同一Provider逐层传递，下层Provider会覆盖上层的，Consumer只能消费到上层最近的Provider的信息

## 实现原理
Provider:
本质上是一个特殊的React Element对象，所以也会被转换成FiberNode存在于fiber树中，也会参与到调和(即：beginWork阶段)
更新操作：调updateContextProvider
1. pushProvider:将value值更新到context实例的currentValue属性上
2. 判断新旧value相等且不是legacy context就停止更新
3. 否则往下更新继续调和，向下调和过程中找到消费组件(通过对比fiber.dependencies属性是否包含当前context)，对消费组件fiber标记高优渲染
4. 归的过程lane冒泡

Consumer:
无论使用哪种方式消费context，实质上都是调readContext
readContext:
1. 生成一个contextItem加入到fiber.dependencies链表中
2. 返回context.currentValue

## 问题
### context 与 props 和 react-redux 的对比？
context解决了：

1. 解决了 props 需要每一层都手动添加 props 的缺陷。
2. 解决了改变 value ，组件全部重新渲染的缺陷。
react-redux 就是通过 Provider 模式把 redux 中的 store 注入到组件中的

### 如何解决 Context Provider 提供的对象可能引起的重复渲染问题？
解决方案： use-context-selector，它可以让我们从 context value 中选择你会用到的状态，且只有在这些被选择的状态更新时，才会使组件重新渲染。

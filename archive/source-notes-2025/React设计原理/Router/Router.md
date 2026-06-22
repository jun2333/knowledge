## 基本原理
1. history： history 是整个 React-router 的核心，里面包括两种路由模式下改变路由的方法，和监听路由变化方法等。
2. react-router：既然有了 history 路由监听/改变的核心，那么需要调度组件负责派发这些路由的更新，也需要容器组件通过路由更新，来渲染视图。所以说 React-router 在 history 核心基础上，增加了 Router ，Switch ，Route 等组件来处理视图渲染。
3. react-router-dom： 在 react-router 基础上，增加了一些 UI 层面的拓展比如 Link ，NavLink 。以及两种模式的根部路由 BrowserRouter ，HashRouter 
前端路由分两种模式，history和hash
无论是那种模式，基本原理都是利用了二者改变不会触发浏览器刷新的原理做文章。React通过统一history和hash两种模式的行为，将特定模式下的history对象注入到Router组件，由Router组件统一负责管理和传递路由状态，传递通过Context API进行隔代透传，然后通过Switch组件匹配路由决定渲染哪个Route，Route组件是具体渲染的高阶组件;Redirect负责重定向，当匹配不到的时候需要一个默认视图

注意: Switch 包裹的 Redirect 要放在最下面，否则会被 Switch 优先渲染 Redirect ，导致路由页面无法展示

### 如何获取路由信息
1. Props
2. withRouter: 对于距离路由组件比较远的组件可以通过withRouter高阶组件装饰，会注入路由信息
3. useHistory 和 useLocation

### 如何使用路由跳转
1. 声明式：<NavLink to='/home' /> ，利用 react-router-dom 里面的 Link 或者 NavLink
2. 函数式：histor.push('/home')

### 带参数方式
1. url 拼接
```javascript
const name = 'alien'
const mes = 'let us learn React!'
history.push(`/home?name=${name}&mes=${mes}`)
```
2. state 路由状态
```javascript
const name = 'alien'
const mes = 'let us learn React!'
history.push({
    pathname:'/home',
    state:{
        name,
        mes
    }
})

const {state = {}} = this.prop.location
const { name , mes } = state
```

### 动态路由
```javascript
<Route path="/post/:id"  />

history.push('/post/'+id) // id为动态的文章id
```

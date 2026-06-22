## vue-router实现原理

SPA(Single Page Application)单页面程序主要是通过一个页面中更新视图容器来达到目的，前端路由则是SPA的必备技术。

前端路由：

1. 修改url，页面不会重新请求服务器，只是前端控制更新容器视图，不同的url对应不同的视图
2. 目前实现前端路由有三种模式：Hash、History、Abstract

### 路由模式

1. hash：利用浏览器修改url的hash部分内容不会进行请求的特性
2. history：HTML5新增history的pushState、replaceState方法操作history的状态，浏览器也不会进行请求
3. abstract：支持所有JavaScript运行环境，如node.js

### hash模式

通过修改url中#后面内容，浏览器会新增一条历史记录，点击后退按钮浏览器会退到上个记录；监听hash值的变化(即监听hashchange事件)重新渲染容器视图的内容

### history模式

HTML5中history API中提供了对history状态的修改能力，通过pushState方法向history栈中推入一条状态，浏览器不会进行更新。

一般切换url分三种情况

1. 点击routeLink组件切换页面

   router直接封装routeLink点击事件，更新视图并调用pushState修改地址栏的url

2. 修改url切换页面

   服务器统一返回首页，router获取localtion.pathname进行渲染相应视图

3. 浏览器前进后退按钮以及history提供的go()、back()、forward()等方法

   history切换状态会触发popstate事件，router监听popstate事件，更新相应视图

注意：由于修改url地址回车之后浏览器会请求服务器，所以服务器需要将匹配不到的前端路由进行统一处理，返回首页让前端路由进行处理

### abstract

流程和hashHistory一样，通过一个数组模拟浏览器history栈，同时也提供go、back、forward、pushState、replaceState等方法，主要用于非浏览器环境

### hash VS history

1. history没有丑陋的#，看起来更美观
2. history会请求服务器，因此需要服务器特殊处理匹配不到的页面
3. pushState设置与当前url相同的url也会把记录添加到history栈中，而hash必须要发生变化才会添加进去
4. pushState可以设置同源的任何url，而hash只能修改#后面部分内容(即只可以设置当前同文档的url)

### 总结

其实所谓响应式属性，即当_route值改变时，会自动调用Vue实例的render()方法，更新视图。 $router.push()-->HashHistory.push()-->History.transitionTo()-->History.updateRoute()-->{app._route=route}-->vm.render()
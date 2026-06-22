## KeepAlive
其本质是通过移动DOM节点来实现隐藏和激活
deactivated: 将组件移动到隐藏容器
activated: 将组件从隐藏容器中取出来，放到视图相应位置中
因此对于KeepAlive组件卸载和挂载将会执行上面两个函数

### include和exclude
由用户配置的两个属性
include->缓存条件
exclude->不缓存条件

### 缓存策略
缓存是将组件的vnode通过type作为键存在map中
存在缓存则拿出来用，不存在则先缓存
修剪缓存策略：最新一次访问 需要配合用户传的max进行修剪

官方也提议将缓存策略交给用户配置

## Teleport
为了解决DOM层级问题，可让组件任意挂在到任何DOM上
内部其实就是根据用户传的to属性，将组件挂载到to上

## Transition
主要是提升交互体验，通过在挂载组件前后和卸载组件前，修改类名，通过css方式给DOM加上过渡动画
1. 挂载前加入进入动效
2. 卸载前加入移除动效

动画生命周期分为
beforeEnter->enter->leave
挂载前执行beforeEnter钩子，挂载后执行enter钩子，卸载前执行leave钩子
内部通过requestAnimationFrame设置类名(类目也可以让用户自定义)
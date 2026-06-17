## 编译优化
### patchFlag
编译过程中针对节点的动态属性通过patchFlag进行标记
### 收集动态节点
在生成渲染函数的过程中：
针对有patchFlag的节点采取使用_createVNode工具函数输出vnode，_openBlock开启**block(块)**作用域对动态节点进行收集

Block是什么？
它是一个虚拟节点，它具有一个属性dynamicChildren用来存储动态子节点

最终会让整个vnode树中的每个node都有自己的dynamicChildren属性

### 通过动态节点和patchFlag实现靶向更新
在渲染器patch过程中，不用再直接进入传统diff算法了:
优先检测到vnode有dynamicChildren属性，会遍历动态子节点进行patch
然后根据子节点的patchFlag实现靶向更新

### 静态提升
对于一些静态的节点和属性的生成会提升到render函数外，整个生命周期只执行一次

### 预字符串化
合并大量重复的静态节点

### 缓存内联事件回调函数
将内联事件回调函数缓存起来

### 带v-once指令的动态节点缓存，不参与patch
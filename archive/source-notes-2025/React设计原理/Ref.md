## 作用
作为组件的引用，用于直接操作组件，不过需要组件通过声明的方式往外暴露方法
## 基本用法
### 类组件
三种方法注册ref
1. 字符串---通过this.refs访问
2. 函数---函数内将第一个参数赋值给组件实例变量
3. ref对象(React.createRef生成)
### 函数组件
useRef

### 原理
配置了ref属性的组件会在**初次渲染**和**ref的值发生变化**的时候打上Ref tag(**如果ref属性的值是一个函数，那每次渲染都会被打上Ref tag，因为行内函数每次指向内存不一样，除非提取出来**)
而打上Ref tag的组件会在commit阶段进行重置和赋值操作，分别是：
1. Mutation阶段的commitDetachRef
2. Layout阶段的commitAttachRef
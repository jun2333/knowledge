# vue-next生命周期

## 注册compile函数

compile函数主要负责将template内容通过编译生成渲染函数后缓存起来返回渲染函数

## createApp

createApp主要返回一个app对象，app对象包括use、mixin、component、mount、unmount、directive、provide等方法

起初我们会调用mount方法

### mount

mount函数会先生成一个Component类型的vnode，然后内部调用patch处理，patch处理主要通过processComponent函数

### processComponent

根据传入参数判断旧vnode是否为null这个条件分别使用mountComponent和updateComponent处理

### mountComponent

此函数主要做两件事儿，分别是setupComponent和setupRenderEffect

### setupComponent

initProps

initSlots

setupStatefulComponent

### setupStatefulComponent

判断实例选项中是否存在setup方法，分别调用handleSetupResult处理setup函数执行结果和调用finishComponent完成组件初始化

### handleSetupResult

将setup函数执行返回的对象reactive进行响应式处理并挂在实例的setupState属性，然后执行finishComponent函数

### finishComponent

1. 将compile函数传入组件template等相关参数执行，并将执行结果挂在实例的render属性上，此时实例render指向生成的渲染函数

2. applyOptions函数用于support for 2.x options

### applyOptions

此过程会处理mixin、inject、data、computed、watch、provide、methods等options以及beforeCreate、created等hook调用

### setupRenderEffect

调用effect函数传入componentEffect回调函数，将结果赋值给实例的update属性

### effect

此函数会调用回调函数返回一个effect对象，包括回调fn属性，deps属性是一个数组用于存放依赖，过程中进行依赖收集(设置effect对象为activeEffect，当此时读取响应式变量调用track函数进行收集依赖，即将activeEffect存放到响应式变量的depsMap:Map key->Set 属性中)

### componentEffect

调用render渲染函数生成组件子树vnode

beforeMount hook

调用patch函数进行dom处理（若无根节点会以fragment进行处理）

mounted hook

### update

组件级别响应式数据发生变化时，会通知到组件effect

beforeUpdate hook

此时调用componentEffect进行patch

updated hook

### unmout

调用unmountComponent函数

beforeUnmount hook

解除effect、componentEffect依赖引用、patch进行卸载dom

unmounted hook
# vue-next openBlock 那些事

## blockStack

一个数组结构，用于存储block(也是一个数组结构)，整个结构是一个多维数组结构用于描述动态vnode的父子关系

## render function

如下渲染函数进行分析:

```javascript
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_Demo = _resolveComponent("Demo")

  return (_openBlock(), _createBlock(_Fragment, null, [
    _createVNode("div", null, "Hello World!"),
    _createVNode("div", {
      onClick: $event => (_ctx.console.log(123))
    }, _toDisplayString(_ctx.hh), 9 /* TEXT, PROPS */, ["onClick"]),
    _createVNode(_component_Demo)
  ], 64 /* STABLE_FRAGMENT */))
}
```

一个组件被渲染首先会调用openBlock函数，下面介绍openBlock函数作用

## openBlock、closeBlock

```typescript
export openBlock(){
    blockStack.push(currentBlock = disableTracking ? null : [])
}
export closeBlock(){
    blockStack.pop()
    currentBlock = blockStack[blockStack.length-1]
}
```

openBlock函数主要是push一个数组作为currentBlock到blockStack栈中，然后调用createBlock函数

## createBlock

调用createVNode函数生成根节点的vnode对象(若无则生成fragment)，然后将currentBlock赋值给vnode的dynamicChildren属性，并closeBlock，最后会将vnode push到currentBlock中(即与父节点建立关系)

```typescript
export function createBlock(
  type: VNodeTypes | ClassComponent,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[]
): VNode {
  const vnode = createVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    true /* isBlock: prevent a block from tracking itself */
  )
  // save current block children on the block vnode
  vnode.dynamicChildren = currentBlock || (EMPTY_ARR as any)
  // close block
  closeBlock()
  // a block is always going to be patched, so track it as a child of its
  // parent block
  if (shouldTrack > 0 && currentBlock) {
    currentBlock.push(vnode)
  }
  return vnode
}
```

## createVNode

负责生成vnode对象，主要与block有关的部分是根据一些标记判断是否是动态节点，然后push到currentBlock中

```typescript
if (
    shouldTrack > 0 &&
    // avoid a block node from tracking itself
    !isBlockNode &&
    // has current parent block
    currentBlock &&
    // presence of a patch flag indicates this node needs patching on updates.
    // component nodes also should always be patched, because even if the
    // component doesn't need to update, it needs to persist the instance on to
    // the next vnode so that it can be properly unmounted later.
    (patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT) &&
    // the EVENTS flag is only for hydration and if it is the only flag, the
    // vnode should not be considered dynamic due to handler caching.
    patchFlag !== PatchFlags.HYDRATE_EVENTS
  ) {
    currentBlock.push(vnode)
  }
```

## 总结

从如上渲染函数中可以看到，调用顺序是openBlock、createBlock；在createBlock调用之前会解析参数，节点参数会调用createVNode函数，参数解析完毕之后此时currentBlock中已经存储着动态节点的vnode；最后执行createBlock。

整个过程是为了将构造一个dynamicChildren数组用于存储动态节点序列，当diff时可以直接精准patch动态节点；当然v-for指令渲染的子节会完全diff，通过key进行diff，这就是openBlock中存在一个disableTracking变量的目的，当使用v-for时则disableTracking为true
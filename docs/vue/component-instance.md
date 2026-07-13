# Vue3 组件实例

组件实例（ComponentInternalInstance）是 Vue3 组件的核心数据结构，包含组件的所有状态、方法和生命周期信息。

## 实例结构

```typescript
interface ComponentInternalInstance {
  // 唯一标识
  uid: number;

  // 组件类型（选项对象或函数）
  type: Component;

  // 父实例和根实例
  parent: ComponentInternalInstance | null;
  root: ComponentInternalInstance;

  // 当前 vnode 和 subTree
  vnode: VNode;
  subTree: VNode;

  // 更新函数
  update: SchedulerJob;

  // 渲染函数
  render: Function | null;

  // 状态
  props: Data;
  attrs: Data;
  slots: InternalSlots;
  emit: EmitFn;
  emitted: Record<string, boolean> | null;

  // setup 相关
  setupState: Data;
  setupContext: SetupContext | null;

  // data（Options API）
  data: Data;
  ctx: Data;

  // 生命周期钩子
  bc: Function[] | null;  // beforeCreate
  c: Function[] | null;   // created
  bm: Function[] | null;  // beforeMount
  m: Function[] | null;   // mounted
  bu: Function[] | null;  // beforeUpdate
  u: Function[] | null;   // updated
  bum: Function[] | null; // beforeUnmount
  um: Function[] | null;  // unmounted

  // 其他
  isMounted: boolean;
  isUnmounted: boolean;
  isDeactivated: boolean;
}
```

## 状态构成

### 1. props / attrs

```typescript
// props：组件声明的入参，浅响应式化
const props = shallowReactive({
  message: 'hello',
  count: 0,
});

// attrs：未声明的入参，非响应式
const attrs = {
  class: 'container',
  id: 'app',
};
```

- `props` 会被浅响应式化，可通过 `this.$props` 或 `props` 访问
- `attrs` 挂在 `this.$attrs` 上，包含未声明的属性和事件

### 2. data

```typescript
// data 函数返回的对象，深度响应式化
const data = reactive({
  count: 0,
  list: [1, 2, 3],
});
```

### 3. setupState

```typescript
// setup 函数返回的对象，自动脱 ref
const setupState = {
  count: ref(0),      // 访问时自动 .value
  message: 'hello',
};
```

## 渲染上下文（renderContext）

以上状态（除 attrs 外）通过 Proxy 代理，暴露到模板中：

```typescript
const renderContext = new Proxy(instance, {
  get(t: ComponentInternalInstance, k: string) {
    const { data, props, setupState } = t;

    if (k === '$slots') return t.slots;
    if (k === '$attrs') return t.attrs;

    // 优先级：data > props > setupState
    if (data && k in data) {
      return data[k];
    } else if (k in props) {
      return props[k];
    } else if (setupState && k in setupState) {
      const value = setupState[k];
      // 自动脱 ref
      return isRef(value) ? value.value : value;
    }

    return undefined;
  },

  set(t: ComponentInternalInstance, k: string, v: any) {
    const { data, props, setupState } = t;

    if (data && k in data) {
      data[k] = v;
    } else if (k in props) {
      // props 不应被修改
      console.warn(`Attempting to mutate prop "${k}"`);
    } else if (setupState && k in setupState) {
      const ref = setupState[k];
      if (isRef(ref)) {
        ref.value = v;
      } else {
        setupState[k] = v;
      }
    }

    return true;
  },
});
```

## 渲染函数

渲染函数来源（优先级从高到低）：

1. **模板编译结果**：编译器将 template 编译成 render 函数
2. **Options API 的 render 函数**：用户手动编写的 render
3. **setup 函数返回的函数**：Composition API 的 render

```typescript
// 执行渲染函数
const subTree = render.call(renderContext, renderContext);
```

## 副作用调度

渲染函数在 effect 中执行，通过 `queueJob` 控制批量更新：

```typescript
const effect = new ReactiveEffect(
  () => {
    const subTree = render.call(renderContext, renderContext);

    if (!instance.isMounted) {
      // 挂载
      beforeMount?.call(renderContext);
      patch(null, subTree, container, anchor);
      instance.isMounted = true;
      mounted?.call(renderContext);
    } else {
      // 更新
      beforeUpdate?.call(renderContext);
      patch(instance.subTree, subTree, container, anchor);
      updated?.call(renderContext);
    }

    instance.subTree = subTree;
  },
  {
    scheduler: queueJob,  // 调度器
  }
);

// 首次执行
effect.run();
```

### queueJob 实现

```typescript
const queue: SchedulerJob[] = [];
const queueSet = new Set<SchedulerJob>();
let isFlushing = false;
let isFlushPending = false;

const resolvedPromise = Promise.resolve();

export function queueJob(job: SchedulerJob): void {
  if (!queueSet.has(job)) {
    queueSet.add(job);
    queue.push(job);
    queueFlush();
  }
}

function queueFlush(): void {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true;
    resolvedPromise.then(flushJobs);
  }
}

function flushJobs(): void {
  isFlushPending = false;
  isFlushing = true;

  // 按 id 排序（父组件优先）
  queue.sort((a, b) => a.id! - b.id!);

  try {
    for (let i = 0; i < queue.length; i++) {
      queue[i]();
    }
  } finally {
    queue.length = 0;
    queueSet.clear();
    isFlushing = false;
  }
}
```

## 事件函数与 emit

```typescript
// 事件函数无论是否显式声明都放在 props 中
// 如 @click="handler" → props.onClick

// emit 函数从 props 中取出事件函数执行
function emit(instance: ComponentInternalInstance, event: string, ...args: any[]): void {
  const props = instance.props;
  let handlerName = `on${capitalize(event)}`;
  let handler = props[handlerName];

  if (handler) {
    callWithAsyncErrorHandling(handler, instance, ErrorCodes.COMPONENT_EVENT_HANDLER, args);
  }

  // 支持 kebab-case
  handlerName = `on${capitalize(camelize(event))}`;
  handler = props[handlerName];
  if (handler) {
    callWithAsyncErrorHandling(handler, instance, ErrorCodes.COMPONENT_EVENT_HANDLER, args);
  }
}

// emit 添加到 setupContext 中
const setupContext: SetupContext = {
  attrs: instance.attrs,
  slots: instance.slots,
  emit: instance.emit,
  expose: (exposed: Record<string, any>) => {
    instance.exposed = exposed;
  },
};
```

## 插槽实现原理

```vue
<!-- 父组件 -->
<Child>
  <template #header>
    <h1>标题</h1>
  </template>
  <template #default>
    <p>内容</p>
  </template>
</Child>
```

```typescript
// 编译后
createVNode(Child, null, {
  header: () => createVNode('h1', null, '标题'),
  default: () => createVNode('p', null, '内容'),
});

// 子组件接收
const slots = useSlots();
// slots.header() → 返回 header 插槽的 vnode
// slots.default() → 返回默认插槽的 vnode
```

接收插槽的组件会接收到父组件传入的插槽函数，渲染时执行插槽函数返回内容。

## 生命周期注册

```typescript
// 当前组件实例（setup 执行前设置）
let currentInstance: ComponentInternalInstance | null = null;

export function setCurrentInstance(instance: ComponentInternalInstance): void {
  currentInstance = instance;
}

export function onMounted(fn: () => void): void {
  registerHook('m', fn);
}

function registerHook(lifecycleKey: string, fn: () => void): void {
  const instance = currentInstance;
  if (instance) {
    const hooks = instance[lifecycleKey] || (instance[lifecycleKey] = []);
    hooks.push(fn);
  }
}
```

## nextTick 实现

```typescript
const p = Promise.resolve();

export function nextTick(fn?: () => void): Promise<void> {
  return fn ? p.then(fn) : p;
}
```

调用时机：将回调放到微任务队尾，保证回调内拿到最新的 DOM 结果。

## 理解副作用函数

effect 其实就是一个副作用函数：一个函数的执行会直接或者间接对其他函数的执行造成影响，被称之为副作用函数。比如：修改外层变量、修改视图 DOM 信息等。

## 具体实现

### 副作用函数与响应式系统结合

响应系统的作用是监测到数据的变化，然后通知订阅者做一些事情，如：更新视图。而副作用函数 effect 就是干这些事，它可以更新视图也可以用户自定义做一些操作。

理解存储结构：`WeakMap -> Map -> Set`

1. `WeakMap<Object, Map>`：key 为对象，value 是 Map
2. `Map<key, Set>`：key 为对象的 key，value 是 Set 集合
3. `Set`：存储 effect 的一个集合

为啥用 WeakMap 对象？因为 WeakMap 是弱引用，不影响垃圾回收工作，当 target 不被引用的时候将会被回收掉，而 Map 却不会。

如何与响应式系统结合？主要还是在对象拦截器里做工作：
1. **get**：读值的时候**依赖收集**
2. **set**：值发生变化的时候**触发副作用函数**

### 依赖收集（track）

当读到某对象 target 的某个 key 的值的时候，若此时存储 activeEffect，按照上述存储结构存下 target、key、effect 的关系。

### 触发更新（trigger）

当 target 的某个 key 的值更新的时候，查询 `WeakMap.get(target).get(key)` 是否存在依赖，有的话就取出来依次执行一遍即可。

### 遗留的副作用

```typescript
const data = { ok: true, text: 'hello' };
const obj = new Proxy(data, { /* ... */ });

effect(() => {
  document.body.innerText = obj.ok ? obj.text : 'not';
});
```

如上例，当 `obj.ok` 为 true 的时候 effect 会被收集，如果 `obj.ok` 变成 false 的时候则不需要响应式了，这时产生了遗留的副作用。

解法：
1. effect 内置 deps 用于存储 Set
2. 在 effect 的回调函数执行之前清除自身的依赖关系（注意下面无限循环的处理）

```typescript
let activeEffect: EffectFn | null = null;

interface EffectFn {
  (): void;
  deps: Set<EffectFn>[];
  options?: EffectOptions;
}

interface EffectOptions {
  scheduler?: (fn: EffectFn) => void;
}

function effect(fn: () => void, options?: EffectOptions): EffectFn {
  const effectFn: EffectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    fn();
  };
  effectFn.deps = [];
  effectFn.options = options;
  effectFn();
  return effectFn;
}

function cleanup(effectFn: EffectFn): void {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

function trigger(target: object, key: string | symbol): void {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  // effects && effects.forEach(effectFn => effectFn()) // 在遍历中执行 effectFn，删一个再加一个会造成无限循环
  const effectsToRun = new Set(effects); // 复制一份去遍历
  effectsToRun && effectsToRun.forEach(effectFn => effectFn());
}
```

### effect 的嵌套处理

只用 activeEffect 存储当前 effectFn 的话，遇到 effect 嵌套场景则会出现外层的 effect 被内层 effect 覆盖，导致错乱。所以需要用栈结构代替 activeEffect 变量，fn 执行前 effectFn 进栈，执行完毕出栈。

```typescript
let activeEffect: EffectFn | null = null;
const effectStack: EffectFn[] = [];

function effect(fn: () => void, options?: EffectOptions): EffectFn {
  const effectFn: EffectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  effectFn.deps = [];
  effectFn.options = options;
  effectFn();
  return effectFn;
}
```

### effect 内同时存在读取和赋值逻辑，导致无限循环

在执行前判断当前 effectFn 是否和 activeEffect 是同一个，非同一个才执行。

```typescript
effectsToRun && effectsToRun.forEach(effectFn => {
  if (activeEffect === effectFn) return;
  effectFn();
});
```

### 总结

effect 可传入一个回调函数 fn，fn 会立即执行一次，fn 执行过程中读取了被 proxy 代理过的对象的属性时，会进行依赖收集 track（按照 WeakMap-Map-Set 存储在一个桶 bucket），当对象属性的值发生变化的时候会从 bucket 中取到对应的 effects 遍历执行，这叫 trigger。

## 调度执行

默认情况下依赖数据发生变化时，会从 bucket 中取到 effects 遍历执行，当传入选项 scheduler 的时候，则将执行权交给了用户。调用 effect 的时候第二个入参作为 options 挂在 effectFn.options 上。

```typescript
effectsToRun && effectsToRun.forEach(effectFn => {
  if (activeEffect === effectFn) return;
  if (effectFn.options?.scheduler) {
    effectFn.options.scheduler(effectFn);
  } else {
    effectFn();
  }
});
```

利用上述能力，我们可以轻易实现状态批量更新（只关注状态起始态，不关注中间过渡态）：

```typescript
const jobQueue = new Set<EffectFn>();
const p = Promise.resolve();
let isFlushing = false;

function flushJob(): void {
  if (isFlushing) return;
  isFlushing = true;
  p.then(() => {
    jobQueue.forEach(fn => fn());
  }).finally(() => {
    isFlushing = false;
  });
}

effect(() => {
  console.log(obj.foo);
}, {
  scheduler(fn) {
    jobQueue.add(fn);
    flushJob();
  }
});

obj.foo++;
obj.foo++;
```

effect 的回调函数只会执行 2 次，第一次是初次执行，当通过两次 `obj.foo++` 触发数据变化的时候会有两个 fn 被 add 到 jobQueue 中。由于 jobQueue 是 Set 结构（自带去重），因此第二次会覆盖第一次变化，并且 flushJob 被 isFlushing 控制下只会执行一次。

## Vue 3.3+ 新特性

### effectScope

`effectScope` 允许创建一个效应作用域，可以捕获其中所有创建的 effect（包括 computed、watch 等），并在不需要时一次性停止所有效应。

```typescript
// 创建一个 effect scope
const scope = effectScope();

scope.run(() => {
  const doubled = computed(() => counter.value * 2);

  watch(doubled, () => console.log(doubled.value));

  effect(() => console.log('count: ', counter.value));
});

// 停止该 scope 内的所有 effect
scope.stop();
```

**使用场景**：
- 组件卸载时一次性清理所有响应式副作用
- 自定义 Hook 中管理多个 effect 的生命周期

### stop

`stop` 用于手动停止一个 effect，使其不再响应数据变化：

```typescript
const counter = reactive({ count: 0 });

const runner = effect(() => {
  console.log(counter.count);
});

counter.count++; // 会触发 effect

stop(runner); // 停止 effect

counter.count++; // 不会触发 effect
```

### Vue 3.3 响应式优化

Vue 3.3 对响应式系统做了以下优化：

1. **更好的 TypeScript 支持**：改进了 Ref 和 ComputedRef 的类型推导
2. **性能优化**：减少了依赖收集时的内存占用
3. **更清晰的错误提示**：当在 effect 外部访问响应式数据时给出更友好的提示

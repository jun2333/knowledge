## computed 原理解析

### computed 的用法和作用

1. 传入一个回调函数，函数内用到了一些响应数据，最终返回一个值
2. computed 返回的值会随着内部响应数据的变化重新计算，无变化则返回缓存的值

### 实现：computed = effect + lazy

1. 懒执行（首次不执行 fn，当读取 computed 的值的时候执行 fn）
2. 内部用 get 代理执行 fn 并返回值
3. 配合 scheduler 实现缓存

修改 effect：

```typescript
function effect(fn: () => any, options?: EffectOptions): EffectFn {
  const effectFn: EffectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    const res = fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  };
  effectFn.options = options;
  effectFn.deps = [];
  if (!options?.lazy) { // 懒执行
    effectFn();
  }
  return effectFn;
}

function computed<T>(getter: () => T): ComputedRef<T> {
  let dirty = true; // 是否脏（初始为 true，首次读取时执行）
  let value: T; // 缓存值

  const fn = effect(getter, {
    lazy: true,
    scheduler() { // getter 设置调度执行
      dirty = true;
    }
  });

  const obj = {
    get value(): T {
      if (dirty) {
        value = fn();
        dirty = false;
      }
      return value;
    }
  };

  return obj as ComputedRef<T>;
}
```

上面程序还存在一个问题：当计算属性被用在 effect 中的时候，计算属性的值的变化并不能触发 effect 重新执行。`obj.foo++` 会触发 sum 的更新，但是 sum 本身不是响应式的数据：

```typescript
const sum = computed(() => {
  return obj.foo + obj.bar;
});

effect(() => {
  console.log(sum.value);
});

obj.foo++;
```

那就只能手动 track 和 trigger 了：

```typescript
function computed<T>(getter: () => T): ComputedRef<T> {
  let dirty = true; // 是否脏
  let value: T; // 缓存值

  const fn = effect(getter, {
    lazy: true,
    scheduler() { // getter 设置调度执行
      dirty = true;
      trigger(obj, 'value');
    }
  });

  const obj = {
    get value(): T {
      if (dirty) {
        value = fn();
        dirty = false;
      }
      track(obj, 'value');
      return value;
    }
  };

  return obj as ComputedRef<T>;
}
```

### 总结

computed 实质上内部包含一个 lazy effect，lazy effect 不会立即执行 effectFn，而是将其返回。此外也给 effect 配置了 scheduler，用于修改 dirty 以及调 trigger 函数。computed 返回一个对象，对 value 属性进行 get 拦截，get 中做了以下事情：

1. 利用 dirty 变量控制缓存，当 scheduler 执行之后将 dirty 设置为 true，只有 dirty 为 true 的时候才执行 effectFn
2. 手动调 track 实现对 value 的响应式建立

## watch 原理解析

### 本质上就是一个 effect 配置了 scheduler

```typescript
function watch(source: any, cb: (newVal: any, oldVal: any) => void): void {
  let getter: () => any;
  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  effect(() => getter(), {
    scheduler() {
      cb();
    }
  });
}

// 递归读一遍所有值
function traverse(obj: any, seen: Set<any> = new Set()): any {
  if (typeof obj !== 'object' || obj === null || seen.has(obj)) return;
  seen.add(obj);
  for (const key in obj) {
    traverse(obj[key], seen);
  }
  return obj;
}
```

### 新增旧值和新值，需要开启 lazy 手动调用

```typescript
function watch(source: any, cb: (newVal: any, oldVal: any) => void): void {
  let getter: () => any;
  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let oldValue: any;
  let newValue: any;

  const myEffect = effect(() => getter(), {
    lazy: true,
    scheduler() { // 当依赖的响应式数据发生变化就会触发 scheduler 的执行
      newValue = myEffect();
      cb(oldValue, newValue); // 首次 oldValue 是 undefined
      oldValue = newValue; // 存储当前值作为 oldValue
    }
  });
}
```

### 加入 options 选项

options 有 immediate、flush 选项：
1. **immediate**：立即执行
2. **flush**：sync/pre/post，执行时机，分别指同步、组件渲染前、组件渲染后执行

```typescript
function watch(source: any, cb: (newVal: any, oldVal: any) => void, options?: WatchOptions): void {
  let getter: () => any;
  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let oldValue: any;
  let newValue: any;

  const job = () => {
    newValue = myEffect();
    cb(oldValue, newValue);
    oldValue = newValue;
  };

  const myEffect = effect(() => getter(), {
    lazy: true,
    scheduler() {
      // flush
      if (options?.flush === 'post') {
        Promise.resolve().then(() => job());
      } else if (options?.flush === 'sync') {
        job();
      } else {
        // ... pre 暂时无法模拟，涉及到组件渲染前
      }
    }
  });

  if (options?.immediate) {
    job(); // 立即执行，oldValue 是 undefined
  } else {
    oldValue = myEffect();
  }
}
```

### 过期的副作用

涉及到网络请求等异步副作用，当修改两次数据引发了 watch 的副作用执行，应该将第一次过期处理，第二次视为最新，否则返回结果可能不是预期。

Vue 设计允许 watch 回调函数接收第三个参数，第三个参数接收一个过期函数，每次副作用执行的时候会先调过期函数：

```typescript
function watch(source: any, cb: (newVal: any, oldVal: any, onInvalidate: (fn: () => void) => void) => void, options?: WatchOptions): void {
  let getter: () => any;
  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let oldValue: any;
  let newValue: any;
  let cleanup: (() => void) | undefined;

  function onInvalidate(fn: () => void): void {
    cleanup = fn;
  }

  const job = () => {
    if (cleanup) cleanup(); // 在 callback 执行之前执行用户注册的过期函数，实际上引用上次 callback 函数内部的一个变量形成闭包
    newValue = myEffect();
    cb(newValue, oldValue, onInvalidate); // callback 执行的时候会注册过期函数，因此先执行的且注册了过期函数的在下次执行就会被失效掉
    oldValue = newValue;
  };

  const myEffect = effect(() => getter(), {
    lazy: true,
    scheduler() {
      // flush
      if (options?.flush === 'post') {
        Promise.resolve().then(() => job());
      } else if (options?.flush === 'sync') {
        job();
      } else {
        // ... pre 暂时无法模拟，涉及到组件渲染前
      }
    }
  });

  if (options?.immediate) {
    job(); // 立即执行，oldValue 是 undefined
  } else {
    oldValue = myEffect();
  }
}
```

有了过期函数就可以标识过期这种情况了：

```typescript
watch(obj, async (newVal, oldVal, onInvalidate) => {
  let expired = false;
  onInvalidate(() => { // 闭包手段传入过期函数，允许 vue 访问 expired
    expired = true;
  });
  const res = await fetch('xxx');
  if (!expired) {
    finalData = res; // 最新结果
  }
});
```

### 总结

watch 也是内置配置了 lazy、scheduler 的 effect，首先会对第一个参数进行函数化包装，如果是对象的话会深度读取（触发依赖收集），然后会在 scheduler 中选择**合适的时机**（合适的时机是指 options 可以配置 immediate、flush 等选项）执行 job 函数，job 函数主要干了下面事情：

1. 如果有清除过期函数配置则调用清除回调函数
2. 执行 watch 第二个参数 callback，传入 oldValue、newValue、onInvalidate（暴露给外面注册过期函数）
3. 更新 oldValue

## Vue 3.3+ 新特性

### watchEffect

`watchEffect` 是 `watch` 的简化版，不需要指定监听的数据源，会自动收集依赖：

```typescript
const count = ref(0);

// 自动收集 count 作为依赖
watchEffect(() => {
  console.log(`count is: ${count.value}`);
});

count.value++; // 会触发 watchEffect
```

**watchEffect vs watch**：

| 特性 | watchEffect | watch |
|------|-------------|-------|
| 依赖收集 | 自动 | 手动指定 |
| 旧值 | 不支持 | 支持 |
| 惰性执行 | 立即执行 | 默认惰性 |
| 适用场景 | 简单副作用 | 需要旧值或复杂逻辑 |

### watchPostEffect 和 watchSyncEffect

Vue 3.2+ 提供了两个特殊的 watchEffect 变体：

```typescript
// watchPostEffect：在组件 DOM 更新后执行
watchPostEffect(() => {
  // 此时可以访问更新后的 DOM
  console.log(element.offsetHeight);
});

// watchSyncEffect：同步执行，不等待 DOM 更新
watchSyncEffect(() => {
  // 立即同步执行
  console.log('sync effect');
});
```

**执行时机**：
- `watchEffect`：默认在组件渲染前执行（pre）
- `watchPostEffect`：在组件 DOM 更新后执行（post）
- `watchSyncEffect`：同步执行（sync）

### Vue 3.3 watch 新特性

Vue 3.3 对 watch 做了以下改进：

1. **更好的类型推导**：watch 的回调函数参数类型更准确
2. **immediate 时的 oldValue**：首次执行时 oldValue 现在是 `undefined` 而不是源数据的初始值
3. **性能优化**：减少了不必要的依赖收集

### 最佳实践

#### 1. 选择合适的 watch 类型

```typescript
// 简单副作用，不需要旧值 → watchEffect
watchEffect(() => {
  document.title = `Count: ${count.value}`;
});

// 需要旧值或复杂逻辑 → watch
watch(count, (newVal, oldVal) => {
  console.log(`changed from ${oldVal} to ${newVal}`);
});
```

#### 2. 使用 onInvalidate 清理副作用

```typescript
watch(userId, async (newId, oldId, onInvalidate) => {
  let cancelled = false;
  onInvalidate(() => { cancelled = true; });

  const data = await fetchUser(newId);
  if (!cancelled) {
    userData.value = data;
  }
});
```

#### 3. 避免在 watch 中修改被监听的数据

```typescript
// ❌ 错误：会导致无限循环
watch(count, (newVal) => {
  count.value = newVal + 1; // 会再次触发 watch
});

// ✅ 正确：使用条件判断
watch(count, (newVal) => {
  if (newVal < 10) {
    count.value = newVal + 1;
  }
});
```

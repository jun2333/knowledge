## 原始值响应式

由于 Proxy 代理必须是非原始值，所以需要包装成一个对象，这就是 ref。

```typescript
function ref<T>(val: T): Ref<T> {
  const wrapper = {
    value: val
  };
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  });
  return reactive(wrapper) as unknown as Ref<T>;
}

interface Ref<T> {
  value: T;
  __v_isRef: true;
}
```

### ref 解决响应丢失问题

什么是响应丢失？如下面使用 `...` 运算符解构响应式对象 obj 则会返回一个普通对象，并不具备响应能力；因此将普通对象暴露到模板中的时候并不能正常进行依赖收集，所以渲染副作用函数并没有与 obj 建立响应式关系。

```typescript
export default {
  setup() {
    const obj = reactive({ a: 123, b: 234 });
    setTimeout(() => { // 并不会触发重新渲染
      obj.a = 0;
    });
    return { // 将数据暴露到模板中
      ...obj
    };
  }
};
```

如果有个对象可以代理访问 obj 被模板读取就可以解决响应丢失问题了：

```typescript
function toRef<T extends object, K extends keyof T>(obj: T, key: K): Ref<T[K]> {
  const wrapper = {
    get value() {
      return obj[key];
    },
    set value(val: T[K]) {
      obj[key] = val;
    }
  };
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  });
  return wrapper as Ref<T[K]>;
}

// 批量 toRef
function toRefs<T extends object>(obj: T): { [K in keyof T]: Ref<T[K]> } {
  const ret = {} as { [K in keyof T]: Ref<T[K]> };
  for (const key of Object.keys(obj) as Array<keyof T>) {
    ret[key] = toRef(obj, key);
  }
  return ret;
}
```

这样就解决了响应丢失问题：

```typescript
export default {
  setup() {
    const obj = reactive({ a: 123, b: 234 });
    setTimeout(() => {
      obj.a = 0;
    });
    return { // 将数据暴露到模板中
      ...toRefs(obj)
    };
  }
};
```

不过模板访问响应数据都要 `.value` 访问其值也有一定的心智负担，因此出现了自动脱 ref，将 setup 返回的对象代理下：

```typescript
function proxyRefs<T extends object>(target: T): T {
  return new Proxy(target, {
    get(target, key, receiver) {
      const val = Reflect.get(target, key, receiver);
      return val.__v_isRef ? val.value : val;
    },
    set(target, key, newVal, receiver) {
      const value = target[key as keyof T];
      if (value.__v_isRef) {
        value.value = newVal;
        return true;
      }
      Reflect.set(target, key, newVal, receiver);
      return true;
    }
  });
}

const newObj = proxyRefs(setup()); // 将 newObj 给到模板使用
```

## Vue 3.3+ 新特性

### customRef

`customRef` 允许创建一个自定义的 ref，可以显式控制依赖追踪和触发响应：

```typescript
function useDebouncedRef<T>(value: T, delay = 200): Ref<T> {
  let timeout: ReturnType<typeof setTimeout>;
  return customRef((track, trigger) => {
    return {
      get() {
        track(); // 显式追踪依赖
        return value;
      },
      set(newValue: T) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          value = newValue;
          trigger(); // 显式触发响应
        }, delay);
      }
    };
  });
}

// 使用
const searchText = useDebouncedRef('', 300);
```

**使用场景**：
- 防抖/节流
- 异步数据源
- 自定义存储逻辑（如 localStorage）

### shallowRef 触发机制优化

Vue 3.3 改进了 `shallowRef` 的触发机制，现在可以直接修改 `.value` 来触发响应：

```typescript
const state = shallowRef({ count: 0 });

// Vue 3.3+：直接修改 value 会触发响应
state.value = { count: 1 };

// 注意：修改内部属性不会触发响应
state.value.count = 2; // 不会触发更新
```

### ref 的类型改进

Vue 3.3 改进了 ref 的 TypeScript 类型推导：

```typescript
// Vue 3.2
const count = ref(0); // Ref<number>
count.value = 'hello'; // 类型错误

// Vue 3.3：更好的泛型推导
const count = ref<number | string>(0);
count.value = 'hello'; // OK
```

### 最佳实践

#### 1. 选择合适的 ref 类型

```typescript
// 原始值 → ref
const count = ref(0);
const name = ref('Vue');

// 对象 → reactive（不需要 .value）
const state = reactive({ count: 0, name: 'Vue' });

// 需要替换整个对象 → ref
const state = ref({ count: 0 });
state.value = { count: 1 }; // 替换整个对象
```

#### 2. 避免 ref 和 reactive 混用导致的混乱

```typescript
// ❌ 不推荐：混用导致心智负担
const count = ref(0);
const state = reactive({ name: 'Vue' });

// ✅ 推荐：统一使用 reactive（对象场景）
const state = reactive({ count: 0, name: 'Vue' });

// ✅ 推荐：统一使用 ref（需要替换整个对象）
const state = ref({ count: 0, name: 'Vue' });
```

#### 3. 使用 toRefs 解构响应式对象

```typescript
const state = reactive({ count: 0, name: 'Vue' });

// ❌ 错误：解构后失去响应性
const { count, name } = state;

// ✅ 正确：使用 toRefs
const { count, name } = toRefs(state);
```

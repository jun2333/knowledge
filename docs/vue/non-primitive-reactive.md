## Proxy 与 Reflect 的关系

### Proxy 的作用和用法

Proxy 用于返回一个代理对象，第一个参数是原始对象，第二个是一组夹子（trap）。最关键的就是夹子的配置，里面是一些拦截器，如 get/set/apply/own 等。

Reflect 是一个全局对象，它的方法和拦截器保持一致。

### 为啥要用 Reflect 而不是直接用 target 操作对象

看一个例子：

```typescript
const obj = { foo: 1, get bar() { return this.foo; } }; // this.foo 的 this 指向的是原始对象 obj
const p = new Proxy(obj, {
  get(target, key) {
    track(target, key);
    return target[key]; // 这里我们没有用 Reflect.get 完成获取值
  }
});

effect(() => {
  console.log(p.bar);
});

p.foo++;
```

当 `p.foo++` 时，并没有调用副作用函数。注意看副作用函数内读值 `p.bar`，而 `p.bar` 返回的是 `target.bar`，target 是原始对象（并非代理对象），所以对于非响应对象无法进行依赖收集，所以失去了响应性。

这时候，Reflect 派上用场了，它的第三个值表示执行上下文：

```typescript
const obj = { foo: 1, get bar() { return this.foo; } }; // this.foo 的 this 指向的是原始对象 obj
const p = new Proxy(obj, {
  get(target, key, receiver) { // 这里的 receiver 就是 p 本身
    track(target, key);
    return Reflect.get(target, key, receiver);
  }
});

effect(() => {
  console.log(p.bar);
});

p.foo++;
```

## Proxy 如何代理对象

### 依赖收集

1. 读值 get：`track(target, key)`
2. 遍历相关 ownKey：都与 `ITERATE_KEY` 绑定响应关系 `track(target, ITERATE_KEY)`

### 触发响应（添加第三个参数给 trigger 表示操作类型）

1. 赋值 set：`trigger(target, key, 'SET')`
2. 新增属性 set：`trigger(target, key, 'ADD')`
3. 删除 deleteProperty：`trigger(target, key, 'DELETE')`

涉及添加和删除的情况，trigger 里面需要将 `ITERATE_KEY` 关联的副作用执行一遍。

## 合理的触发响应

1. 新旧值不全等且不都是 NaN（考虑到 `NaN === NaN` 返回 false）：判断条件是 `newVal !== oldVal && (newVal === newVal || oldVal === oldVal)`
2. 由于 JS 的原型链特性，若在一个对象找不到某个属性则会顺着原型链查找属性，如果对象和原型对象都是被代理过的，那么如果在副作用中访问外层对象的属性，则会将整个原型链查找路径中的代理对象都与副作用建立响应关系，这样改变这个属性的值会**引起多次副作用**

解决方案：
- step1：在 get 中存储原始对象
- step2：数据变化时，只有当前对象是代理对象的原始对象才触发响应

```typescript
const trap = {
  get(target, key, receiver) {
    // ...
    if (key === 'raw') return target;
    // ...
  },
  set(target, key, newVal, receiver) {
    // ...
    if (target === receiver.raw) {
      trigger(target, key, type);
    }
    // ...
  }
};
```

## 深响应 & 浅响应

区别就是在于收集依赖的时候是否需要递归遍历对象。

```typescript
function reactive<T extends object>(obj: T): T {
  return createReactive(obj);
}

function shallowReactive<T extends object>(obj: T): T {
  return createReactive(obj, true);
}

function createReactive<T extends object>(obj: T, isShallow = false): T {
  const trap: ProxyHandler<T> = {
    get(target, key, receiver) {
      // ...
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      if (isShallow) {
        return res;
      }
      if (typeof res === 'object' && res !== null) {
        return reactive(res);
      }
      // ...
    }
  };
  return new Proxy(obj, trap);
}
```

## 只读 & 浅只读

先了解浅只读，只读只需要做到三点：
1. 读值不用依赖收集
2. set 拦截修改
3. deleteProperty 拦截删除

而深只读只需要递归遍历对象进行只读处理即可。

```typescript
function readOnly<T extends object>(obj: T): T {
  return createReactive(obj, false, true);
}

function shallowReadOnly<T extends object>(obj: T): T {
  return createReactive(obj, true, true);
}

function createReactive<T extends object>(obj: T, isShallow = false, isReadOnly = false): T {
  const trap: ProxyHandler<T> = {
    get(target, key, receiver) {
      // ...
      const res = Reflect.get(target, key, receiver);
      if (!isReadOnly) {
        track(target, key);
      }
      if (isShallow) {
        return res;
      }
      if (typeof res === 'object' && res !== null) { // 深只读
        return isReadOnly ? readOnly(res) : reactive(res);
      }
      // ...
    },
    set(target, key, val, receiver) {
      if (isReadOnly) {
        console.warn('无法修改');
        return true;
      }
      return Reflect.set(target, key, val, receiver);
    },
    deleteProperty(target, key) {
      if (isReadOnly) {
        console.warn('无法删除');
        return true;
      }
      return Reflect.deleteProperty(target, key);
    }
  };
  return new Proxy(obj, trap);
}
```

## 代理数组

数组其实是一种异质对象，key 为其下标，还有一些其他属性和方法，如 length、ITERATE_KEY、slice、splice 等。其中下标不用特别处理。

### length 相关

1. 设置 key：设置 key 不仅需要对当前 key 有依赖的副作用进行 trigger；还可能间接改变 length。`Number(key)` 小于 length 的话，type 为 SET，否则为 ADD；ADD 情况还需要对 length 有依赖的副作用进行 trigger。
2. 直接改变 length 值：不仅对 length 有依赖的副作用进行 trigger；还需要对索引大于等于 newValue 的项进行 trigger。

下面对 set 和 trigger 做调整：

```typescript
const trap = {
  set(target, key, val, receiver) {
    // ...
    const type = Array.isArray(target)
      ? Number(key) < target.length ? 'SET' : 'ADD'
      : Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : 'ADD';
    if (target === receiver.raw) {
      trigger(target, key, type, val); // 新增第四个参数 val
    }
    // ...
  },
};

function trigger(target: object, key: string | symbol, type: string, newVal?: any): void {
  // ...
  if (Array.isArray(target)) {
    if (key === 'length') {
      depsMap.forEach((effects, key) => {
        if (key >= newVal) {
          effects && effects.forEach(fn => {
            if (activeEffect !== fn) {
              fn();
            }
          });
        }
      });
    } else if (type === 'ADD') {
      const lengthEffect = depsMap.get('length');
      lengthEffect && lengthEffect.forEach(fn => {
        if (activeEffect !== fn) {
          fn();
        }
      });
    }
  }
  // ...
}
```

### 遍历数组

ownKey 与 length 绑定响应关系 `track(target, 'length')`，这样无论是修改 length 还是添加新元素都可正确触发响应。

数组的迭代都会访问 length 属性，因此不用特殊处理，只需要过滤掉 Symbol 类型的 key，不对其依赖收集。

#### includes 的重写

注意：当数组的项也是对象的时候，读其值会进一步对其值进行响应处理（这是深响应），所以数组调用 includes 查找方法时会出现一些意外：

```typescript
const obj = {};
const arr = reactive([obj]);
console.log(arr.includes(arr[0])); // false
console.log(arr.includes(obj)); // false
```

第一个 false 是由于入参 `arr[0]` 会使 obj 被 reactive 一个新对象 A，includes 内部查找的时候也会遍历访问一次 `arr[0]`，此时又被 reactive 成一个新对象 B，A !== B。

第二个 false 是由于代理对象 arr 中并不能找到原始对象 obj，它只能找到 obj 的代理对象。

解决方案：
- 第一个可以用一个代理对象 map 存储，其结构为原始对象 -> 代理对象，每次 reactive 之前先查 map 看是否存在，不存在才 createReactive
- 第二个可以重写 includes 方法，先从代理对象中查找，找不到则去原始对象中找

#### 隐式修改数组长度的方法

当调用 push/pop/shift/unshift/slice 等方法的时候会隐式修改 length 属性：

```typescript
const arr = reactive([]);

effect(() => { // 副作用 A
  arr.push(1);
});

effect(() => { // 副作用 B
  arr.push(1);
});
```

当尝试运行上面代码会抛出栈溢出的错误，因为两个副作用相互影响造成了死循环。

当第 1 个 effect 执行的时候会读取 length 属性，副作用 A 和 length 建立关联，同时也会改变 length，副作用 A 会被执行。

当第 2 个 effect 执行的时候也会读取 length 属性，副作用 B 和 length 建立关联，同时也会改变 length，副作用 B 会被执行，这时副作用 A 也会被执行。

他们相互触发响应导致栈溢出。

解决方案：调用这类方法的时候禁止 track。因此需要重写这类方法：

```typescript
let shouldTrack = true;

['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const originMethod = Array.prototype[method as keyof Array<any>];
  arrayInstrumentations[method] = function(...args: any[]) {
    shouldTrack = false;
    const res = originMethod.apply(this, args);
    shouldTrack = true;
    return res;
  };
});

function track(target: object, key: string | symbol): void {
  if (!activeEffect || !shouldTrack) return;
}
```

## 代理 Set & Map

### 代理作用域引起的错误

Set 和 Map 这两种数据结构被代理后会报错，其实它们和其他数据结构不一样，this 需要指向原始对象：

```typescript
const trap = {
  get(target, key, receiver) {
    if (key === 'size') {
      return Reflect.get(target, key, target); // 这里 this 指向 target 才不会报错
    }
    // 其他方法如 delete、add/set、clear 等
    return target[key].bind(target);
  }
};
```

### 建立响应式

1. size 跟 ITERATE_KEY 建立联系，即 `size -> track(target, ITERATE_KEY)`
2. 其他方法重写，下面描述其他方法被注入的逻辑
   - set -> `trigger(target, key, 'ADD'|'SET')` **需要避免污染原始数据（只能 set 原始数据）**
   ```typescript
   // target.set(value)
   const rawVal = value.raw || value;
   target.set(rawVal);
   ```
   - get -> `track(target, key)`
   - delete -> `trigger(target, key, 'DELETE')`
   - forEach -> `track(target, ITERATE_KEY)` 这里需要注意应该把回调函数的参数也响应式化，毕竟 reactive 是深响应
   - for...in -> `track(target, ITERATE_KEY)` 与 forEach 不同的是，它只关心 key，因此只需要对 key 响应式化

一般来说只有 ADD/DELETE 等操作类型会触发 ITERATE_KEY 的副作用，但 Map 类型除外，因此需要在 trigger 上加上 Map 的处理方案：

```typescript
// ADD 和 DELETE 触发与 key 迭代相关的副作用
if ((type === 'ADD' || type === 'DELETE') && Object.prototype.toString.call(target) === '[object Map]') {
  const mapKeyIterateEffects = depsMap.get(MAP_KEY_ITERATE_KEY);
  mapKeyIterateEffects && mapKeyIterateEffects.forEach(effect => {
    if (effect !== activeEffect) {
      effect();
    }
  });
}

// SET 触发与 value 相关的副作用
if (
  type === 'ADD' ||
  type === 'DELETE' ||
  (type === 'SET' && Object.prototype.toString.call(target) === '[object Map]')
) {
  const iterateEffects = depsMap.get(ITERATE_KEY);
  iterateEffects && iterateEffects.forEach(effectFn => {
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn);
    }
  });
}
```

### 迭代器处理，如 for...of

迭代器内部会调用 `[Symbol.iterator]` 方法，因此我们需要重写这个方法：

```typescript
const mutableInstrumentations = {
  [Symbol.iterator]() {
    const target = this.raw;
    const itr = target[Symbol.iterator]();
    // 参数响应式化，需要自定义包装一个迭代器
    const wrap = (val: any) => typeof val === 'object' && val !== null ? reactive(val) : val;
    track(target, ITERATE_KEY);
    return {
      next() {
        const { value, done } = itr.next();
        return {
          value: value ? [wrap(value[0]), wrap(value[1])] : value, // 将 key, value 响应式化
          done
        };
      },
      [Symbol.iterator]() { // 由于 entries 方法返回值也具有可迭代协议
        return this;
      }
    };
  }
};
```

上面 `[Symbol.iterator]` 的方法可以跟 entries 共用，可以抽出来做公共方法：

```typescript
const mutableInstrumentations = {
  [Symbol.iterator]: iterationMethod,
  entries: iterationMethod,
  values: valuesIterationMethod,
  keys: keysIterationMethod
};

function iterationMethod() {
  const target = this.raw;
  const itr = target[Symbol.iterator]();
  // 参数响应式化，需要自定义包装一个迭代器
  const wrap = (val: any) => typeof val === 'object' && val !== null ? reactive(val) : val;
  track(target, ITERATE_KEY);
  return {
    next() {
      const { value, done } = itr.next();
      return {
        value: value ? [wrap(value[0]), wrap(value[1])] : value, // 将 key, value 响应式化
        done
      };
    },
    [Symbol.iterator]() { // 由于 entries 方法返回值也具有可迭代协议
      return this;
    }
  };
}

function valuesIterationMethod() {
  const target = this.raw;
  const itr = target.values(); // 这里调 values
  // 参数响应式化，需要自定义包装一个迭代器
  const wrap = (val: any) => typeof val === 'object' && val !== null ? reactive(val) : val;
  track(target, ITERATE_KEY);
  return {
    next() {
      const { value, done } = itr.next();
      return {
        value: wrap(value),
        done
      };
    },
    [Symbol.iterator]() { // 由于 entries 方法返回值也具有可迭代协议
      return this;
    }
  };
}

function keysIterationMethod() {
  const target = this.raw;
  const itr = target.keys(); // 这里调 keys
  track(target, MAP_KEY_ITERATE_KEY);
  return {
    next() {
      const { value, done } = itr.next();
      return {
        value,
        done
      };
    },
    [Symbol.iterator]() { // 由于 entries 方法返回值也具有可迭代协议
      return this;
    }
  };
}
```

## 最佳实践

### 1. 选择合适的响应式 API

```typescript
// 原始值 → ref
const count = ref(0);
const name = ref('Vue');

// 对象 → reactive（不需要 .value，更简洁）
const state = reactive({ count: 0, name: 'Vue' });

// 需要替换整个对象 → ref
const state = ref({ count: 0 });
state.value = { count: 1 }; // 替换整个对象

// 只读数据 → readonly
const config = readonly({ api: '/api', timeout: 5000 });
```

### 2. 避免常见的响应式陷阱

```typescript
// ❌ 错误：解构后失去响应性
const { count, name } = state;

// ✅ 正确：使用 toRefs
const { count, name } = toRefs(state);

// ❌ 错误：直接赋值给 reactive 对象的属性（会失去响应性）
state = { count: 1 }; // 错误

// ✅ 正确：修改属性
state.count = 1; // 正确

// ❌ 错误：使用 Object.assign 会失去响应性
Object.assign(state, { count: 1 }); // 部分属性可能失去响应性

// ✅ 正确：逐个赋值
state.count = 1;
state.name = 'Vue';
```

### 3. 数组操作的正确方式

```typescript
const list = reactive([1, 2, 3]);

// ✅ 正确：使用变异方法
list.push(4);
list.splice(0, 1);

// ✅ 正确：替换整个数组
list.length = 0;

// ❌ 错误：直接赋值索引（Vue3 支持，但要注意）
list[0] = 10; // Vue3 支持，但某些场景可能有问题

// ✅ 推荐：使用变异方法
list.splice(0, 1, 10);
```

### 4. Map 和 Set 的使用

```typescript
// Map
const map = reactive(new Map());
map.set('key', 'value'); // 会触发响应
map.get('key'); // 会收集依赖

// Set
const set = reactive(new Set());
set.add('item'); // 会触发响应
set.has('item'); // 会收集依赖

// 注意：修改内部对象的属性不会触发响应
const obj = { count: 0 };
const set = reactive(new Set([obj]));
obj.count = 1; // 不会触发响应，因为 obj 不是响应式的

// ✅ 正确：使用 reactive 包装
const obj = reactive({ count: 0 });
const set = reactive(new Set([obj]));
obj.count = 1; // 会触发响应
```

### 5. 性能优化建议

```typescript
// 大对象使用 shallowReactive
const bigData = shallowReactive({ /* 大量数据 */ });

// 不需要深层响应的场景
const config = shallowReactive({ api: '/api', headers: {} });

// 使用 readonly 避免不必要的响应式开销
const constants = readonly({ MAX_COUNT: 100, API_URL: '/api' });
```

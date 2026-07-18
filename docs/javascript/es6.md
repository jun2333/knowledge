# ES6+ 新特性

## 变量声明

### let 与 const

```typescript
// var - 函数作用域，可重复声明，会提升
var a = 1;
var a = 2;  // 不报错

// let - 块级作用域，不可重复声明，不会提升
let b = 1;
// let b = 2;  // SyntaxError

// const - 块级作用域，常量（引用不可变）
const c = 1;
// c = 2;  // TypeError

// 块级作用域
if (true) {
  let x = 10;
  const y = 20;
}
// console.log(x, y);  // ReferenceError
```

### 暂时性死区（TDZ）

```typescript
console.log(a);  // undefined（var 提升）
var a = 1;

console.log(b);  // ReferenceError（let 不会提升）
let b = 2;
```

## 解构赋值

### 数组解构

```typescript
const [a, b, c] = [1, 2, 3];
const [first, ...rest] = [1, 2, 3, 4];  // first=1, rest=[2,3,4]
const [x = 10] = [];  // 默认值 x=10

// 交换变量
let m = 1, n = 2;
[m, n] = [n, m];
```

### 对象解构

```typescript
const { name, age } = { name: 'John', age: 30 };
const { name: userName, age: userAge } = { name: 'John', age: 30 };  // 重命名
const { x = 10, y = 20 } = { x: 1 };  // 默认值

// 嵌套解构
const { address: { city } } = { address: { city: 'Beijing' } };

// 函数参数解构
function greet({ name, age }: { name: string; age: number }) {
  console.log(`${name}, ${age}`);
}
```

## 模板字符串

```typescript
const name = 'John';
const age = 30;

// 基本用法
const str = `Hello, ${name}! You are ${age} years old.`;

// 多行字符串
const multiLine = `
  line 1
  line 2
  line 3
`;

// 标签模板
function tag(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] || '');
  }, '');
}
const result = tag`Hello ${name}, you are ${age}`;
```

## 箭头函数

```typescript
// 基本语法
const add = (a: number, b: number) => a + b;

// 无参数
const greet = () => 'Hello';

// 单个参数（可省略括号）
const double = x => x * 2;

// 返回对象（需要括号）
const createUser = (name: string) => ({ name });

// 箭头函数没有 this、arguments、super、new.target
// this 指向定义时的外层作用域
```

## 函数默认参数

```typescript
function createUser(name: string, age: number = 18, role: string = 'user') {
  return { name, age, role };
}

createUser('John');  // { name: 'John', age: 18, role: 'user' }
```

## 剩余参数

```typescript
function sum(...numbers: number[]): number {
  return numbers.reduce((total, num) => total + num, 0);
}
sum(1, 2, 3, 4);  // 10
```

## 扩展运算符

```typescript
// 数组
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];  // [1, 2, 3, 4, 5]
const [first, ...rest] = arr1;

// 对象
const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 };  // { a: 1, b: 2, c: 3 }

// 函数调用（代替 apply）
Math.max(...[1, 2, 3]);  // 3
```

## 数组新增方法

```typescript
// Array.from() - 类数组/可迭代对象转数组
Array.from('hello');           // ['h', 'e', 'l', 'l', 'o']
Array.from({ length: 3 }, (_, i) => i);  // [0, 1, 2]

// Array.of() - 创建数组
Array.of(1, 2, 3);  // [1, 2, 3]

// [].fill() - 填充
[1, 2, 3].fill(0);        // [0, 0, 0]
[1, 2, 3].fill(0, 1, 2);  // [1, 0, 3]

// [].copyWithin() - 复制
[1, 2, 3, 4, 5].copyWithin(0, 3);  // [4, 5, 3, 4, 5]

// [].includes() - 包含
[1, 2, 3].includes(2);  // true

// [].find() / [].findIndex() - 查找
[1, 2, 3].find(x => x > 1);       // 2
[1, 2, 3].findIndex(x => x > 1);  // 1

// [].keys() / [].values() / [].entries() - 遍历
for (const key of [1, 2, 3].keys()) console.log(key);
for (const value of [1, 2, 3].values()) console.log(value);
for (const [key, value] of [1, 2, 3].entries()) console.log(key, value);

// [].flat() - 扁平化嵌套数组
[1, [2, [3]]].flat(2);  // [1, 2, 3]
// [].flatMap() - 先 map 再 flat（只扁平一层），等价于 arr.map(fn).flat(1)
[1, 2, 3].flatMap(x => [x, x * 2]);  // [1, 2, 2, 4, 3, 6]
```

## 对象新增方法

```typescript
// Object.is() - 精确相等（可比较任意类型，对象比较引用地址而非内容）
Object.is(NaN, NaN);  // true
Object.is(0, -0);     // false
Object.is({}, {});    // false — 不同引用

// Object.assign() - 浅合并
Object.assign({ a: 1 }, { b: 2 }, { c: 3 });  // { a: 1, b: 2, c: 3 }

// Object.keys() / Object.values() / Object.entries()
Object.keys({ a: 1, b: 2 });    // ['a', 'b']
Object.values({ a: 1, b: 2 });  // [1, 2]
Object.entries({ a: 1, b: 2 }); // [['a', 1], ['b', 2]]

// Object.fromEntries() - 键值对转对象
Object.fromEntries([['a', 1], ['b', 2]]);  // { a: 1, b: 2 }
Object.fromEntries(new URLSearchParams('a=1&b=2'));  // { a: '1', b: '2' }

// Object.getOwnPropertyDescriptors() - 获取属性的完整描述符（含 get/set、enumerable 等）
const source = {
  get name() { return 'hello' }
}

// Object.assign 会调用 getter，只拷贝值，getter 丢失
const a = Object.assign({}, source)  // { name: 'hello' } — getter 没了

// getOwnPropertyDescriptors + defineProperties 完整保留 getter/setter
const b = Object.defineProperties({}, Object.getOwnPropertyDescriptors(source))
b.name  // 'hello' — 仍然是 getter
```

## Symbol

```typescript
// 创建唯一标识
const id = Symbol('id');
const user = { [id]: 123 };

// 防止属性名冲突
const METHOD_KEY = Symbol('method');
class MyClass {
  [METHOD_KEY]() {
    return 'private method';
  }
}

// Symbol.for() - 全局共享
const globalSymbol = Symbol.for('global');
```

## Iterator 与 for...of

```typescript
// 可迭代协议
const iterable = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        if (i < 3) return { value: i++, done: false };
        return { value: undefined, done: true };
      }
    };
  }
};

for (const value of iterable) {
  console.log(value);  // 0, 1, 2
}

// 内置可迭代对象：Array、String、Map、Set、NodeList
```

## Map 与 Set

### Map

```typescript
const map = new Map();
map.set('key', 'value');
map.set(1, 'number');
map.set({ a: 1 }, 'object');

map.get('key');      // 'value'
map.has('key');      // true
map.delete('key');   // true
map.clear();

// 遍历
for (const [key, value] of map) {
  console.log(key, value);
}

// Map vs Object
// Map 的键可以是任意类型，Object 的键只能是字符串/Symbol
// Map 有 size 属性，Object 需要手动计算
// Map 可迭代，Object 需要 Object.keys()
```

### Set

```typescript
const set = new Set([1, 2, 3, 2, 1]);  // {1, 2, 3}
set.add(4);
set.delete(3);
set.has(2);      // true
set.size;        // 3

// 数组去重
const unique = [...new Set([1, 2, 2, 3, 3])];  // [1, 2, 3]
```

### WeakMap 与 WeakSet

```typescript
// WeakMap - 键是弱引用，键被 GC 时条目自动移除
const weakMap = new WeakMap();
let obj = { name: 'John' };
weakMap.set(obj, 'value');
obj = null;  // GC 后，weakMap 中的条目自动移除

// WeakSet - 值是弱引用
const weakSet = new WeakSet();
```

## Promise

```typescript
// 基本用法
const promise = new Promise<string>((resolve, reject) => {
  setTimeout(() => {
    resolve('success');
    // reject(new Error('failed'));
  }, 1000);
});

promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log('done'));

// Promise.all() - 并行执行，全部成功才成功
Promise.all([promise1, promise2, promise3])
  .then(results => console.log(results))
  .catch(error => console.error(error));

// Promise.race() - 竞速，第一个完成就返回
Promise.race([promise1, promise2])
  .then(result => console.log(result));

// Promise.allSettled() - 等待所有完成（无论成功失败）
Promise.allSettled([promise1, promise2])
  .then(results => console.log(results));

// Promise.any() - 第一个成功就返回
Promise.any([promise1, promise2])
  .then(result => console.log(result));

// Promise.resolve() / Promise.reject()
const resolved = Promise.resolve('value');
const rejected = Promise.reject(new Error('error'));
```

## Generator

```typescript
function* generator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = generator();
gen.next();  // { value: 1, done: false }
gen.next();  // { value: 2, done: false }
gen.next();  // { value: 3, done: false }
gen.next();  // { value: undefined, done: true }

// 带参数的 yield — next(x) 的参数 x 会作为上一个 yield 表达式的返回值
function* echo() {
  const a = yield 1;  // 向外输出 1，等待 next(x) 把 x 赋给 a
  const b = yield 2;  // 向外输出 2，等待 next(x) 把 x 赋给 b
  return a + b;
}

const gen2 = echo();
gen2.next();       // { value: 1, done: false }  启动，yield 1 暂停
gen2.next(10);     // { value: 2, done: false }  10 赋给 a，yield 2 暂停
gen2.next(20);     // { value: 30, done: true }  20 赋给 b，return 10+20

// 应用：实现 Iterator
function* range(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}

for (const n of range(1, 5)) {
  console.log(n);  // 1, 2, 3, 4
}
```

## async/await

```typescript
// 基本用法
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// 并行执行
async function fetchAll() {
  const [user, posts] = await Promise.all([
    fetch('/api/user'),
    fetch('/api/posts'),
  ]);
  return { user, posts };
}

// 串行执行
async function fetchSequential() {
  const user = await fetch('/api/user');
  const posts = await fetch(`/api/posts?userId=${user.id}`);
  return { user, posts };
}

// async 函数返回 Promise
async function add(a: number, b: number) {
  return a + b;
}
add(1, 2).then(console.log);  // 3
```

### await 原理

`await` 本质是 **Generator + Promise 的语法糖**。`async` 函数执行时：

1. 遇到 `await expr`，先执行 `expr` 拿到一个 Promise
2. 将 `await` 之后的代码包装为微任务（等价于 `.then()` 的回调）
3. 暂停当前函数，让出执行权
4. Promise resolve 后，微任务执行，恢复函数后续代码

```typescript
// 你写的
async function foo() {
  const res = await fetchData()
  console.log(res)
}

// 引擎实际做的（简化）
function foo() {
  return Promise.resolve().then(() => {
    return fetchData()
  }).then((res) => {
    console.log(res)
  })
}
```

## 类（Class）

```typescript
class Animal {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a noise.`;
  }

  static create(name: string) {
    return new Animal(name);
  }
}

class Dog extends Animal {
  breed: string;

  constructor(name: string, breed: string) {
    super(name);
    this.breed = breed;
  }

  speak() {
    return `${this.name} barks.`;
  }
}

// 私有字段（ES2022）
class Counter {
  #count = 0;

  increment() {
    this.#count++;
  }

  getCount() {
    return this.#count;
  }
}
```

## 模块化（Module）

```typescript
// 导出
export const PI = 3.14;
export function add(a: number, b: number) {
  return a + b;
}
export default class Calculator {}

// 导入
import Calculator, { PI, add } from './math';

// 动态导入（按需加载）
const module = await import('./math');
module.add(1, 2);
```

## 可选链与空值合并

```typescript
// 可选链 ?.
const user = { name: 'John', address: { city: 'Beijing' } };
const city = user?.address?.city;        // 'Beijing'
const zip = user?.address?.zip;          // undefined
const method = user?.method?.();         // undefined（不报错）

// 空值合并 ??
const value = null ?? 'default';         // 'default'
const value2 = undefined ?? 'default';   // 'default'
const value3 = 0 ?? 'default';           // 0（不是'default'）
const value4 = '' ?? 'default';          // ''（不是'default'）

// 与 || 的区别
const a = 0 || 'default';    // 'default'
const b = 0 ?? 'default';    // 0
```

## Proxy 与 Reflect

```typescript
// Proxy - 代理对象
const handler = {
  get(target: any, prop: string) {
    console.log(`Getting ${prop}`);
    return target[prop];
  },
  set(target: any, prop: string, value: any) {
    console.log(`Setting ${prop} = ${value}`);
    target[prop] = value;
    return true;
  }
};

const proxy = new Proxy({ name: 'John' }, handler);
proxy.name;      // 'Getting name' → 'John'
proxy.age = 30;  // 'Setting age = 30'

// Reflect - 反射对象
Reflect.get({ name: 'John' }, 'name');      // 'John'
Reflect.set({}, 'name', 'John');            // true
Reflect.has({ name: 'John' }, 'name');      // true
Reflect.deleteProperty({}, 'name');         // true
Reflect.ownKeys({ a: 1, b: 2 });            // ['a', 'b']
```

## ES6+ 特性对比表

| 特性 | ES5 | ES6+ |
|------|-----|------|
| **变量声明** | `var` | `let`、`const` |
| **函数** | `function` | 箭头函数 |
| **字符串** | 拼接 `+` | 模板字符串 `` `${}` `` |
| **解构** | 手动赋值 | `[a, b] = [1, 2]` |
| **默认参数** | `a = a \|\| 1` | `function(a = 1)` |
| **剩余参数** | `arguments` | `...args` |
| **类** | 构造函数 + 原型 | `class` |
| **模块** | CommonJS/AMD | `import/export` |
| **异步** | 回调函数 | Promise、async/await |
| **数据结构** | Object、Array | Map、Set、WeakMap |

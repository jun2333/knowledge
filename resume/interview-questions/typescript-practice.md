# TypeScript 专项练习（基础 → 进阶）

> 从基础类型到类型体操，再到实战场景与工程化配置，共 34 题。
> 每题下方留有作答区。基础篇偏问答，进阶篇起需要写代码，做完可随时找我批改。

---

## 一、基础篇（8 题）

### 1.1 类型注解 vs 类型推断

> 什么时候必须显式写类型注解，什么时候可以靠推断？请举出至少 3 个"必须显式标注"的场景，并解释为什么。

**你的回答：**



---

### 1.2 interface vs type

> 1. `interface` 和 `type` 的核心区别是什么？
> 2. 哪些场景只能用 `interface`？（提示：声明合并）哪些只能用 `type`？（提示：联合类型、映射类型、元组）
> 3. 你在项目里的选型原则是什么？

**你的回答：**



---

### 1.3 类型收窄

> 给定以下代码，分别用 `typeof`、`in`、`instanceof`、自定义类型守卫（`is`）做类型收窄，各写出一个示例，并说明各自适用的场景：
>
> ```ts
> // typeof：适用于？
> // in：适用于？
> // instanceof：适用于？
> // is 自定义守卫：适用于？
> ```

**你的回答：**

```ts
// 在此作答

```

---

### 1.4 空值与严格模式

> 1. `strictNullChecks: true` 打开后会有什么变化？
> 2. `?.`（可选链）、`??`（空值合并）、`||` 三者的区别是什么？写出 `??` 和 `||` 的典型误用场景。
> 3. 函数参数是可选对象 `obj?: { name: string }`，如何安全读取 `obj.name`？

**你的回答：**



---

### 1.5 数组、元组与 as const

> 1. 元组 `[string, number]` 和数组 `(string | number)[]` 的区别？
> 2. `as const` 的作用是什么？对比：
>
> ```ts
> const a = ['read', 'write'];        // 推断为什么类型？
> const b = ['read', 'write'] as const; // 推断为什么类型？
> ```
>
> 3. 元组的可选元素和剩余元素怎么标注？（如 `[string, number?]`、`[string, ...number[]]`）

**你的回答：**



---

### 1.6 类型断言

> 1. `as` 和尖括号 `<>` 写法的区别？为什么尖括号在 JSX 里不能用？
> 2. `as unknown as X` 是什么？滥用会有什么后果？
> 3. 什么情况下你应该用类型断言，什么情况下说明你的类型设计有问题？

**你的回答：**



---

### 1.7 字面量类型与枚举

> 1. 字符串字面量联合类型 `'success' | 'error'` 和 `enum` 有什么区别？
> 2. 为什么很多团队（包括 TS 官方风格指南）推荐用字面量联合而不是 `enum`？（提示：运行时产物、数字枚举的任意赋值）
> 3. `const enum` 和普通 `enum` 的区别？

**你的回答：**



---

### 1.8 泛型基础

> 实现一个泛型函数 `firstItem`，要求：
> 1. 接收任意类型数组，返回第一个元素（可能为 undefined）
> 2. 推导出返回类型与数组元素类型一致
> 3. 再写一个 `pick` 函数：`pick(obj, key)` 返回 `obj[key]`，要求返回类型精确推导

**你的回答：**

```ts
// 在此作答

```

---

## 二、进阶篇（8 题）

### 2.1 keyof / typeof / 索引访问

> 给定：
>
> ```ts
> const config = { theme: 'dark', fontSize: 14, retries: 3 };
> ```
>
> 1. 用 `typeof` 获取 config 的类型
> 2. 用 `keyof` 获取其键的联合类型
> 3. 用索引访问类型取 `fontSize` 的类型
> 4. 写一个 `getValue(obj, key)`，key 限定为对象键，返回对应值的类型

**你的回答：**

```ts
// 在此作答

```

---

### 2.2 内置工具类型原理

> 手写以下内置工具类型的实现（不用内置的，自己写）：
>
> ```ts
> type MyPartial<T> = ?;       // 所有属性变可选
> type MyPick<T, K extends keyof T> = ?;  // 挑出 K 个属性
> type MyRecord<K extends keyof any, T> = ?; // 键类型为 K，值类型为 T
> type MyExclude<T, U> = ?;    // 从 T 中排除 U
> type MyOmit<T, K extends keyof T> = ?;  // 用 Pick + Exclude 组合
> ```

**你的回答：**

```ts
// 在此作答

```

---

### 2.3 条件类型与分布式

> 1. 条件类型 `T extends U ? X : Y` 的"分布式"（distributive）特性是什么？在什么情况下会触发分发？
> 2. 解释为什么下面两个结果不同：
>
> ```ts
> type A = 'a' | 'b' extends 'a' ? 1 : 2;        // 结果？
> type B = ('a' | 'b') extends 'a' ? 1 : 2;      // 与上面一样吗？
> type C = MyExclude<'a' | 'b' | 'c', 'a' | 'b'>; // 结果？
> ```
>
> 3. 如何让条件类型**不**触发分布式？（提示：`[T] extends [U]`）

**你的回答：**



---

### 2.4 infer 关键字

> 手写以下工具类型：
>
> ```ts
> type MyReturnType<T> = ?;       // 提取函数返回类型
> type MyParameters<T> = ?;       // 提取函数参数元组
> type MyAwaited<T> = ?;          // 递归解包 Promise<T>（解到非 Promise 为止）
> type ElementOf<T> = ?;          // 提取数组元素类型，如 ElementOf<string[]> => string
> ```

**你的回答：**

```ts
// 在此作答

```

---

### 2.5 映射类型与重映射

> 1. 手写 `MyReadonly<T>`（所有属性 readonly）和 `MyMutable<T>`（所有属性去 readonly）
> 2. 用 `as` 重映射（key remapping）实现：
>
> ```ts
> // 把对象的所有键加上前缀，如 { name: string } => { prefix_name: string }
> type AddPrefix<T, P extends string> = ?;
> ```
>
> 3. 实现 `UppercaseKeys<T>`：把对象的所有键转大写（提示：`K extends string` 时可用 `Uppercase<K>`）

**你的回答：**

```ts
// 在此作答

```

---

### 2.6 模板字面量类型

> 1. 什么是模板字面量类型？`\`${'get' | 'set'}${Capitalize<string>}\`` 能匹配哪些字符串？
> 2. 实现一个类型安全的 EventEmitter 事件表：
>
> ```ts
> interface EventMap {
>   click: { x: number; y: number };
>   input: { value: string };
> }
>
> // 实现 on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void)
> // 要求：on('click', (data) => data.x) 能推导出 data 为 { x: number; y: number }
> ```
>
> 3. 用模板字面量类型实现 `ParsePath<T>`：把 `'user.profile.name'` 拆成 `'user' | 'profile' | 'name'`（加分题）

**你的回答：**

```ts
// 在此作答

```

---

### 2.7 函数重载与 this 类型

> 1. 什么是函数重载（overload）？写一个 `format(input: string): string` 和 `format(input: number): string` 的重载
> 2. 重载的**实现签名**和**重载签名**的区别？为什么实现签名不能对外可见？
> 3. `this` 参数在函数类型中的作用？写一个带 `this` 参数的类型守卫

**你的回答：**

```ts
// 在此作答

```

---

### 2.8 泛型约束与默认值

> 1. 泛型约束 `T extends object` 和 `T extends Record<string, any>` 的区别？
> 2. 泛型默认值怎么写？什么时候用？
> 3. 写一个 `deepMerge<T extends object, U extends object>(a: T, b: U)`，返回类型为 `T & U`，并解释为什么返回值用 `T & U` 而不是手写联合

**你的回答：**

```ts
// 在此作答

```

---

## 三、类型体操篇（6 题）

### 3.1 深度工具类型

> 手写 `DeepPartial<T>` 和 `DeepRequired<T>`（递归），并说明与 `Partial`/`Required` 的区别：

**你的回答：**

```ts
// 在此作答

```

---

### 3.2 路径取值类型

> 实现 `Get<T, Path>`，通过字符串路径取嵌套属性类型：
>
> ```ts
> type Obj = { user: { profile: { name: string; age: number } } };
> type R = Get<Obj, 'user.profile.name'>; // => string
> type R2 = Get<Obj, 'user.profile.age'>;  // => number
> ```

**你的回答：**

```ts
// 在此作答

```

---

### 3.3 Union 转 Intersection

> 实现 `UnionToIntersection<T>`：
>
> ```ts
> type U = { a: string } | { b: number };
> type I = UnionToIntersection<U>; // => { a: string } & { b: number }
> ```
>
> 提示：利用"函数参数逆变位置的条件类型分发"

**你的回答：**

```ts
// 在此作答

```

---

### 3.4 元组工具类型

> 实现：
>
> ```ts
> type First<T extends any[]> = ?;        // 第一个元素
> type Last<T extends any[]> = ?;         // 最后一个元素
> type Pop<T extends any[]> = ?;          // 去掉最后一个元素
> type TupleToUnion<T extends any[]> = ?; // 元组转联合，[1, 'a'] => 1 | 'a'
> type Length<T extends readonly any[]> = ?; // 元组长度（数字字面量）
> ```

**你的回答：**

```ts
// 在此作答

```

---

### 3.5 字符串工具类型

> 实现：
>
> ```ts
> type StringToUnion<S extends string> = ?; // 'abc' => 'a' | 'b' | 'c'
> type Split<S extends string, D extends string> = ?; // Split<'a-b-c', '-'> => ['a','b','c']
> type Trim<S extends string> = ?; // 去掉首尾空格（提示：模板字面量递归）
> ```

**你的回答：**

```ts
// 在此作答

```

---

### 3.6 综合：完整类型体操

> 实现一个 `ParseQueryString<T>`，把 URL query 字符串解析为类型：
>
> ```ts
> type R = ParseQueryString<'a=1&b=2&c=3'>;
> // => { a: '1'; b: '2'; c: '3' }
> ```
>
> 加分：支持同名键合并为元组 `'a=1&a=2' => { a: ['1','2'] }`

**你的回答：**

```ts
// 在此作答

```

---

## 四、实战场景篇（7 题）

### 4.1 Command 模式类型设计（结合模板编辑器）

> 你的编辑器用 Command 模式。请设计类型：
>
> ```ts
> // 要求：
> // 1. Command 基类带泛型上下文 Context
> // 2. 命令注册表 key 为命令名，值为命令构造函数
> // 3. 执行器 execute(name, ...args) 时，args 类型根据命令名自动推导
> type CommandName = 'bold' | 'insertVar' | 'insertCondition';
> ```
>
> 写出核心类型定义和 `execute` 签名。

**你的回答：**

```ts
// 在此作答

```

---

### 4.2 API 响应类型（结合 RAG 服务）

> 你的后端接口返回格式：
>
> ```ts
> { code: 0, data: T }            // 成功
> { code: 4001, message: string } // 失败，无 data
> ```
>
> 1. 用 discriminated union 定义 `ApiResponse<T>`
> 2. 写一个类型安全的 `request<T>(url): Promise<ApiResponse<T>>`
> 3. 调用方如何优雅地做类型收窄？

**你的回答：**

```ts
// 在此作答

```

---

### 4.3 Zustand store 类型推导

> Zustand 的 `create` 会推导出 hook 的类型。请解释：
>
> ```ts
> const useStore = create((set) => ({
>   count: 0,
>   increment: () => set((s) => ({ count: s.count + 1 })),
> }));
>
> // 为什么 useStore((s) => s.count) 能推导出 number？
> // set 的参数类型是怎么自动推导出来的？
> ```
>
> 如果我们要给这个 store 加"中间件"（如 devtools），类型上需要做什么？

**你的回答：**



---

### 4.4 DFD Schema 派生类型（结合金融 SaaS）

> 你的 DFD 方案中字段定义如下：
>
> ```ts
> interface FieldDef {
>   key: string;
>   label: string;
>   type: 'text' | 'number' | 'date' | 'enum';
>   options?: string[];
> }
> ```
>
> 1. 如何从一个 `FieldDef[]` 推导出 `Record<key, 对应值类型>`？（text → string，number → number，enum → 选项联合）
> 2. 如果某个字段 `required: true`，如何在表单值类型中体现为必填？

**你的回答：**

```ts
// 在此作答

```

---

### 4.5 事件系统类型（发布订阅）

> 实现类型安全的发布订阅：
>
> ```ts
> // 要求：on('msg', (data) => ...) 时 data 类型由事件名自动推导
> // off / emit 同样类型安全
> type EventMap = {
>   msg: { id: number; content: string };
>   status: 'online' | 'offline';
> };
> class TypedEmitter {
>   // 在此实现
> }
> ```

**你的回答：**

```ts
// 在此作答

```

---

### 4.6 运行时校验（unknown 收窄）

> LLM 返回的 JSON 是 `unknown`，你不能信任它的结构。请：
> 1. 写一个类型守卫 `isChatMessage(data: unknown): data is ChatMessage`，校验 `{ role: 'user'|'assistant', content: string }`
> 2. 解释为什么"先 `as ChatMessage` 再用"是错误的做法
> 3. 提一下 zod 这类库解决什么问题，什么时候值得引入

**你的回答：**

```ts
// 在此作答

```

---

### 4.7 类型设计题：状态机

> 用类型系统表达一个任务状态机：
>
> ```ts
> // 状态：pending → running → success | failed | cancelled
> // 要求：
> // 1. 每个状态有允许的转移目标
> // 2. 非法转移在编译期报错
> // 3. 状态附带数据：running 时有 progress: number，failed 时有 error: string
> ```

**你的回答：**

```ts
// 在此作答

```

---

## 五、工程化与配置篇（5 题）

### 5.1 tsconfig 关键配置

> 解释以下配置各自的作用，并说明哪些组合是"严格模式"的标配：
>
> ```jsonc
> {
>   "strict": true,
>   "strictNullChecks": true,
>   "noImplicitAny": true,
>   "noUnusedLocals": true,
>   "noUncheckedIndexedAccess": true,
>   "moduleResolution": "bundler",
>   "paths": { "@/*": ["./src/*"] }
> }
> ```

**你的回答：**



---

### 5.2 声明文件

> 1. 你的项目要引入一个没有类型定义的 JS 库 `old-lib`，怎么处理？
> 2. `declare module 'old-lib'` 和写完整 `.d.ts` 的区别？
> 3. `declare global` 什么时候用？（如给 window 挂自定义属性）

**你的回答：**

```ts
// 在此作答

```

---

### 5.3 any / unknown / never

> 1. 三者各在什么场景下使用？
> 2. `any` 和 `unknown` 的本质区别是什么？（提示：可赋值性方向）
> 3. `never` 在什么情况下会被推导出来？写一个用 `never` 做穷尽性检查（exhaustive check）的 switch

**你的回答：**

```ts
// 在此作答

```

---

### 5.4 常见类型错误解读

> 解释以下报错产生的原因和解决方案：
>
> ```ts
> // 报错 1: Property 'name' does not exist on type '{}'
> const obj = {};
> obj.name = 'x';
>
> // 报错 2: Type 'string' is not assignable to type 'never'
> // （出现在 switch 穷尽性检查里）
>
> // 报错 3: Object literal may only specify known properties
> // （excess property check）
> interface User { name: string }
> const u: User = { name: 'x', age: 18 };
>
> // 报错 4: 'x' is possibly 'undefined'（noUncheckedIndexedAccess 打开后）
> const arr: string[] = ['a'];
> arr[0].length;
> ```

**你的回答：**



---

### 5.5 JS → TS 渐进迁移

> 你的简历提到做过 JS + Vue 到 TS + React 的迁移。请回答：
> 1. 渐进迁移的关键配置是什么？（allowJs、checkJs、strict 的开启顺序）
> 2. 迁移时优先给哪些文件加类型？（公共接口、数据层 vs UI 层）
> 3. 存量 JS 文件怎么控制风险？（@ts-ignore 的规范使用、any 的临时策略、专项债）

**你的回答：**



---

## 附：自检清单

- [ ] 基础篇是否全部能不看资料答出？
- [ ] 进阶篇的每个工具类型能否独立默写？
- [ ] 类型体操篇 6 题是否理解"为什么这样写"而不是背答案？
- [ ] 实战篇是否都结合了自己的项目场景？
- [ ] 遇到不会的类型错误，是否知道报错信息的含义？

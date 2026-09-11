# TypeScript 专项练习（基础 → 进阶）

> 从基础类型到类型体操，再到实战场景与工程化配置，共 34 题。
> 每题下方留有作答区。基础篇偏问答，进阶篇起需要写代码，做完可随时找我批改。

---

## 一、基础篇（8 题）

### 1.1 类型注解 vs 类型推断

> 什么时候必须显式写类型注解，什么时候可以靠推断？请举出至少 3 个"必须显式标注"的场景，并解释为什么。

**你的回答：**
基础类型且类型会动态变化场景可用类型推断，函数返回值类型可用推断。
类型注解场景：类型固定、非基础类型(复杂类型或者涉及联合、交叉等场景)、类型接口
简单场景可以让tx推断，这样让代码书写稍微灵活点，复杂类型则需要显示注解，提高代码可维护性

---

**批改（2026-09-07）：5/10**

> 评价：答得太泛。题目要求"至少 3 个**具体**场景 + 解释为什么"，你的回答停留在原则描述（"类型固定、复杂类型"），没有落到具体场景，面试官追问"具体哪个场景"就接不住了。

**参考答案**（必须显式标注的典型场景）：

```ts
// 1. 函数参数：noImplicitAny 下不写就是隐式 any，编译报错
function add(a: number, b: number) { return a + b; }

// 2. 声明与赋值分离的变量：声明时不赋值，TS 无法推断
let user: User;
user = fetchUser();

// 3. 运行时数据边界：JSON.parse 返回 any，不注解类型信息就丢了
const config: AppConfig = JSON.parse(raw);

// 4. 空数组/空对象后续填充：不注解会推断成 never[] / {}
const list: User[] = [];

// 5. 类属性：不在构造函数中初始化时需要注解
```

**记忆点**：凡是"编译器拿不到信息"的地方（函数参数、运行时数据、延迟赋值），必须注解；凡是初始化表达式一眼能看出类型的地方，交给推断。

---

### 1.2 interface vs type

> 1. `interface` 和 `type` 的核心区别是什么？
> 2. 哪些场景只能用 `interface`？（提示：声明合并）哪些只能用 `type`？（提示：联合类型、映射类型、元组）
> 3. 你在项目里的选型原则是什么？

**你的回答：**
1. 类型接口类似对象，它支持声明合并和继承；类型别名可以是基础类型、对象，它支持类型联合、交叉、映射以及基础类型别名；因此本质区别在于使用场景以及特性的区别
2. 声明合并或者继承场景只能用`interface`；类型联合、交叉、映射、元组场景则用`type`
3. 能用type都用type，type满足不了的场景(比如声明合并、继承)才用interface

---

**批改（2026-09-07）：7/10**

> 评价：整体不错。两个扣分点：① "继承场景只能用 interface" 不严谨——type 用 `&` 交叉也能复用对象结构，区别在于 `interface extends` 是真继承（属性冲突会报错），`&` 是交叉（冲突合并成 never、不报错，更危险）；② 第 1 问"本质区别"的表述绕，更干净的版本：interface 只能描述对象结构、支持声明合并；type 是类型别名，可为任意类型命名。

**参考答案要点**：

1. 核心区别：interface 只能描述对象结构；type 是类型别名，可作用于联合、元组、基础类型等任意类型
2. 只能 interface：声明合并（如给全局 Window 补属性）；只能 type：联合、映射、元组、条件类型、给基础类型起别名
3. 选型：团队统一即可。你的"能用 type 就 type"原则可行（type 不会意外触发声明合并、更可控），但要能说出理由

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
// tyoeof 适用于unknown->精确类型的收窄场景
function toString(params: unknown):string {
    if(typeof param === 'string') return param
    if(typeof param === 'number') return String(param)
    if(typeof param === 'object') return params.toString()
    // ...
}

// in适用于联合类型下不同类型的执行逻辑
interface Fish { swim(): void }
interface Bird { fly(): void }

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim();  // animal: Fish
  } else {
    animal.fly();   // animal: Bird
  }
}

// instanceof适用于参数不同实例下走不同的逻辑
function getDays(date: Date | string) {
  if (date instanceof Date) {
    return date.getDate();  // date: Date
  }
  return new Date(date).getDate();  // date: string
}

// is适用于自定义类型守卫
function isString(x: unknown): x is string {
  return typeof x === "string";
}

```
总结来看类型收窄就是代码里进一步根据不同的类型走各自精确的逻辑的写法，让程序更安全，通常适用于联合类型+条件执行、unknown类型安全化等场景

---

**批改（2026-09-07）：5.5/10**

> 评价：四种收窄的适用场景理解正确，总结到位。但代码错误多，面试手写会直接暴露：① `tyoeof` 拼写错误；② `params unknown` 不是 TS 语法，应为 `params: unknown`；③ `param` / `params` 变量名混用；④ `typeof param === 'object'` 分支收窄到的是 object 而非 string，且 `null` 的 typeof 也是 `'object'`，`params.toString()` 得不到有效结果；⑤ "is 适用于自定义类型守卫"是同义反复，要说清它解决什么问题。

**参考答案**：

```ts
// typeof：收窄基础类型，适用于 unknown / 基础类型联合
function format(v: string | number) {
  if (typeof v === "string") return v.trim();
  return v.toFixed(2);
}

// in：收窄对象联合，适用于字段差异明显的对象联合
function move(animal: Fish | Bird) {
  if ("swim" in animal) animal.swim();
  else animal.fly();
}

// instanceof：收窄类实例，适用于类 / 内置对象联合
function getDays(d: Date | string) {
  if (d instanceof Date) return d.getDate();
  return new Date(d).getDate();
}

// is：复用收窄逻辑，适用于内置守卫表达不了的场景（尤其校验 unknown）
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(i => typeof i === "string");
}
```

---

### 1.4 空值与严格模式

> 1. `strictNullChecks: true` 打开后会有什么变化？
> 2. `?.`（可选链）、`??`（空值合并）、`||` 三者的区别是什么？写出 `??` 和 `||` 的典型误用场景。
> 3. 函数参数是可选对象 `obj?: { name: string }`，如何安全读取 `obj.name`？

**你的回答：**
1. null/undefined不能赋值给其他类型
2. 可选链是属性存在则get属性值否则取到undefined并终止取值；空值合并是遇到非null/undefined时则取其值，它与`||`有点接近但区别在于取值条件不一样，`||`遇到类似空值的(如：null/undefined、0、‘’)都会取跳过取后者，而`??`只遇到null/undefined才跳过取后者
3. 常规js是需要控制判断加可选链读取属性做到安全读取，而ts则只需要类型收窄即可，使用typeof判断参数是否符合类型，符合类型定义则直接安全读取

---

**批改（2026-09-07）：6/10**

> 评价：第 1 问对（可补充：开启后 null/undefined 不能赋给其他类型，使用前必须收窄）；第 2 问 `?.` 和 `??` / `||` 的区别解释正确，但题目要求的"典型误用场景"没给例子；第 3 问**答偏**——题目就是可选链的事，`typeof` 判断不解决 `obj` 本身为 undefined 的问题。

**参考答案要点**：

```ts
// 2. || 误用：0 是合法数量，却被当成"空"换成默认值
const count = inputCount || 10;   // inputCount = 0 时错误地变成 10
const count = inputCount ?? 10;   // 正确
// ?? 误用：期望空字符串也走默认值时，?? 拦不住 ''
const name = inputName ?? '匿名'; // inputName = '' 时得到 ''

// 3. 安全读取可选对象属性：可选链一步到位
const name = obj?.name;
```

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
1. 元组界定了长度和每个索引对应的类型，数组类型则只是界定了数组内容的类型
2. a推断为string[]类型；b推断为常量字面量类型；区别在于虽然都是数组，但as const不会限定数组里的内容是string
3. `[string, number?]` `[number, ...string[]]`

---

**批改（2026-09-07）：6.5/10**

> 评价：第 1 问对；第 2 问 a 的推断（string[]）对，但 b 描述成"常量字面量类型"没说到点，"as const 不会限定数组里的内容是 string"这句说**反了**——as const 恰恰把元素收窄为精确的字面量类型 `'read' | 'write'`；第 3 问 `[string, number?]` 对，剩余元素形式对但与题目示例不一致。

**参考答案要点**：

```ts
const a = ['read', 'write'];           // string[]
const b = ['read', 'write'] as const;  // readonly ['read', 'write']
// as const 做两件事：1) 深度收窄为字面量类型 2) 所有属性变 readonly

type T1 = [string, number?];      // 可选元素，读取类型为 number | undefined
type T2 = [string, ...number[]];  // 剩余元素：第一个之后是任意数量 number
```

---

### 1.6 类型断言

> 1. `as` 和尖括号 `<>` 写法的区别？为什么尖括号在 JSX 里不能用？
> 2. `as unknown as X` 是什么？滥用会有什么后果？
> 3. 什么情况下你应该用类型断言，什么情况下说明你的类型设计有问题？

**你的回答：**
1. 区别在于as是将a类型当成b类型，绕开类型检查；而`<>`则是明确在里面填类型，不确定则可以用泛型；JSX不能用是因为与React的Fragment简写冲突
2. 将某类型推断为未知或者X类型，滥用导致类型失控，直接弱化TS的作用
3. 不能完全确定类型的情况下可以用类型断言，要分清不能完全确定类型和完全不确定类型的区别，完全不确定类型下贸然用断言说设计有问题

---

**批改（2026-09-07）：5.5/10**

> 评价：① `<>` 的解释不通顺，它和泛型无关，就是把表达式断言为指定类型；② JSX 冲突原因**不准确**——不是因为 Fragment 简写，而是 `<T>expr` 在 .tsx 里会被解析成 JSX 元素（T 被当成组件标签），两种语法无法区分，所以 tsx 里禁用尖括号断言、只允许 as；③ 第 2 问对（它是双重断言，unknown 只是中转站）；第 3 问太抽象。

**参考答案要点**：

1. as 与 `<>` 功能相同；.tsx 文件中只能用 as
2. `as unknown as X`：双重断言，先把类型擦成 unknown 再强转，可绕过所有兼容性检查；滥用后编译器标注的类型全是假的，运行时崩溃
3. 断言的正确场景是"你掌握编译器没有的运行时信息"（`event.target as HTMLInputElement`、已校验的外部数据）；危险信号：频繁断言 / 需要双重断言——说明类型设计有问题，该修类型而不是加断言

---

### 1.7 字面量类型与枚举

> 1. 字符串字面量联合类型 `'success' | 'error'` 和 `enum` 有什么区别？
> 2. 为什么很多团队（包括 TS 官方风格指南）推荐用字面量联合而不是 `enum`？（提示：运行时产物、数字枚举的任意赋值）
> 3. `const enum` 和普通 `enum` 的区别？

**你的回答：**

1. 字面量联合类型时候js天然支持，省去了运行开销；字面量联合类型得到的是标准字面量类型与string体系互通，而enum得到的始终是枚举身份类型，有兼容性问题，并且数字枚举类型检查容易失控(比如 enum Direction { Up, Down } 时 let d: Direction = 42 是合法的)
2. 如1所述，补充一条：与js生态兼容
3. `const enum`编译时内联，无运行时开销

---

**批改（2026-09-07）：7/10**

> 评价：第 1 问能从类型系统层面分析（字面量与 string 体系互通 vs 枚举身份），消化得好。但有一个**过时知识点**："数字枚举 `let d: Direction = 42` 合法"在 TS 5.0 后已经**报错**（当天上午刚在 `docs/javascript/typescript.md` 修正过），注意更新记忆。第 3 问对，可以更完整。

**参考答案要点**：

1. 字面量联合：纯类型层面、编译后消失、与 string 类型体系完全互通；enum：类型 + 运行时对象、类型是名义的枚举成员类型、兼容性单向（枚举成员可赋给对应字面量，反向不行）
2. 推荐字面量联合：零运行时产物；类型是标准字面量，泛型 / 条件类型中表现与普通 string 一致；标准 JS 生态写法；（历史）TS 5.0 前数字枚举有任意 number 可赋值的坑
3. const enum：编译时内联、不生成对象，但不能有计算成员、isolatedModules 下受限（很多项目因此禁用，这也是字面量联合的又一优势）；普通 enum 生成运行时对象（数字枚举还带反向映射）

---

### 1.8 泛型基础

> 实现一个泛型函数 `firstItem`，要求：
> 1. 接收任意类型数组，返回第一个元素（可能为 undefined）
> 2. 推导出返回类型与数组元素类型一致
> 3. 再写一个 `pick` 函数：`pick(obj, key)` 返回 `obj[key]`，要求返回类型精确推导

**你的回答：**

```ts
// 在此作答
function firstItem<T>(arr: Array<T>):T | undefined {
    return array[0]
}
function pick<T, K extends keyof T>(obj:T, key:K):T[K] {
    return obj[k]
}
```

---

**批改（2026-09-07）：2/10**

> 评价：代码完全不是 TypeScript 语法，是 Java/C# 风格（`Array<T> array`、`string<K in keyof T> key`），且 `T[0]` 不是合法返回类型、`obj[k]` 中 `k` 变量未定义。面试手写会非常减分。但思路方向是对的：知道约束 key、知道返回 `T[K]`——索引访问的概念有了，差的是泛型语法本身。

**参考答案**：

```ts
function firstItem<T>(arr: T[]): T | undefined {
  return arr[0];
}

function pick<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'x', age: 18 };
pick(user, 'name');  // string，返回类型精确推导
pick(user, 'age');   // number
// K extends keyof T：key 只能传合法键名；K 被推断为具体字面量，T[K] 才能精确到对应属性类型
```

**语法模板**：泛型参数写在函数名后面 `<T>`，参数格式为 `参数名: 类型`，与 Java 的 `Array<T> array` 完全不同。

---

## 基础篇总评（2026-09-07）

| 题号 | 得分 | 主要失分点 |
|------|------|-----------|
| 1.1 | 5/10 | 缺具体场景，答得太泛 |
| 1.2 | 7/10 | "继承只能 interface"不严谨 |
| 1.3 | 5.5/10 | 代码语法错误多，is 的说明是同义反复 |
| 1.4 | 6/10 | 第 3 问答偏，缺误用示例 |
| 1.5 | 6.5/10 | as const 对元素类型的描述说反了 |
| 1.6 | 5.5/10 | JSX 冲突原因不准确 |
| 1.7 | 7/10 | 数字枚举知识点过时（TS 5.0 已修复） |
| 1.8 | 2/10 | 泛型语法未掌握（概念方向正确） |

**优先补**：① 泛型语法——把 1.8 重写一遍再进阶篇；② TS 5.0 枚举行为变化；③ 答题落到具体代码，概念描述要有例子支撑。

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
type ConfigType = typeof config
type KeyType = keyof ConfigType
type FontSize = ConfigType['fontSize']
let fs: FontSize = 14
function getValue<T, K extends keyof T>(obj:T, key:K):T[K]{
    return obj[key]
}
getValue(config, 'fontSize')
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
type MyPartial<T> = { [K in keyof T]?: T[K]} // 输入对象 输出对象
type MyPick<T, K extends keyof T> = { [P in K]: T[P]  } // 输入对象 + 键集合 输出对象
type MyRecord<K extends keyof any, T> = {[P in K]: T} // 输入键联合+值类型 输出对象
type MyExclude<T, U> = T extends U ? never : T // 输出联合 输出联合
type MyOmit<T, K extends keyof T> = MyPick<T, MyExclude<keyof T, K>> // 输入对象和键联合 输出对象

// ===== MyRecord 用法 =====
// 用途:由"键名集合 + 值类型"生成一个对象,常用于字典/映射类结构
type Labels = MyRecord<'success' | 'error', string>;
// 等价于 { success: string; error: string }
const labels: Labels = { success: '成功', error: '失败' };
// 一个典型场景:表驱动配置,key 是枚举/联合,value 是统一结构
type StatusText = MyRecord<'pending' | 'done', { label: string; color: string }>;

// ===== Exclude 为什么这么实现:T extends U ? never : T =====
// 三步理解:
// 1. 条件类型:逐个成员问"我是 U 的子类型吗?"('a' 是 'a'|'b' 的一员 → 是)
// 2. 分发:裸泛型 T 传入联合时,联合被拆开逐个判断再合并
// 3. never 吸收:属于 U 的成员变成 never,而 never | 'c' === 'c',被排除的成员合并时自然消失
// 推演 MyExclude<'a' | 'b' | 'c', 'a' | 'b'>:
//   'a' extends 'a'|'b' ? never : 'a'  → never
//   'b' extends 'a'|'b' ? never : 'b'  → never
//   'c' extends 'a'|'b' ? never : 'c'  → 'c'
//   合并:never | never | 'c' → 'c' ✅
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
1. 分发的特性是遍历联合类型依次跟U进行extends关键字对比，满足则返回X不满足是Y，最终将结果联合起来，触发分发需要两个条件：
1.声明的时候泛型裸露无元组包裹
2.使用的时候传入联合类型
2. 
A: 2
B: 2
C: 'c'
3. 泛型加上元组`type NoDistribute<T, U> = [T] extends [U] ? never : T;`


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
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never
type MyParameters<T> = T extends (...args: infer R) => any ? R : never
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T
type ElementOf<T> = T extends (infer R)[] ? R : never
```

---

**批改（2026-09-07）：5/10**

> 评价：`MyReturnType` 完全正确——infer 语法已掌握。`MyAwaited` 只解了一层，没递归；另外两个没写。缺两件事：① infer 的位置可以换(参数位、数组元素位、Promise 泛型位)；② true 分支里可以递归引用自己来"解到底"。

**参考答案**：

```ts
// 洞挖在返回类型位置
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 洞挖在参数位置,推断出整个参数元组
type MyParameters<T> = T extends (...args: infer P) => any ? P : never;

// 洞挖在数组元素位置
type ElementOf<T> = T extends (infer E)[] ? E : never;

// 递归:true 分支调用自己,不是 Promise 时走 else 原样返回(递归终止)
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;
// MyAwaited<Promise<Promise<number>>>:
//   第 1 层 → U = Promise<number>,递归 MyAwaited<Promise<number>>
//   第 2 层 → U = number,递归 MyAwaited<number>
//   第 3 层 → number 不是 Promise → else 返回 number ✅
```

**infer 心智模型**：描述一个形状，在想要的位置挖洞(`infer X`)，TS 把实际类型推断进 X，true 分支里就能用。

---

**infer 专项练习(待完成，做完发我批改)**：

```ts
// 1. MyParameters 补做:提取 (a: string, b: number) => void 的参数元组 [a: string, b: number]
type MyParameters<T> = T extends (...args: infer P) => any ? P : never;

// 2. ElementOf 补做:提取数组元素类型,ElementOf<string[]> => string
type ElementOf<T> = T extends (infer E)[] ? E : never;

// 3. MyFirst:取数组第一个元素,MyFirst<[1, 'a', true]> => 1(提示:infer 放元组开头 + 剩余 ...any[])
type MyFirst<T extends any[]> = T extends [infer F, ...any[]] ? F : never;

// 4. MyLast:取数组最后一个元素,MyLast<[1, 'a', true]> => true(提示:用 ...infer R 吸收前面的)
type MyLast<T extends any[]> = T extends [...any[], infer L] ? L : never;

// 5. MyPop:去掉最后一个元素,返回剩余元组,MyPop<[1, 'a', true]> => [1, 'a']
type MyPop<T extends any[]> = T extends [...infer R, any] ? R : never;

// 6. 挑战题:MyFlattenDeep 递归解包嵌套数组,MyFlattenDeep<number[][][]> => number
//    (提示:数组元素还是数组就递归,否则原样返回)
type MyFlattenDeep<T> = T extends (infer R)[] ? MyFlattenDeep<R> : T;
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
// 1.
type MyReadonly<T> = { readonly[K in keyof T]: T[K] }
type MyMutable<T> = { -readonly[K in keyof T]: T[K] }

// 2.
type AddPrefix<T, P extends string> = { [K in keyof T as `${P}_${K & string}`]: T[K] }

// 3.
type UppercaseKeys<T> = { [K in keyof T as Uppercase<K & string>]: T[K] }

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
1. 字面量类型就是利用模板字符串拼接的具体的字面量的类型，上述字面量类型能匹配任何:\get/set+首字母大写的字符串\

```ts
// 在此作答
// 2.
interface EventMap {
   click: { x: number; y: number };
   input: { value: string };
}
class EventEmitter<T extends Record<string, T[keyof T]>> {
    private handles = new Map<keyof T, Array<(data: T[keyof T]) => void>>()
    on<K extends keyof T>(event: K, handler: (data: T[K])=>void):void {
        if(!this.handles.has(event)) this.handles.set(event, [handler])
        else this.handles.get(event)!.push(handler)
    }
}
const eventEmitter = new EventEmitter<EventMap>()
eventEmitter.on('click', data => console.log(data))
//3. 
**批改（2026-09-07）：6.5/10**

> 评价：第 1 问方向对（"get/set + 大写开头字符串"），表述可精化为"字面量拼接的笛卡尔积展开"；第 3 问加分题你自己写对了——`infer head` / `infer tail` 拆点号递归，漂亮；第 2 问思想对（`T[K]` 把事件名和载荷类型绑定），但当前代码**编译不过**，有两处硬伤（tsc 5.9 实测）：
>
> 1. 约束 `T extends Record<string, T[keyof T]>` 自引用——`EventEmitter<EventMap>` 实例化报 TS2344：interface 没有 index signature，不满足 Record
> 2. 即便约束改回 `Record<string, any>`，`handles` 里存 `(data: T[keyof T]) => void`，on 中放 `(data: T[K]) => void` 会报参数逆变错误（TS2322）——K 事件的 handler 不能假装能处理所有事件的载荷

**第 2 问可编译参考实现**（外部类型安全 + 内部用一次合理断言桥接）：

```ts
class EventEmitter<T extends Record<string, any>> {
  private handlers = new Map<keyof T, Set<(data: T[keyof T]) => void>>();

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as (data: T[keyof T]) => void);  // 内部放宽;emit 只发对应载荷
    this.handlers.set(event, set);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.handlers.get(event)?.forEach(h => (h as (d: T[K]) => void)(data));  // 反向断言
  }
}

const ee = new EventEmitter<EventMap>();
ee.on('click', d => d.x);          // d: { x: number; y: number } ✅
ee.emit('click', { x: 1, y: 2 });  // ✅
ee.emit('input', 'oops');          // ❌ 编译期拦截:input 需要 { value: string }
```

**值得记住的点**：Map 内部无法表达"数组与 key 绑定"，所以在存/取两端各做一次 `as` 断言桥接——这正是 1.6 说的"断言合理使用场景"：外部接口保持精确，内部桥接编译器表达不了的关联。

---

**字符串拆解专项练习（待完成，做完发我批改）**：

```ts
// 1. ParsePath 补做:'user.profile.name' → 'user' | 'profile' | 'name'
type ParsePath<T extends string> = T extends `${infer Head}.${infer Tail}` ? Head | ParsePath<Tail> : T;

// 2. StartsWith:判断 T 是否以 P 开头(提示:${P}${string})
//    StartsWith<'prefix_name', 'prefix_'> => true;StartsWith<'name', 'prefix_'> => false
type StartsWith<T extends string, P extends string> = T extends `${P}${string}` ? true : false;

// 3. RemovePrefix:如果 T 以 P 开头就去掉它
//    RemovePrefix<'prefix_name', 'prefix_'> => 'name';RemovePrefix<'name', 'prefix_'> => 'name'(没匹配就原样)
type RemovePrefix<T extends string, P extends string> = T extends `${P}${infer R}` ? R : T;

// 4. SplitOnce:用分隔符拆一次,返回 [前, 后]
//    SplitOnce<'a-b-c', '-'> => ['a', 'b-c'];SplitOnce<'abc', '-'> => ['abc'](拆不动就单元素元组)
type SplitOnce<T extends string, D extends string> = T extends `${infer Head}${D}${infer Tail}` ? [Head, Tail] : [T];

// 5. 挑战:RemoveLastSegment:去掉最后一个点号后的部分
//    RemoveLastSegment<'a.b.c'> => 'a.b';RemoveLastSegment<'abc'> => 'abc'
type RemoveLastSegment<T extends string> = T extends `${infer Head}.${infer Tail}` ? 
    Tail extends `${string}.${string}` ? `${Head}.${RemoveLastSegment<Tail>}` : Head 
    : T;
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

**批改（2026-09-07）：未作答（概念全新，已补讲解）**

> 本题是全新知识点，没答不用气馁。核心先说透：**TS 的重载和 Java 不一样，只允许一个函数体**。Java 是"多个同名方法 + 多个实现"；TS 是"多个签名门面 + 一个实现兜底"，函数体内自己用 typeof 分派。

**参考答案**：

```ts
// 1. 重载签名只声明、不写函数体;实现签名才是本体
function format(input: string): string;
function format(input: number): string;
function format(input: string | number): string {  // 实现签名(不对外)
  if (typeof input === "string") return input.trim();
  return input.toFixed(2);
}
format(' hi ');   // ✅
format(3.14159);  // ✅
format(true);     // ❌ 匹配不到重载,编译报错

// 2. 重载签名对外可见、参与调用匹配;实现签名不对外可见
//    原因:实现签名的参数常故意放宽(string | number),若暴露,任何参数都能传,重载形同虚设
//    TS 还强制实现签名兼容所有重载签名

// 3. this 参数 = 参数表最前面的"假参数",给函数体的 this 标注类型
type User = { name: string; role: "user" | "admin" };
function isAdmin(this: User): this is User & { role: "admin" } {
  return this.role === "admin";
}
```

> 知识点已同步补充到 docs/javascript/typescript.md 的"函数重载与 this 类型"小节。

---

### 2.8 泛型约束与默认值

> 1. 泛型约束 `T extends object` 和 `T extends Record<string, any>` 的区别？
> 2. 泛型默认值怎么写？什么时候用？
> 3. 写一个 `deepMerge<T extends object, U extends object>(a: T, b: U)`，返回类型为 `T & U`，并解释为什么返回值用 `T & U` 而不是手写联合

**你的回答：**
1. Record是键值对类型，而object是对象类型，null/Function都是对象类型
2. 泛型后面接=默认值，比如 T=string
3. 不会写
```ts
// 在此作答

```

---

**批改（2026-09-07）：5.5/10**

> 评价：第 1 问有**硬错误**——"null 是对象类型"说反了。`typeof null === 'object'` 是 JS 运行时的历史遗留 bug，但 TS 类型层面 `null extends object` 为 **false**（已实测）。另有个重要区分：`interface`（无 index signature）**不满足** `Record<string, any>`，普通对象字面量类型满足——这正是 2.6 EventEmitter 报 TS2344 的根因。第 2 问对（补充：TS 只允许靠后的泛型带默认值）。第 3 问没写，补在下面。

**参考答案**：

```ts
// 1. object:只要"非原始值"即可(函数/数组也算),是宽泛大框
//    Record<string, any>:要求有字符串索引签名,能 obj[key] 当字典用
//    → interface 类型无 index signature,不属于 Record<string, any>
//    → null / undefined 两者都不属于(注意和 typeof null === 'object' 区分)

// 2. 泛型默认值(只能给靠后的参数)
function createPair<A = string, B = number>(a: A, b: B): [A, B] {
  return [a, b];
}

// 3. deepMerge:返回交叉类型 T & U
function deepMerge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}
// 为什么用 T & U 而不是手写联合:
// ① 语义:T | U 是"二选一",合并结果要求两个对象的属性同时存在 → 交叉 &
// ② 手写不出来:T、U 是未知类型,合并后的键组合只能让编译器用 & 现算
```

---

## 三、类型体操篇（6 题）

### 3.1 深度工具类型

> 手写 `DeepPartial<T>` 和 `DeepRequired<T>`（递归），并说明与 `Partial`/`Required` 的区别：

**你的回答：**
区别在于`DeepPartial<T>` 和 `DeepRequired<T>`函数会深度处理内层对象，而`Partial`/`Required`只处理首层的内容
```ts
// 在此作答
type DeepPartial<T extends object> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

type DeepRequired<T extends object> = { [K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K] }

```

**批注（2026-09-08）**

> ✅ `DeepPartial` 正确——"值还是对象就递归"的思路对。
> ❌ `DeepRequired` 的递归分支**抄成了 `DeepPartial`**(实测 `DeepRequired<{a:{b:number}}>` 得到 `{a:{b?:number}}`,内层又变可选了)。应自递归：
>
> ```ts
> type DeepRequired<T extends object> = { [K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K] };
> ```
>
> 另注意边界：数组、函数也满足 `extends object`，会被递归展开成对象结构；若数据里含 Date 等实例，通常要先排除数组(`T[K] extends any[]` 提前返回)。区别说明本身到位，可补一句"浅层只改第一层、深层对嵌套对象继续递归"。

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
type Get<T, Path> = Path extends `${infer PHead}.${infer PTail}` ? Get<T[PHead], Ptail> : T[Path]

```

**批注（2026-09-08）**

> 拆点递归的思路对，但三处硬伤会导致编译失败：
> 1. `Ptail` 拼写与声明 `PTail` 不一致(小写 t)
> 2. `Path` 无约束且未检查 `extends keyof T`，`T[Path]` 会报错
> 3. `T[PHead]` 前要确认 `PHead extends keyof T`
>
> 参考答案：
>
> ```ts
> type Get<T, Path extends string> =
>   Path extends `${infer Head}.${infer Tail}`
>     ? Head extends keyof T ? Get<T[Head], Tail> : never
>     : Path extends keyof T ? T[Path] : never;
> type R = Get<Obj, "user.profile.name">;  // string
> ```

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
type UnionToIntersection<T> = 不知道

```

**批注（2026-09-08）**

> 这是类型体操最经典的"分发 + 逆变"组合题。参考答案：
>
> ```ts
> type UnionToIntersection<U> =
>   (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
>
> // 推演 { a: string } | { b: number }:
> // ① U extends any ? ... : 强制触发分发,联合拆开
> // ② 每个成员被包成"参数类型是该成员"的函数 → (k:{a})=>void | (k:{b})=>void
> // ③ extends (k: infer I) => void:从"函数的联合"推断参数 I
> //    函数参数是逆变位置,多个候选取"能同时满足所有成员"的类型 → 交叉 {a} & {b}
> ```
>
> 关键点：`infer` 在**参数位(逆变)**从多个候选推断时取**交集**，在普通位置(如返回值)取**联合**——这正是 UnionToIntersection 靠"参数位"而不是"返回值位"的原因。

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
type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never
type TupleToUnion<T extends any[]> = T extends [infer F, ...infer R] ? F | TupleToUnion<R> : never
type Length<T extends readonly any[]> = 'length' in T ? T['length'] : never 
type Pop<T extends any[]> = T extends [...infer F, any] ? F : never

```

**批注（2026-09-08）**

> ✅ `First`、`Last` 正确；`TupleToUnion` 递归版正确(其实一行 `T[number]` 等价)。
> ❌ `Pop` 没写。
> ❌ `Length`：`'length' in T` 在类型层面是**语法错误**(实测 TS1005——类型没有 JS 的 in 表达式)。约束 `readonly any[]` 已经保证有 length，直接索引即可：
>
> ```ts
> type Pop<T extends any[]> = T extends [...infer Rest, any] ? Rest : never;
> type Length<T extends readonly any[]> = T["length"];   // 数字字面量
> type TupleToUnion<T extends any[]> = T[number];        // 等价一行版
> ```

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
type StringToUnion<S extends string> = S extends `${infer F}${infer Rest}` ? F | StringToUnion<Rest> : S
type Split<S extends string, D extends string> = S extends `${infer F}${D}${infer L}` ? [F, Split<L, D>] : S
type Space = ' ' | '\t' | '\n'
type Trim<S extends string> = S extends `${Space}${infer L}${Space}` ? Trim<L> : S

```

**批注（2026-09-08）**

> 三个问题(均实测)：
> 1. `StringToUnion` 的 else 应返回 `never` 而不是 `S`——拆到空串时模板不匹配，返回 `S=''` 会把**空串混进结果**(实测 `'ab'` 得到 `'a'|'b'|''`)
> 2. `Split` 两处：else 应返回 `[S]`(单元素元组)而非 `S`；递归段要展平 `...Split<...>`(实测你的输出是嵌套的 `['a',['b','c']]`)
> 3. `Trim` 的 `${Space}${L}${Space}` 要求**首尾同时**有空白——只有前导空格的 `'  a'` 匹配失败、原样返回(实测)。要先剥左边再剥右边
>
> 参考答案：
>
> ```ts
> type StringToUnion<S extends string> = S extends `${infer F}${infer R}` ? F | StringToUnion<R> : never;
>
> type Split<S extends string, D extends string> =
>   S extends `${infer F}${D}${infer R}` ? [F, ...Split<R, D>] : [S];
>
> type Space = " " | "\t" | "\n";
> type Trim<S extends string> =
>   S extends `${Space}${infer R}` ? Trim<R>
>   : S extends `${infer L}${Space}` ? Trim<L>
>   : S;
> ```

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
type ParseQueryString<T> = T extends `${infer K}=${infer V}${'&' | ''}${infer Rest}` ? { [K]: V, ...ParseQueryString<Rest> } : {} 
```

**批注（2026-09-08）**

> "拆一段再递归"的方向对，但类型世界有两个**硬语法错误**：
> 1. 类型对象**没有** `[K]: V` 的计算属性写法——K 是 infer 出的变量，类型里只能通过映射 `{ [P in K]: V }` 生成
> 2. 类型对象**不能 spread**——`...ParseQueryString<Rest>` 是 JS 运行时语法，类型层不存在
> 类型里的对象合并要用"映射类型条件合并"或 `&` 交叉。
>
> 参考答案(含同名键合并为联合)：
>
> ```ts
> type ParseOne<S extends string> = S extends `${infer K}=${infer V}` ? { [P in K]: V } : {};
> type Merge<A extends object, B extends object> = {
>   [K in keyof A | keyof B]:
>     K extends keyof A ? (K extends keyof B ? A[K] | B[K] : A[K]) : B[K];
> };
> type ParseQueryString<S extends string> =
>   S extends `${infer A}&${infer B}` ? Merge<ParseOne<A>, ParseQueryString<B>> : ParseOne<S>;
> type R = ParseQueryString<"a=1&b=2&c=3">;  // { a: "1"; b: "2"; c: "3" }
> ```
>
> 加分项(同名键合并成元组)的完整实现(全部用例实测通过)：
>
> ```ts
> // 思路:ParseOne 时每个值先包成单元素元组 [V],
> // Merge 同名键时把两边元组"拆开再拼",不同名键原样保留
> type ParseOne<S extends string> =
>   S extends `${infer K}=${infer V}` ? { [P in K]: [V] } : {};
>
> // 关键点:同名键合并时不能直接 [...A[K], ...B[K]] ——
> // 泛型索引访问在 spread 里会退化成 string[] 丢失字面量(实测 TS2574/结果变数组)。
> // 正确做法:先用 infer 把两边内容拆成元组再拼接,字面量才保留
> type Concat<A, B> =
>   A extends readonly [...infer AR]
>     ? (B extends readonly [...infer BR] ? [...AR, ...BR] : never)
>     : never;
>
> type Merge<A extends object, B extends object> = {
>   [K in keyof A | keyof B]:
>     K extends keyof A
>       ? (K extends keyof B ? Concat<A[K], B[K]> : A[K])
>       : (K extends keyof B ? B[K] : never);
> };
>
> type ParseQueryString<S extends string> =
>   S extends `${infer A}&${infer B}`
>     ? Merge<ParseOne<A>, ParseQueryString<B>>
>     : ParseOne<S>;
>
> type R1 = ParseQueryString<"a=1&a=2&b=3">;   // { a: ["1", "2"]; b: ["3"] }
> type R2 = ParseQueryString<"a=1&a=2&a=3">;   // { a: ["1", "2", "3"] }(三层同名也稳)
> type R3 = ParseQueryString<"a=1">;           // { a: ["1"] }
> ```
>
> 注：这个方案里所有键的值统一是元组(单键也是 `['1']`)。若想"单键保持裸值、只有重复键才变元组"，需要在 Merge 里判断某侧值是否已是元组再做不同处理，会复杂不少——面试中讲清"统一元组 + Concat 拆拼"这个思路即可。

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

---

**参考答案（2026-09-08）：4.1 Command 模式类型设计**

核心：用一张"命令名 → 参数元组"的映射表，让 `execute` 的 `name` 决定剩余参数的类型（注册表驱动推导）。

```ts
abstract class Command<Ctx> {
  abstract run(ctx: Ctx): void;
}

// 关键：命令名 → 参数元组。execute 靠它推导 args
type CommandArgs = {
  bold: [range: { from: number; to: number }];
  insertVar: [name: string];
  insertCondition: [target: string, value: unknown];
};

// 注册表：key = 命令名，value = 对应参数的构造函数
type Registry<Ctx> = {
  [K in keyof CommandArgs]: new (...args: CommandArgs[K]) => Command<Ctx>;
};

// 执行器：K 由 name 推断，args 自动精确到 CommandArgs[K]
function execute<Ctx, K extends keyof CommandArgs>(
  reg: Registry<Ctx>, ctx: Ctx, name: K, ...args: CommandArgs[K]
): void {
  new reg[name](...args).run(ctx);
}

type EditorCtx = { selection: { from: number; to: number } };
execute(reg, ctx, "bold", { from: 0, to: 5 });  // ✅
execute(reg, ctx, "bold", 42);                  // ❌ 参数不匹配,编译报错
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

---

**参考答案（2026-09-08）：4.2 API 响应类型**

```ts
// 1. 可辨识联合:code 是判别字段。错误分支的 code 必须是不含 0 的字面量联合
//    (写成 code: number 的话,0 也属于 number,code===0 判别会失效)
type ApiResponse<T> =
  | { code: 0; data: T }
  | { code: 4001 | 4030 | 5000; message: string };

// 2. request:泛型 T 由调用方指定;边界处断言一次(生产应加运行时校验,见 4.6)
async function request<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url);
  const json: unknown = await res.json();
  return json as ApiResponse<T>;
}

// 3. 收窄:判别字段一比较,TS 自动分支出 data / message
const r = await request<User[]>("/api/users");
if (r.code === 0) {
  r.data;     // ✅ User[]
} else {
  r.message;  // ✅ string
}
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

---

**参考答案（2026-09-08）：4.3 Zustand store 类型推导**

1. **为什么 `useStore((s) => s.count)` 是 number**：`create<T>(initializer: (set, get, api) => T)` 返回的 hook 是 selector 类型 `(selector: (state: T) => U) => U`。T 由 initializer 的**返回对象**推断（`count: 0` → `count: number`）；调用 `useStore((s) => s.count)` 时 U 按 selector 返回类型实例化为 `number`。

2. **set 参数为何能自动推导**：set 的类型来自 create 签名的上下文注解 `(partial: Partial<T> | ((state: T) => Partial<T>)) => void`。T 先由返回值推断出来，`set((s) => ({ count: s.count + 1 }))` 里 s 就是 T、返回 partial 会被检查键名与值类型。

3. **加中间件**：devtools 要求**柯里化** `create<T>()(devtools(...))`——先用空括号锁定 T，再由中间件包装，否则 T 无法正确推断。中间件类型上就是把 initializer `(set, get, api) => T` 包一层并装饰 set/get。

迷你原理(简化 create):

```ts
type SetState<T> = (partial: Partial<T> | ((s: T) => Partial<T>)) => void;
function create<T>(init: (set: SetState<T>, get: () => T) => T) {
  // 返回 { useStore: <U>(sel: (s: T) => U) => U; get: () => T }
  return null as any;
}
```

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

---

**参考答案（2026-09-08）：4.4 DFD Schema 派生类型**

两段：① 每个字段做"type → 值类型"的条件映射；② 用 `as` 重映射把字段数组变成"key → 值"对象。**前提是字段数组 `as const` 标注**，否则 key/type 会被拓宽。

```ts
interface FieldDefBase {
  key: string; label: string;
  type: "text" | "number" | "date" | "enum";
  options?: string[];
  required?: boolean;   // 第 2 问的扩展字段
}

// 1) type → 值类型
type FieldValue<F extends FieldDefBase> =
  F["type"] extends "text" ? string
  : F["type"] extends "number" ? number
  : F["type"] extends "date" ? string
  : F extends { options: (infer O)[] } ? O   // enum → 选项联合
  : never;

// 2) 数组 → 表单值对象;required: true → 必填(不含 undefined),否则联合 undefined
type FormValues<T extends readonly FieldDefBase[]> = {
  [K in T[number] as K["key"]]:
    K extends { required: true } ? FieldValue<K> : FieldValue<K> | undefined;
};

declare const fields: [
  { key: "amount"; label: string; type: "number"; required: true },
  { key: "status"; label: string; type: "enum"; options: ["a", "b"]; required: false },
  { key: "note"; label: string; type: "text" }
];
type V = FormValues<typeof fields>;
const v: V = { amount: 5, status: "a", note: undefined };
```

> 若字段运行时来自后端 JSON（无法 as const），字面量推导不可行——退而手写 Record 或引入 zod 的 z.infer（呼应 4.6）。

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

---

**参考答案（2026-09-08）：4.5 事件系统类型**

同 2.6 思路：`on/off/emit` 泛型 K 把事件名与载荷绑定；Map 内部存 `(data: E[keyof E]) => void`，存/取两端用一次 `as` 桥接（断言合理点）。补了 off：

```ts
class TypedEmitter<E extends object> {
  private handlers = new Map<keyof E, Set<(data: E[keyof E]) => void>>();

  on<K extends keyof E>(event: K, handler: (data: E[K]) => void): void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as (data: E[keyof E]) => void);
    this.handlers.set(event, set);
  }
  off<K extends keyof E>(event: K, handler: (data: E[K]) => void): void {
    this.handlers.get(event)?.delete(handler as (data: E[keyof E]) => void);
  }
  emit<K extends keyof E>(event: K, data: E[K]): void {
    this.handlers.get(event)?.forEach(h => (h as (d: E[K]) => void)(data));
  }
}

const em = new TypedEmitter<{ msg: { id: number; content: string }; status: "online" | "offline" }>();
em.on("msg", (d) => d.id);                  // d: { id: number; content: string }
em.emit("msg", { id: 1, content: "hi" });   // ✅
em.emit("status", 42);                      // ❌ 载荷不对,编译报错
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

---

**参考答案（2026-09-08）：4.6 运行时校验**

```ts
type ChatMessage = { role: "user" | "assistant"; content: string };

function isChatMessage(data: unknown): data is ChatMessage {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;   // 收窄后按字典访问
  return (d.role === "user" || d.role === "assistant")
    && typeof d.content === "string";
}

declare const raw: unknown;
if (isChatMessage(raw)) {
  raw.content.toUpperCase();   // ✅ 守卫通过即收窄
}
```

2. **为什么先 `as ChatMessage` 再用是错的**：`as` 只骗编译器、运行时零校验。LLM JSON 可能 role 缺失、content 是数字、整体 null/数组——断言后访问要么抛错要么 undefined 污染下游。守卫是"校验 + 收窄"一体，不过就走 else。

3. **zod**：手写守卫嵌套复杂时易漏难维护。zod 用 schema 描述结构、parse 做运行时校验、`z.infer` 推导类型，schema 是唯一真源。LLM 输出、第三方 API、上传等"不可信边界"值得引入；项目可信边界通常就几个，不必到处用。

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

---

**参考答案（2026-09-08）：4.7 状态机**

可辨识联合 + 转移白名单：状态数据由联合成员天然携带；非法转移被 `T extends Allowed[S["status"]]` 挡在编译期。

```ts
type TaskState =
  | { status: "pending" }
  | { status: "running"; progress: number }
  | { status: "success"; result: unknown }
  | { status: "failed"; error: string }
  | { status: "cancelled" };

// 转移白名单:pending 只能去 running/cancelled;终态哪都不能去
type Allowed = {
  pending: Extract<TaskState, { status: "running" | "cancelled" }>;
  running: Extract<TaskState, { status: "success" | "failed" | "cancelled" }>;
  success: never; failed: never; cancelled: never;
};

function move<S extends TaskState, T extends Allowed[S["status"]]>(state: S, next: T): T {
  return next;
}

const p: TaskState = { status: "pending" };
const r = move(p, { status: "running", progress: 10 });   // ✅
move(p, { status: "success" });                            // ❌ 编译报错:pending 不能直达 success
move(r, { status: "failed", error: "boom" });              // ✅ 且 error 必填
```

> 附带数据由联合成员保证：切 running 必须给 progress、切 failed 必须给 error。

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

---

**参考答案（2026-09-08）：5.1 tsconfig 关键配置**

- `strict: true`：严格模式**总开关**，等价于打开 strictNullChecks / noImplicitAny / strictFunctionTypes / strictBindCallApply / strictPropertyInitialization / noImplicitThis / alwaysStrict / useUnknownInCatchVariables 等。新项目直接开，单项配置是历史项目渐进开启或单独关某项用的。
- `strictNullChecks`：null/undefined 不再能赋给任意类型（在 strict 内）——空指针 bug 的源头。
- `noImplicitAny`：类型推不出时禁止悄悄变 any（在 strict 内）。
- `noUnusedLocals`：未使用变量报错（**不在** strict 内）。
- `noUncheckedIndexedAccess`：索引访问自动加 undefined，`arr[0]` 变 `string | undefined`（**不在** strict 内，属激进严格，更安全但更啰嗦）。
- `moduleResolution: "bundler"`：面向 Vite/webpack/esbuild 的解析，支持不带扩展名、支持 package exports。
- `paths`：别名 `@/* → ./src/*`；只影响 TS 解析，**打包器还要单独配 alias**。

**严格标配**：`strict: true` + `noUnusedLocals`；再加 `noUncheckedIndexedAccess` 是激进版。

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

---

**参考答案（2026-09-08）：5.2 声明文件**

1. 建 `types/old-lib.d.ts` 写 `declare module 'old-lib';` 先编译过（整体 any），随后只补用到的导出，逐步细化。

```ts
declare module 'old-lib';            // 先"存在即可,any"
declare module 'old-lib' {           // 用到的再补
  export function parse(input: string): Record<string, unknown>;
  export const version: string;
}
```

2. `declare module 'old-lib'` 是给模块 import 声明形状（可多个块）；完整 `.d.ts` 是自己库入口声明或完整导出描述（index.d.ts + package types）。前者是临时 shim，后者是完整 API——目标是后者。

3. `declare global`：扩展全局（window 挂属性等）。**文件必须含 import/export（是模块）才生效**，结尾加 `export {};`。

```ts
declare global {
  interface Window { __APP_VERSION__?: string; }
}
export {};
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

---

**参考答案（2026-09-08）：5.3 any / unknown / never**

1. **场景**：
   - `any`：关闭检查。只用于 JS 互操作边界、渐进迁移临时态；不主动写。
   - `unknown`：外部输入安全根类型（JSON.parse、LLM 返回），任何值可赋入，**用前必须收窄**。
   - `never`：永不存在的值（必抛函数返回、空数组、Exclude 淘汰成员、穷尽检查）。

2. **any vs unknown（可赋值方向）**：

```ts
let a: any; let u: unknown; let s: string;
s = a;   // ✅ any 可赋给任何类型
s = u;   // ❌ unknown 必须先收窄才能赋给 string
```

any 双向放行 = 关检查；unknown 只进不出 = 安全 any。

3. **never 推导 + 穷尽检查**：

```ts
function boom(): never { throw new Error(); }

function assertNever(x: never): never { throw new Error("unexpected: " + x); }

type Shape = { kind: "circle" } | { kind: "square" };
function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return 1;
    case "square": return 2;
    default: return assertNever(s);   // 未来新增 kind 忘写 case → 这里报错提醒
  }
}
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

---

**参考答案（2026-09-08）：5.4 常见类型错误解读**

1. **`Property 'name' does not exist on type '{}'`**：`const obj = {}` 推断成无属性的空对象类型，加属性报错。方案：声明即带属性，或 `const obj: Record<string, unknown> = {}` / `{ name?: string }`。

2. **`Type 'string' is not assignable to type 'never'`**：多出现在穷尽检查的 default/else——case 全收窄完剩余已 never，却还想用 string。方案：default 直接 `assertNever(x)`；真需要 string 说明联合类型设计有缺口。

3. **excess property check**：`const u: User = { name:'x', age: 18 }` 多余属性。TS 对**对象字面量**多做一次键名检查（防拼错，如 `naem`）。方案：删多余键或扩展类型；从变量赋值不查（`const o = {...}; const u: User = o;` ✅）——所以 lint 会提示别用中间变量绕过。

4. **`'x' is possibly 'undefined'`（noUncheckedIndexedAccess）**：`arr[0]` 变 `string | undefined`。方案：先取出 `const first = arr[0]; if (first)` 收窄 / `arr[0] ?? ""` 兜底 / 确信非空才 `!`。

---

### 5.5 JS → TS 渐进迁移

> 你的简历提到做过 JS + Vue 到 TS + React 的迁移。请回答：
> 1. 渐进迁移的关键配置是什么？（allowJs、checkJs、strict 的开启顺序）
> 2. 迁移时优先给哪些文件加类型？（公共接口、数据层 vs UI 层）
> 3. 存量 JS 文件怎么控制风险？（@ts-ignore 的规范使用、any 的临时策略、专项债）

**你的回答：**



---

---

**参考答案（2026-09-08）：5.5 JS → TS 渐进迁移**

1. **配置顺序（由松到紧）**：`allowJs: true` 先让 js/ts 共存 → `checkJs: true` 开始查 JS（配合 `// @ts-check`/`// @ts-nocheck` 按文件控制）→ 最后才开 `strict`（或分项开，先 strictNullChecks 再 noImplicitAny）。**能编译 > 有类型 > 严格**。

2. **优先级从接口边界向内**：① 对外类型边界（API DTO、配置、事件载荷、store）——被消费最多收益最大；② 公共工具与数据层；③ UI 层最后（props 可先 any 后补）。从"被依赖最多"的自底向上，让上层立即享受类型。

3. **存量 JS 风险控制**：
   - `@ts-ignore` 必须 lint 约束（ban-ts-comment + 要求带理由），禁止裸奔。
   - 新代码 eslint `no-explicit-any` 禁止 any；存量 any 集中登记。
   - 建"类型债"专项，按文件/模块每迭代清一批，量化进度。
   - 迁移文件**整文件达标**，不接受半吊子中间态。

---

## 附：自检清单

- [ ] 基础篇是否全部能不看资料答出？
- [ ] 进阶篇的每个工具类型能否独立默写？
- [ ] 类型体操篇 6 题是否理解"为什么这样写"而不是背答案？
- [ ] 实战篇是否都结合了自己的项目场景？
- [ ] 遇到不会的类型错误，是否知道报错信息的含义？

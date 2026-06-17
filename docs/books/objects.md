## 对象

#### 类型

string、number、undefined、boolean、null、symbol、object

其中object就是对象，是一种复杂基本类型

#### 对象的子类型：数组和函数

#### 对象组成

1. 对象由键值对组成，属性名永远是字符串(数组下标除外，是大于-1的整数)
2. es6新增可计算的属性名，中括号[]和变量组成，如[prefix + 'bar']
3. 属性值可以是一个函数或者非函数

注意：当属性值为一个函数的时候，函数和对象仍然只是间接关系，只是将函数的this动态绑定到对象上而已，并不能称之为"方法"

#### 对象的复制：浅复制和深复制

浅复制：复制对象的引用

深复制：递归遍历对象所有简单基本类型的属性，并复制它们

相关方法：Object.assign、JSON序列化、递归遍历...

#### 属性描述符(数据描述符)

value：any  属性的值

writable：boolean  是否可写

enumberable：boolean  是否可枚举(for...in操作无法遍历到)  propertyIsEnumberable()进行判断

configurable：boolean  是否可配置(此操作不可逆，一旦设置为false将无法再设置回true，例外=>writable可由false设置为true ；无法修改可删除属性)

#### 不可变

1. 对象常量：writable和configurable都设置为false
2. 禁止扩展：Object.preventExtentions()
3. 密封：Object.seal()  实际上调用Object.preventExtentions()以及将configurable设置false
4. 冻结：Object.freeze()  实际上调用Object.seal()以及设置writable为false

#### [[Get]]和[[Put]]操作

[[Get]]：语言规范中，myObject.a实际上是实现了[[Get]]操作，该操作会在该对象查找是否有a属性，若未找到则遍历整个原型链，若仍然未找到则返回undefined，获取属性的值时会先检查访问描述符getter是否存在，存在则调用getter，否则直接返回属性的值

[[Put]]：属性赋值操作，大致会检查如下内容：

1. 检查属性是否是访问描述符，若是且存在setter，则调用setter
2. 属性的描述符中writable是否为false，若是则在非严格模式下静默赋值失败，严格模式抛出TypeError错误
3. 如果都不是，正常赋值

#### Getter&Setter(访问描述符)

当属性被定义getter、setter或者二者都有时，这个属性被定义为"访问描述符"，相对"数据描述符"，此时javascript会忽略value和writable，只关心get和set

#### 存在性以及遍历

in：in操作符会检查对象本身以及原型链的属性

hasOwnProperty：只会检查对象本身(使用时，考虑到hasOwnProperty是prototype属性，而通过Object.create(null)创建的对象无prototype，所以建议这样使用：Object.prototype.hasOwnProperty.call(myObject,[property]))

|                           | 是否查找原型链 |
| ------------------------- | -------------- |
| in操作符                  | 是             |
| hasOwnProperty            | 否             |
| Object.keys() && for...in | 否             |

|                       | 是否只查找可枚举属性 |
| --------------------- | -------------------- |
| Object.keys()         | 是                   |
| getOwnPropertyNames() | 否                   |
| for...in              | 是                   |

for...in：遍历对象无法直接获取属性值，需要手动获取

for...of：首先请求迭代器对象，自动遍历迭代器，数组有迭代器对象，对象没有，不过可以自定义
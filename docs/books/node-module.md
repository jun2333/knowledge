## Node模块机制

node模块实现主要基于commonjs模块机制

主要过程是：

1. 路径分析
2. 文件定位
3. 编译、执行

nodejs模块分为三类：

1. 核心模块：js模块 & c++内建模块
2. 文件模块：js模块 & c++模块
3. 自定义模块：依赖模块(node_modules)

#### 文件模块

通常传入绝对或者相对路径引入文件模块，此过程会分析路径、文件定位、编译执行；js模块直接在node环境编译执行，若是.node(c++编写)的文件模块需要调用dlopen直接调用(不需要编译即可调用)，因此.node模块会比js模块更快、更高效

#### 核心模块

核心模块无需进行路径分析和文件定位，直接进行编译执行即可；最底层的是c++内建模块，js核心模块实质上是对底层模块进行封装，调用过程会顺着调用栈到底层

#### 自定义模块

通常指外部依赖，require(模块名)之后

1. node会检查当前目录是否存在node_modules目录，若不存在则进入上层目录查找(路径分析)
2. 找到模块目录之后，检查是否存在package.json文件，分析package.json文件取其入口文件main定义的值；若无package,json则检查是否存在index(按照.js、.node、.json顺序匹配)，因此若文件后缀非.js建议不省略后缀
3. .js文件直接编译执行js代码；.node文件直接调用dlopen(动态加载)；.json文件则执行JSON.parse后将对象引入

#### 包(模块)管理工具：npm

#### 三种现代模块机制：commonJs、CMD、AMD

##### commonJs：

使用require和module.exports进行引入和导出模块，一个文件代表一个模块，所有文件执行在一个闭包函数执行，参数传require、exports(只是module.exports的一个引用，重新赋值会导致失败)、module等

##### AMD：

requireJs框架的模块机制，采取依赖前置，回调函数异步定义模块，如：`require([dep1,dep2...], function(){...return {}})`

##### CMD：

seaJs提出的模块机制，定义模块同步执行，将require、exports、module传入，需要依赖时就近require

#### 未来模块机制：ES6的import/export

import引入的模块在编译过程中已经存储在内存中，并以一个**引用**提供给用户(无法更改)，其加载速度和效率高于其他模块机制


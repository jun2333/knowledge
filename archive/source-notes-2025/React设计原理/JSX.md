## jsx
**实质上是React.createElement函数的语法糖，从描述逻辑出发，扩展UI的描述**
在编译过程通过babel插件，转译成React.createElemnt函数

在v17以前，需要手动import React，否则会报错；v17以后babel已经自动帮我们引入React库了

### 安全性
jsx是安全的，在转译过程中会将所有显示到DOM字符串或者实体进行转义，防止xss攻击
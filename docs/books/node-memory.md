## Node内存管理

#### 堆内存大小

堆内存在64位系统下最大1.4G，32位系统下最大0.7G，可通过`process.memoryUsage()`查看内存使用情况

在node运行时可以通过`node --max-old-space-size=xxx test.js`或者`node --max-new-space-size=xxx test.js`（单位为MB）调整内存

#### 垃圾回收机制

##### 新生代：操作存活的变量

切尼算法

将内存分为两部分：from和to 内存分配首先使用from  回收过程中将from中**存活的变量**移动到to中，再将from和to交换

满足两个条件则会转移到老生代:

1. 已经经历一次垃圾回收还存活
2. 移动到to前，to中内存超25%

##### 老生代：操作死亡的变量

mark-sweep：遍历堆中变量，标记存活变量，清除死亡变量

mark-compact：将内存碎片整合

优化：增量mark-sweep、增量mark-compact

#### 堆外内存(Buffer Array)：不受v8内存限制

#### 避免内存泄漏

1. 注意全局变量
2. 注意闭包使用
3. 及时回收变量内存
4. 慎用内存缓存
5. 队列供大于求

#### 监控定位内存泄漏情况

node-heapdump/node-memwatch的使用
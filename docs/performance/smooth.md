## 如何让网页更丝滑

#### Rail指标

Response:100ms

Animation:16.7ms

Idle:50ms

Load:1000ms

#### 交互类型：主动/被动

主动：键盘、鼠标等用户交互

被动：动画、long task

js是单线程，要想用户交互流畅，必须保证主动交互优先于被动交互

#### Web Worker/Time Slicing解决long task问题

#### 像素管道

javascript > style > layout > paint > composite

#### 使用高性能css选择器加速style计算

#### 避免布局抖动

js在改变样式的时候，切记不要在此之前添加获取样式的语句，避免layout前置造成布局抖动

#### 合成代替绘制

通过开启图层，让浏览器采取合成方式进行display

`trasform:translateZ(0)`

#### 避免丢帧，使用requestAnimationFrame代替setInterval(fn, 16)


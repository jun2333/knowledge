## web性能优化

主要包括：度量标准、编码优化、静态资源优化、交付优化、构建优化、性能监控这几部分

<img src="https://camo.githubusercontent.com/4d503a236c1a91a7e133c03b9f0c4cfabe8d47dd9818720de2f1f12a46683d17/68747470733a2f2f70302e73736c2e7168696d672e636f6d2f743031613331376236336663366237643530312e706e67" alt="优化分类"  />

#### 度量标准

##### 一些常见指标

- FMP(first meaningful paint)：首次有效绘制
- TTI(time to interactive)：可交互时间
- 输入响应：界面响应用户需要的时间
- 感知速度指数：视觉上的加载速度
- 自定义指标...

##### 目标：

- 100ms的响应时间与60fps
- 速度指标小于1250ms
- 3g网络下可交互事件小于5s
- 重要文件大小预算小于170k

#### 编码优化

##### 数据读取：

1. 字面量与局部变量读取访问速度最快，数组和对象成员访问速度较慢

2. 局部变量读取速度快于全局变量，作用域链搜索路径越长，速度越慢

3. 对象嵌套越深，读取速度越慢

##### DOM操作：

1. 减少dom访问和操作次数，多用变量缓存dom数据
2. 重排重绘代价非常昂贵，尽量减少次数，如果非要多次重排重绘，建议先脱离文档流，后面再回归文档流
3. 善于利用事件代理

##### 流程控制：

1. 减少迭代次数
2. 基于循环的迭代代替基于函数迭代
3. 使用Map代替大量if...else或者switch

#### 静态资源优化

##### 文本压缩：采用Brotli和Zopfli进行压缩

##### 图片优化：

- 使用高压缩率的webp格式图片
- 响应式图片picture
- 自动播放的视频代替gif，因为视频比gif还小

#### 交付优化

1. 异步加载js

2. 懒加载资源(Intersection Observer)

3. 优先加载关键css

4. 资源提示

   dns-prefetch

   preconnect

   prefetch

   prerender

5. PreLoad预加载资源，将高优先级资源预加载不阻塞渲染

```html
<!-- 通过声明性标记预加载 CSS 资源 -->
<link rel="preload" href="/styles/other.css" as="style">

<!-- 或，通过JavaScript预加载 CSS 资源 -->
<script>
var res = document.createElement("link");
res.rel = "preload";
res.as = "style";
res.href = "styles/other.css";
document.head.appendChild(res);
</script>
```

6. 快速响应用户输入

   避免js任务执行时间超过100ms，对于执行时间比较长的称之为long task，我们可以采用time slicing 或者web worker的方式保证任务不阻塞交互

#### 构建优化

1. 使用预编译，如vue中，单文件组件会被预编译成渲染函数，代码执行时可以直接执行渲染函数
2. 使用tree-shaking、scope-hoisting、code-spliting
3. 使用ssr服务器渲染
4. 使用import函数动态导入模块
5. 使用http缓存头

#### 其他

1. 升级http2
2. 使用付费的高级cdn
3. 字体优化
4. ...

#### 性能监控

最后我们需要使用工具监控网站性能

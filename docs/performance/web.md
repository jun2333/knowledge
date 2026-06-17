# web性能优化

主要包括三部分：
1. 度量标准
2. 优化手段
编码优化、静态资源优化、交付优化、构建优化
3. 性能监控

## 度量标准

#### 一些常见指标以及目标

- LCP 0-2500
- TTI(time to interactive)：可交互时间 0-3800 /TBT: 总阻塞时间
- FID首次输入延迟 0-100
- 动画保证60fps

## 优化手段

### 静态资源优化

#### 文本压缩：采用Brotli和Zopfli进行压缩

#### 图片优化：

- 使用高压缩率的webp格式图片
- 响应式图片picture
- 自动播放的视频代替gif，因为视频比gif还小

### 交付优化

1. 异步加载js

2. 懒加载资源(Intersection Observer)

3. 优先加载关键css

4. 资源提示

   dns-prefetch

   preconnect

   prefetch

   prerender

5. preLoad预加载资源，将高优先级资源预加载不阻塞渲染

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

### 构建优化

1. 使用预编译，如vue中，单文件组件会被预编译成渲染函数，代码执行时可以直接执行渲染函数
2. 使用tree-shaking、scope-hoisting、code-spliting
3. 使用ssr服务器渲染
4. 使用import函数动态导入模块
5. 使用http缓存头

### 其他

1. 升级http2
2. 使用付费的高级cdn
3. 字体优化
4. 离线方案
PWA(渐进式web应用)方案
优点：
省去建立tcp的连接时长，加快首屏加载速度
减少静态资源服务器的负载
缺点：
数据不一致问题(更新策略)
代码维护成本(缓存文件)


### 编码优化

#### 数据读取：

1. 字面量与局部变量读取访问速度最快，数组和对象成员访问速度较慢

2. 局部变量读取速度快于全局变量，作用域链搜索路径越长，速度越慢

3. 对象嵌套越深，读取速度越慢

#### DOM操作：

1. 减少dom访问和操作次数，多用变量缓存dom数据
2. 重排重绘代价非常昂贵，尽量减少次数，如果非要多次重排重绘，建议先脱离文档流，后面再回归文档流
3. 善于利用事件代理
4. 避免dom过多，长列表使用虚拟列表或者content-visibility优化

#### 流程控制：

1. 减少迭代次数
2. 基于循环的迭代代替基于函数迭代
3. 使用Map代替大量if...else或者switch


## 性能监控

最后我们需要使用工具监控网站性能

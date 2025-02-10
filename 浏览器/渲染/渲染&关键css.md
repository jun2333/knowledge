## 工作流程
1. 解析DOM，生成DOM tree
2. 如果遇到 CSS（内联或者外链）则开始创建 CSSOM
3. 以上两个过程如果遇到非异步的js则会被阻塞(这样设计的原因是js可能改变dom或者css)
4. dom tree和CSSOM合成Layout Tree
5. Layout
6. Paint

### 两个阻塞
1. js阻塞dom解析
2. css阻塞dom渲染

大家都尽可能优化拆分js资源，却往往忽略了css的重要性，页面会将css完全解析完才进入到渲染展示阶段

因此我们需要关注关键路径中的css资源

### 拆分css
按设备屏幕尺寸拆分，给link标签添加媒体查询属性，限定特定场景加载特定css资源
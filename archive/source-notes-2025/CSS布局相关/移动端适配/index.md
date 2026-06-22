## 前置知识
像素px:构成屏幕的最小单位，可以理解成一个小方块

屏幕分辨率:表达屏幕需要多少个像素构成，单位px

逻辑像素:
与设备无关的逻辑像素，代表可以用程序控制的虚拟像素

物理像素(设备像素):
与设备有关，在同一个设备上，他的物理像素是固定的，也就是厂家在生产显示设备时就决定的实际点的个数

ppi:
ppi（pixel per inch) 表示每英寸所包含的像素点数目，数值越高，说明屏幕能以更高密度显示图像。

设备像素比dpr=物理像素/逻辑像素: window.devicePixelRatio

视口：
1. 布局视口：这种视口可以通过<meta>标签设置viewport来改变
2. 视觉视口: 顾名思义，视觉上看到的范围
3. 理想视口：缩放比例为100%时，理想视口=视觉视口

meta viewport: 可以配置视口大小，缩放比例，初始值等参数

适配：为了获得更好的视觉体验，尽量配置布局视口与视觉视口、理想视口一致。

## 移动端适配方案
### rem适配(flexible方案)
rem（font size of the root element）是CSS3新增的一个相对单位，是指相对于根元素的字体大小的单位
根据不同的设备尺寸，通过js脚本动态设置根元素的字体大小，例如：
rootElement的fonsize设置成视口宽度/10，这样每1rem代表一等份，监听window的resize事件，触发之后更新根元素的fontsize

配合预处理器less/scss等工具自动转换单位，避免自行计算
最早提出rem适配方案的是阿里的flexible，主要是针对苹果提出的viewport方案兼容性不佳才产生的适配方案，后面兼容性问题解决了阿里官方也不提倡使用这样的方案了，建议使用viewport方案

### vw/vh适配
vw（Viewport Width）、vh(Viewport Height)是基于视图窗口的单位，是css3中提出来的，基于视图窗口的单位。
vh、vw方案即将视觉视口宽度 window.innerWidth和视觉视口高度 window.innerHeight 等分为 100 份。
计算同样可以交给css预处理器

### viewport+px适配
我们再来说一种flexible团队推荐的viewport方案。这种方案可以让我们在开发时不用关注设备屏幕尺寸的差异，直接按照设计稿上的标注进行开发，也无需单位的换算，直接用px
在 HTML 的 head 标签里加入 <meta name="viewport" content="width={设计稿宽度}, initial-scale={屏幕逻辑像素宽度/设计稿宽度}" >

## 1px边框问题
在设备像素比大于1的设备中，往往1px的边框实际效果会粗一些
解决方案：
1. 伪元素设置1px边框，长宽为目标元素2倍，然后利用transform缩小为0.5
2. viewport+rem配合使用，viewport根据设备像素比进行缩放处理，其他布局单位用rem适配
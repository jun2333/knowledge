## MPA VS SPA
MPA就是传统的多页面应用，服务器会给出完整的html页面，每次切换页面会重新请求服务器，因此无路由概念
SPA是服务器给到空页面+脚本+静态资源，让客户端自行构建页面，切换页面的时候可以达到不刷新页面局部更新，交互体验更好，但首屏响应和SEO略差
结合使用场景：
SSR和CSR同构场景下虽然既能享受到SSR的首屏+SEO又能享受到SPA带来的交互体验，但是由于首次访问仍然需要下载全量的js bundle，以及全量的hydrate，导致用户的TTI并没有提升,由于服务器响应速度的原因甚至还不如SPA呢。
因此，能否局部hydrate呢？将需要交互的部分和不需要交互的部分区分开来？

## Island架构
将需要交互的动态组件和不需要交互的静态组件区分开来，让静态组件不参与到hydration过程，大大提高hydration的速度。因此需要交互的动态组件就像一座孤岛(island)，因此被称为Islands架构。

## Islands实践
### Astro
在Astro中默认都是静态组件，需要加上特定的标识声明是island组件
Astro 除了支持本身 Astro 语法之外，也支持 Vue、React 等框架，可以通过插件的方式来导入。在构建的时候，Astro 只会打包并注入 Islands 组件的代码，并且在浏览器渲染，分别调用不同框架 (Vue、React) 的渲染函数完成各个 Islands 组件的 hydrate 过程。Astro 是典型的 MPA 方案，不支持引入 SPA 的路由和状态管理。

Astro 的主要优势包括如下几点:
1. Islands 架构，解决传统 SSR/SSG 框架的全量 hydration 问题，做到尽可能少的 Client 端 JS 的开销，甚至是 0 JS。
2. 学习成本低。.astro 语法和传统的 .jsx 和 .vue 非常相似，对于新手前端来说也比较容易掌握。
3. 使用灵活。对于页面的开发，你既可以使用官方的.astro 语法，也同样可以使用 .md、.vue、.jsx 语法，也就是说，你可以自由选择其它前端框架的语法来开发，甚至可以在一个项目中同时写 Vue 组件和 React 组件！
4. 构建迅速。底层构建体系基于 Vite 以及 Esbuild 实现，项目启动速度非常快。

对比React Selection Hydration:
1. Astro做到与框架无关，更通用
2. React Selection Hydration仍然需要全量下载运行js bundle；而Astro只需要加载运行部分的js代码
3. 从服务端和客户端的交互来看， Selection Hydration 严重依赖于流式(Streaming)渲染，服务端需要加上 transfer-encoding: chunked 的响应头，而 Partial Hydration 没有这个限制

## Islands架构优缺点
优点:
1. 在传统SSR的优势下，也能减少TTI时间，提高用户体验
2. 真正做到关键内容优先
3. 基于组件，该架构具备基于组件架构的所有优点
缺点:
1. 可使用的框架较少，且生态待完善
2. 不适合大量需要复杂交互的应用
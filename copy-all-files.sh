#!/bin/bash
# 批量复制所有现有Markdown文件到docs目录

echo "开始复制文件..."

# React (24个文件)
cp "React设计原理/React理念/React理念.md" docs/react/concept.md
cp "React设计原理/React理念/前端框架概览.md" docs/react/framework-overview.md

cp "React设计原理/Hooks/FC组件与Hook.md" docs/react/fc-hook.md
cp "React设计原理/Hooks/Hooks用法总结.md" docs/react/hooks-summary.md
cp "React设计原理/Hooks/自定义hook案例.md" docs/react/custom-hooks.md

cp "React设计原理/Renderer/Reconciler.md" docs/react/reconciler.md
cp "React设计原理/Renderer/reconcile算法(Diff).md" docs/react/reconcile-algorithm.md
cp "React设计原理/Renderer/Commit.md" docs/react/commit.md
cp "React设计原理/Renderer/状态更新流程.md" docs/react/state-update.md
cp "React设计原理/Renderer/性能优化.md" docs/react/performance.md

cp "React设计原理/Scheduler/Scheduler.md" docs/react/scheduler.md
cp "React设计原理/Scheduler/React优先级.md" docs/react/priority.md
cp "React设计原理/Scheduler/BatchedUpdate.md" docs/react/batched-update.md

cp "React设计原理/Context.md" docs/react/context.md
cp "React设计原理/JSX.md" docs/react/jsx.md
cp "React设计原理/State.md" docs/react/state.md
cp "React设计原理/Ref.md" docs/react/ref.md
cp "React设计原理/逻辑复用.md" docs/react/logic-reuse.md
cp "React设计原理/错误处理.md" docs/react/error-handling.md
cp "React设计原理/CSS模块化.md" docs/react/css-modules.md
cp "React设计原理/新版本内容.md" docs/react/new-features.md

cp "React设计原理/生命周期/React生命周期.md" docs/react/lifecycle.md
cp "React设计原理/事件系统/事件系统.md" docs/react/event-system.md

cp "React设计原理/Router/Router.md" docs/react/router.md

cp "React设计原理/渲染优化实践/渲染优化.md" docs/react/render-optimization.md
cp "React设计原理/渲染优化实践/异步渲染.md" docs/react/async-render.md

echo "✅ React 文件复制完成 (26个)"

# 浏览器 (11个文件,排除空文件)
cp "浏览器/总览.md" docs/browser/overview.md
cp "浏览器/DNS域名系统.md" docs/browser/dns.md
cp "浏览器/http相关/http协议的前世今生.md" docs/browser/http-history.md
cp "浏览器/http相关/TCP协议.md" docs/browser/tcp.md
cp "浏览器/http相关/http method相关.md" docs/browser/http-methods.md
cp "浏览器/http相关/https.md" docs/browser/https.md
cp "浏览器/websocket/websocket.md" docs/browser/websocket.md
cp "浏览器/存储与缓存/存储与缓存.md" docs/browser/storage-cache.md
cp "浏览器/渲染/css优化渲染.md" docs/browser/css-rendering.md
cp "浏览器/渲染/渲染&关键css.md" docs/browser/critical-css.md
cp "浏览器/渲染/html-parser/toy-browser/readme.md" docs/browser/toy-browser.md
cp "浏览器/浏览器兼容性解决方案.md" docs/browser/compatibility.md

echo "✅ 浏览器 文件复制完成 (12个)"

# CSS (7个文件)
cp "CSS布局相关/BFC/概念.md" docs/css/bfc.md
cp "CSS布局相关/IFC/概念.md" docs/css/ifc.md
cp "CSS布局相关/移动端适配/index.md" docs/css/mobile-adaptation.md
cp "CSS布局相关/ContentVIsibility/介绍.md" docs/css/content-visibility.md
cp "CSS布局相关/rAF和rIC/事件循环与渲染.md" docs/css/raf-ric.md
cp "CSS布局相关/伪类&伪元素/描述.md" docs/css/pseudo.md
cp "CSS布局相关/元素宽高/描述.md" docs/css/width-height.md

echo "✅ CSS 文件复制完成 (7个)"

# 性能优化 (5个文件)
cp "性能优化/web性能优化.md" docs/performance/web.md
cp "性能优化/如何让网页更丝滑.md" docs/performance/smooth.md
cp "性能优化/大文件上传/实现思路.md" docs/performance/upload-idea.md
cp "性能优化/性能监控/性能指标.md" docs/performance/metrics.md
cp "性能优化/性能监控/错误监控.md" docs/performance/error-monitoring.md

echo "✅ 性能优化 文件复制完成 (5个)"

# 架构 (6个文件,排除空文件和CHANGELOG)
cp "架构/微前端架构.md" docs/engineering/micro-frontend.md
cp "架构/Islands架构.md" docs/engineering/islands.md
cp "架构/PWA方案.md" docs/engineering/pwa.md
cp "架构/国际化方案.md" docs/engineering/i18n.md
cp "架构/渲染方式.md" docs/engineering/rendering.md

echo "✅ 架构 文件复制完成 (5个)"

# 算法 (10个文件)
cp "算法/算法基础/算法基础.md" docs/algorithms/basic.md
cp "算法/算法基础/总结:二分查找(上).md" docs/algorithms/binary-search.md
cp "算法/算法基础/变形二分法.md" docs/algorithms/binary-search-variations.md
cp "算法/算法基础/堆.md" docs/algorithms/heap.md
cp "算法/算法基础/散列表.md" docs/algorithms/hash-table.md
cp "算法/算法基础/二叉查找树.md" docs/algorithms/bst.md
cp "算法/算法基础/二叉树-1.md" docs/algorithms/binary-tree.md
cp "算法/算法基础/字符串匹配算法.md" docs/algorithms/string-matching.md
cp "算法/排序算法代码实现/冒泡、插入、选择排序.md" docs/algorithms/bubble-insert-selection.md
cp "算法/排序算法代码实现/归并排序算法.md" docs/algorithms/merge-sort.md
cp "算法/排序算法代码实现/快速排序.md" docs/algorithms/quick-sort.md

echo "✅ 算法 文件复制完成 (11个)"

# 读书笔记 (11个有价值文件)
cp "读书笔记/你不知道的js/你不知道的js.md" docs/books/js-you-dont-know.md
cp "读书笔记/你不知道的js/作用域闭包.md" docs/books/scope-closure.md
cp "读书笔记/你不知道的js/对象.md" docs/books/objects.md

cp "读书笔记/重学前端笔记/class语法糖原理.md" docs/books/class-sugar.md
cp "读书笔记/重学前端笔记/函数分类和this.md" docs/books/function-this.md
cp "读书笔记/重学前端笔记/类型转换.md" docs/books/type-coercion.md

cp "读书笔记/node深入浅出/Node模块机制.md" docs/books/node-module.md
cp "读书笔记/node深入浅出/Node内存管理.md" docs/books/node-memory.md
cp "读书笔记/node深入浅出/多进程设计.md" docs/books/node-process.md
cp "读书笔记/node深入浅出/异步IO.md" docs/books/node-async-io.md

cp "读书笔记/现代前端技术解析.md" docs/books/modern-frontend.md

echo "✅ 读书笔记 文件复制完成 (11个)"

# JS相关 (3个文件)
cp "JS相关/javascript数据类型&内存管理机制.md" docs/javascript/memory.md
cp "JS相关/ES6/es6.md" docs/javascript/es6.md
cp "JS相关/发布订阅/实现一个lazyMan.md" docs/javascript/pubsub.md

echo "✅ JavaScript 文件复制完成 (3个)"

# 知识杂记
cp "知识杂记/知识杂记.md" docs/misc/notes.md

echo "✅ 知识杂记 文件复制完成 (1个)"

# MVVM
cp "MVVM/react vs vue.md" docs/mvvm/react-vs-vue.md

echo "✅ MVVM 文件复制完成 (1个)"

echo ""
echo "========================================="
echo "🎉 所有文件复制完成!"
echo "========================================="
echo "统计:"
echo "- Vue: 19个"
echo "- React: 26个"
echo "- 浏览器: 12个"
echo "- CSS: 7个"
echo "- 性能优化: 5个"
echo "- 架构: 5个"
echo "- 算法: 11个"
echo "- 读书笔记: 11个"
echo "- JavaScript: 3个"
echo "- 知识杂记: 1个"
echo "- MVVM: 1个"
echo "========================================="
echo "总计: ~101个文件"

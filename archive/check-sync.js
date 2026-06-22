#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 映射配置（基于 copy-all-files.sh）
const mappings = [
  // React (26个)
  { source: 'React设计原理/React理念/React理念.md', target: 'docs/react/concept.md' },
  { source: 'React设计原理/React理念/前端框架概览.md', target: 'docs/react/framework-overview.md' },
  { source: 'React设计原理/Hooks/FC组件与Hook.md', target: 'docs/react/fc-hook.md' },
  { source: 'React设计原理/Hooks/Hooks用法总结.md', target: 'docs/react/hooks-summary.md' },
  { source: 'React设计原理/Hooks/自定义hook案例.md', target: 'docs/react/custom-hooks.md' },
  { source: 'React设计原理/Renderer/Reconciler.md', target: 'docs/react/reconciler.md' },
  { source: 'React设计原理/Renderer/reconcile算法(Diff).md', target: 'docs/react/reconcile-algorithm.md' },
  { source: 'React设计原理/Renderer/Commit.md', target: 'docs/react/commit.md' },
  { source: 'React设计原理/Renderer/状态更新流程.md', target: 'docs/react/state-update.md' },
  { source: 'React设计原理/Renderer/性能优化.md', target: 'docs/react/performance.md' },
  { source: 'React设计原理/Scheduler/Scheduler.md', target: 'docs/react/scheduler.md' },
  { source: 'React设计原理/Scheduler/React优先级.md', target: 'docs/react/priority.md' },
  { source: 'React设计原理/Scheduler/BatchedUpdate.md', target: 'docs/react/batched-update.md' },
  { source: 'React设计原理/Context.md', target: 'docs/react/context.md' },
  { source: 'React设计原理/JSX.md', target: 'docs/react/jsx.md' },
  { source: 'React设计原理/State.md', target: 'docs/react/state.md' },
  { source: 'React设计原理/Ref.md', target: 'docs/react/ref.md' },
  { source: 'React设计原理/逻辑复用.md', target: 'docs/react/logic-reuse.md' },
  { source: 'React设计原理/错误处理.md', target: 'docs/react/error-handling.md' },
  { source: 'React设计原理/CSS模块化.md', target: 'docs/react/css-modules.md' },
  { source: 'React设计原理/新版本内容.md', target: 'docs/react/new-features.md' },
  { source: 'React设计原理/生命周期/React生命周期.md', target: 'docs/react/lifecycle.md' },
  { source: 'React设计原理/事件系统/事件系统.md', target: 'docs/react/event-system.md' },
  { source: 'React设计原理/Router/Router.md', target: 'docs/react/router.md' },
  { source: 'React设计原理/渲染优化实践/渲染优化.md', target: 'docs/react/render-optimization.md' },
  { source: 'React设计原理/渲染优化实践/异步渲染.md', target: 'docs/react/async-render.md' },

  // Vue (19个)
  { source: 'Vue设计原理/响应系统/双向绑定原理.md', target: 'docs/vue/double-binding.md' },
  { source: 'Vue设计原理/响应系统/effect实现原理.md', target: 'docs/vue/effect.md' },
  { source: 'Vue设计原理/响应系统/原始值的响应式.md', target: 'docs/vue/primitive-reactive.md' },
  { source: 'Vue设计原理/响应系统/非原始值的响应式.md', target: 'docs/vue/non-primitive-reactive.md' },
  { source: 'Vue设计原理/响应系统/computed和watch的实现.md', target: 'docs/vue/computed-watch.md' },
  { source: 'Vue设计原理/渲染器/Diff算法的前世今生.md', target: 'docs/vue/diff-history.md' },
  { source: 'Vue设计原理/渲染器/vue2.x diff VS vue-next diff.md', target: 'docs/vue/diff-compare.md' },
  { source: 'Vue设计原理/渲染器/vue2.x patch VS vue-next patch.md', target: 'docs/vue/patch-compare.md' },
  { source: 'Vue设计原理/渲染器/渲染器的设计.md', target: 'docs/vue/renderer-design.md' },
  { source: 'Vue设计原理/编译器/总览.md', target: 'docs/vue/compiler-overview.md' },
  { source: 'Vue设计原理/编译器/vue-next openBlock.md', target: 'docs/vue/open-block.md' },
  { source: 'Vue设计原理/编译器/编译优化.md', target: 'docs/vue/compile-optimization.md' },
  { source: 'Vue设计原理/组件化/vue2.x生命周期.md', target: 'docs/vue/lifecycle-v2.md' },
  { source: 'Vue设计原理/组件化/vue-next生命周期.md', target: 'docs/vue/lifecycle-v3.md' },
  { source: 'Vue设计原理/组件化/组件实例.md', target: 'docs/vue/component-instance.md' },
  { source: 'Vue设计原理/组件化/异步组件.md', target: 'docs/vue/async-component.md' },
  { source: 'Vue设计原理/组件化/内置组件.md', target: 'docs/vue/built-in-components.md' },
  { source: 'Vue设计原理/生态/vuex实现原理.md', target: 'docs/vue/vuex.md' },
  { source: 'Vue设计原理/生态/vue-router实现原理.md', target: 'docs/vue/vue-router.md' },

  // 浏览器 (12个)
  { source: '浏览器/总览.md', target: 'docs/browser/overview.md' },
  { source: '浏览器/DNS域名系统.md', target: 'docs/browser/dns.md' },
  { source: '浏览器/http相关/http协议的前世今生.md', target: 'docs/browser/http-history.md' },
  { source: '浏览器/http相关/TCP协议.md', target: 'docs/browser/tcp.md' },
  { source: '浏览器/http相关/http method相关.md', target: 'docs/browser/http-methods.md' },
  { source: '浏览器/http相关/https.md', target: 'docs/browser/https.md' },
  { source: '浏览器/websocket/websocket.md', target: 'docs/browser/websocket.md' },
  { source: '浏览器/存储与缓存/存储与缓存.md', target: 'docs/browser/storage-cache.md' },
  { source: '浏览器/渲染/css优化渲染.md', target: 'docs/browser/css-rendering.md' },
  { source: '浏览器/渲染/渲染&关键css.md', target: 'docs/browser/critical-css.md' },
  { source: '浏览器/渲染/html-parser/toy-browser/readme.md', target: 'docs/browser/toy-browser.md' },
  { source: '浏览器/浏览器兼容性解决方案.md', target: 'docs/browser/compatibility.md' },

  // CSS (7个)
  { source: 'CSS布局相关/BFC/概念.md', target: 'docs/css/bfc.md' },
  { source: 'CSS布局相关/IFC/概念.md', target: 'docs/css/ifc.md' },
  { source: 'CSS布局相关/移动端适配/index.md', target: 'docs/css/mobile-adaptation.md' },
  { source: 'CSS布局相关/ContentVIsibility/介绍.md', target: 'docs/css/content-visibility.md' },
  { source: 'CSS布局相关/rAF和rIC/事件循环与渲染.md', target: 'docs/css/raf-ric.md' },
  { source: 'CSS布局相关/伪类&伪元素/描述.md', target: 'docs/css/pseudo.md' },
  { source: 'CSS布局相关/元素宽高/描述.md', target: 'docs/css/width-height.md' },

  // 性能优化 (5个)
  { source: '性能优化/web性能优化.md', target: 'docs/performance/web.md' },
  { source: '性能优化/如何让网页更丝滑.md', target: 'docs/performance/smooth.md' },
  { source: '性能优化/大文件上传/实现思路.md', target: 'docs/performance/upload-idea.md' },
  { source: '性能优化/性能监控/性能指标.md', target: 'docs/performance/metrics.md' },
  { source: '性能优化/性能监控/错误监控.md', target: 'docs/performance/error-monitoring.md' },

  // 架构 (5个)
  { source: '架构/微前端架构.md', target: 'docs/engineering/micro-frontend.md' },
  { source: '架构/Islands架构.md', target: 'docs/engineering/islands.md' },
  { source: '架构/PWA方案.md', target: 'docs/engineering/pwa.md' },
  { source: '架构/国际化方案.md', target: 'docs/engineering/i18n.md' },
  { source: '架构/渲染方式.md', target: 'docs/engineering/rendering.md' },

  // 算法 (11个)
  { source: '算法/算法基础/算法基础.md', target: 'docs/algorithms/basic.md' },
  { source: '算法/算法基础/总结:二分查找(上).md', target: 'docs/algorithms/binary-search.md' },
  { source: '算法/算法基础/变形二分法.md', target: 'docs/algorithms/binary-search-variations.md' },
  { source: '算法/算法基础/堆.md', target: 'docs/algorithms/heap.md' },
  { source: '算法/算法基础/散列表.md', target: 'docs/algorithms/hash-table.md' },
  { source: '算法/算法基础/二叉查找树.md', target: 'docs/algorithms/bst.md' },
  { source: '算法/算法基础/二叉树-1.md', target: 'docs/algorithms/binary-tree.md' },
  { source: '算法/算法基础/字符串匹配算法.md', target: 'docs/algorithms/string-matching.md' },
  { source: '算法/排序算法代码实现/冒泡、插入、选择排序.md', target: 'docs/algorithms/bubble-insert-selection.md' },
  { source: '算法/排序算法代码实现/归并排序算法.md', target: 'docs/algorithms/merge-sort.md' },
  { source: '算法/排序算法代码实现/快速排序.md', target: 'docs/algorithms/quick-sort.md' },

  // 读书笔记 (11个)
  { source: '读书笔记/你不知道的js/你不知道的js.md', target: 'docs/books/js-you-dont-know.md' },
  { source: '读书笔记/你不知道的js/作用域闭包.md', target: 'docs/books/scope-closure.md' },
  { source: '读书笔记/你不知道的js/对象.md', target: 'docs/books/objects.md' },
  { source: '读书笔记/重学前端笔记/class语法糖原理.md', target: 'docs/books/class-sugar.md' },
  { source: '读书笔记/重学前端笔记/函数分类和this.md', target: 'docs/books/function-this.md' },
  { source: '读书笔记/重学前端笔记/类型转换.md', target: 'docs/books/type-coercion.md' },
  { source: '读书笔记/node深入浅出/Node模块机制.md', target: 'docs/books/node-module.md' },
  { source: '读书笔记/node深入浅出/Node内存管理.md', target: 'docs/books/node-memory.md' },
  { source: '读书笔记/node深入浅出/多进程设计.md', target: 'docs/books/node-process.md' },
  { source: '读书笔记/node深入浅出/异步IO.md', target: 'docs/books/node-async-io.md' },
  { source: '读书笔记/现代前端技术解析.md', target: 'docs/books/modern-frontend.md' },

  // JavaScript (3个)
  { source: 'JS相关/javascript数据类型&内存管理机制.md', target: 'docs/javascript/memory.md' },
  { source: 'JS相关/ES6/es6.md', target: 'docs/javascript/es6.md' },
  { source: 'JS相关/发布订阅/实现一个lazyMan.md', target: 'docs/javascript/pubsub.md' },

  // 知识杂记 (1个)
  { source: '知识杂记/知识杂记.md', target: 'docs/misc/notes.md' },

  // MVVM (1个)
  { source: 'MVVM/react vs vue.md', target: 'docs/mvvm/react-vs-vue.md' },
];

console.log('🔍 开始检查源文件和目标文件的同步状态...\n');

let synced = 0;
let modified = 0;
let missing = 0;
const issues = [];

mappings.forEach(({ source, target }) => {
  const sourceExists = fs.existsSync(source);
  const targetExists = fs.existsSync(target);

  if (!sourceExists && !targetExists) {
    issues.push(`❌ 都缺失: ${source}`);
    missing++;
  } else if (!sourceExists) {
    issues.push(`⚠️  源文件缺失: ${source} → ${target}`);
    missing++;
  } else if (!targetExists) {
    issues.push(`⚠️  目标文件缺失: ${source} → ${target}`);
    missing++;
  } else {
    // 都存在，比较内容
    const sourceContent = fs.readFileSync(source, 'utf-8');
    const targetContent = fs.readFileSync(target, 'utf-8');

    if (sourceContent === targetContent) {
      synced++;
    } else {
      modified++;
      const sourceLines = sourceContent.split('\n').length;
      const targetLines = targetContent.split('\n').length;
      issues.push(`🔄 内容不同: ${source} (${sourceLines}行) → ${target} (${targetLines}行)`);
    }
  }
});

console.log('📊 统计结果:');
console.log('========================================');
console.log(`✅ 完全同步: ${synced} 个文件`);
console.log(`🔄 内容有差异: ${modified} 个文件`);
console.log(`❌ 文件缺失: ${missing} 个文件`);
console.log(`📝 总映射数: ${mappings.length} 个`);
console.log('========================================\n');

if (issues.length > 0) {
  console.log('📋 详细问题列表:\n');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  console.log('\n');
}

// 检查未映射的源文件
console.log('🔎 检查未映射的源文件...');
const allSourceFiles = [];
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.startsWith('.') && dir !== './node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.md')) {
      allSourceFiles.push(filePath);
    }
  });
}

const sourceDirs = [
  'React设计原理',
  'Vue设计原理',
  '浏览器',
  'CSS布局相关',
  '性能优化',
  '架构',
  '算法',
  '读书笔记',
  'JS相关',
  '知识杂记',
  'MVVM'
];

sourceDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir);
  }
});

const mappedSources = new Set(mappings.map(m => m.source));
const unmappedFiles = allSourceFiles.filter(f => !mappedSources.has(f));

if (unmappedFiles.length > 0) {
  console.log(`\n⚠️  发现 ${unmappedFiles.length} 个未映射的源文件:\n`);
  unmappedFiles.forEach((file, index) => {
    const stats = fs.statSync(file);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`${index + 1}. ${file} (${sizeKB}KB)`);
  });
} else {
  console.log('\n✅ 所有源文件都已映射！');
}

console.log('\n✨ 检查完成！');

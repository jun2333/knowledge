#!/bin/bash
# 批量复制现有Markdown文件到docs目录

# Vue (17个文件)
cp "Vue设计原理/响应系统/双向绑定原理.md" docs/vue/double-binding.md
cp "Vue设计原理/响应系统/effect实现原理.md" docs/vue/effect.md
cp "Vue设计原理/响应系统/原始值的响应式.md" docs/vue/primitive-reactive.md
cp "Vue设计原理/响应系统/非原始值的响应式.md" docs/vue/non-primitive-reactive.md
cp "Vue设计原理/响应系统/computed和watch的实现.md" docs/vue/computed-watch.md

cp "Vue设计原理/渲染器/Diff算法的前世今生.md" docs/vue/diff-history.md
cp "Vue设计原理/渲染器/vue2.x diff VS vue-next diff.md" docs/vue/diff-compare.md
cp "Vue设计原理/渲染器/vue2.x patch VS vue-next patch.md" docs/vue/patch-compare.md
cp "Vue设计原理/渲染器/渲染器的设计.md" docs/vue/renderer-design.md

cp "Vue设计原理/编译器/总览.md" docs/vue/compiler-overview.md
cp "Vue设计原理/编译器/vue-next openBlock.md" docs/vue/open-block.md
cp "Vue设计原理/编译器/编译优化.md" docs/vue/compile-optimization.md

cp "Vue设计原理/组件化/vue2.x生命周期.md" docs/vue/lifecycle-v2.md
cp "Vue设计原理/组件化/vue-next生命周期.md" docs/vue/lifecycle-v3.md
cp "Vue设计原理/组件化/组件实例.md" docs/vue/component-instance.md
cp "Vue设计原理/组件化/异步组件.md" docs/vue/async-component.md
cp "Vue设计原理/组件化/内置组件.md" docs/vue/built-in-components.md

cp "Vue设计原理/生态/vuex实现原理.md" docs/vue/vuex.md
cp "Vue设计原理/生态/vue-router实现原理.md" docs/vue/vue-router.md

echo "✅ Vue 文件复制完成 (19个)"

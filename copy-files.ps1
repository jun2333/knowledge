# 批量复制 Markdown 文件到 docs 目录

# Vue 设计原理
Copy-Item "Vue设计原理/响应系统/双向绑定原理.md" -Destination "docs/vue/double-binding.md"
Copy-Item "Vue设计原理/响应系统/effect实现原理.md" -Destination "docs/vue/effect.md"
Copy-Item "Vue设计原理/响应系统/原始值的响应式.md" -Destination "docs/vue/primitive-reactive.md"
Copy-Item "Vue设计原理/响应系统/非原始值的响应式.md" -Destination "docs/vue/non-primitive-reactive.md"
Copy-Item "Vue设计原理/响应系统/computed和watch的实现.md" -Destination "docs/vue/computed-watch.md"

Copy-Item "Vue设计原理/渲染器/Diff算法的前世今生.md" -Destination "docs/vue/diff-history.md"
Copy-Item "Vue设计原理/渲染器/vue2.x diff VS vue-next diff.md" -Destination "docs/vue/diff-compare.md"
Copy-Item "Vue设计原理/渲染器/vue2.x patch VS vue-next patch.md" -Destination "docs/vue/patch-compare.md"
Copy-Item "Vue设计原理/渲染器/渲染器的设计.md" -Destination "docs/vue/renderer-design.md"

Copy-Item "Vue设计原理/编译器/总览.md" -Destination "docs/vue/compiler-overview.md"
Copy-Item "Vue设计原理/编译器/vue-next openBlock.md" -Destination "docs/vue/open-block.md"
Copy-Item "Vue设计原理/编译器/编译优化.md" -Destination "docs/vue/compile-optimization.md"

Copy-Item "Vue设计原理/组件化/vue2.x生命周期.md" -Destination "docs/vue/lifecycle-v2.md"
Copy-Item "Vue设计原理/组件化/vue-next生命周期.md" -Destination "docs/vue/lifecycle-v3.md"
Copy-Item "Vue设计原理/组件化/组件实例.md" -Destination "docs/vue/component-instance.md"
Copy-Item "Vue设计原理/组件化/异步组件.md" -Destination "docs/vue/async-component.md"
Copy-Item "Vue设计原理/组件化/内置组件.md" -Destination "docs/vue/built-in-components.md"

Copy-Item "Vue设计原理/生态/vuex实现原理.md" -Destination "docs/vue/vuex.md"
Copy-Item "Vue设计原理/生态/vue-router实现原理.md" -Destination "docs/vue/vue-router.md"

echo "Vue 文件复制完成"

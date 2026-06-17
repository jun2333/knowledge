## v18
1. 自动批量更新
支持异步api如Promise、setTimeout批量更新
2. 并发模式变成并发特性，通过使用一些具备并发特性的api开启可中断的异步更新
useTransition、startTransition
3. 新的客户端和服务端渲染api
createRoot/hydrateRoot
renderToPipeableStream
4. 新的hook
useId、useInsertionEffect、useDeferredValue、useTransition、useSyncExternalStore

## v19
1. Action和异步过渡
增加了一些新的hook配合form使用，使得form提交处理变得更简单
useActionState: 简化了 Actions 的常见应用场景
useOptimistic: 提供乐观更新功能，允许在异步请求进行时即刻更新 UI
use: 支持在渲染时读取资源和上下文，使得在条件中使用 Context 成为可能
2. React DOM静态api
React 19 引入了 prerender 和 prerenderToNodeStream 两个新的 API，用于改进静态 HTML 生成，支持流环境如 Node.js Streams 和 Web Streams
3. 改进与兼容性
Ref 作为属性：函数组件现在可以直接通过属性访问 ref，不再需要 forwardRef
文档元数据支持：React 19 原生支持在组件中渲染 `<title>`、`<meta>` 和 `<link>` 标签，自动提升至文档的 `<head>`
样式表支持：通过声明优先级管理样式表的插入顺序，确保样式在依赖内容显示前加载完成
异步脚本支持：支持在组件树中任意位置渲染异步脚本，确保不会重复加载

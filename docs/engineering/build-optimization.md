---
title: 前端工程构建优化
date: 2026-07-22
---

# 前端工程构建优化

Vite、Webpack、Rollup 是当前主流的前端构建工具，各有侧重。

## 一句话总结

**Webpack 大而全、Rollup 专注库、Vite 快而新**——选工具看场景，优化思路有共性。

## 三大工具对比

| 特性 | Webpack | Rollup | Vite |
|------|---------|--------|------|
| **定位** | 应用打包 | 库打包 | 下一代构建工具 |
| **打包方式** | bundle（全量打包） | bundle（更干净的输出） | 开发时按需编译，生产用 Rollup |
| **开发服务器** | webpack-dev-server | 无内置 | 原生 ESM + esbuild |
| **热更新** | 全模块重编译 | 无 | 毫秒级 HMR |
| **配置复杂度** | 高 | 中 | 低 |
| **生态插件** | 最丰富 | 较少 | 兼容 Vite + Rollup 插件 |
| **Tree Shaking** | 支持（需配置） | 原生支持 | 原生支持 |

## Webpack

### 核心概念

```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js',      // 入口
  output: {                      // 输出
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {                      // 模块规则
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.js$/, exclude: /node_modules/, use: 'babel-loader' }
    ]
  },
  plugins: [                     // 插件
    new HtmlWebpackPlugin({ template: './index.html' })
  ],
  optimization: {                // 优化配置
    splitChunks: { chunks: 'all' }
  }
}
```

### 优化手段

| 优化项 | 配置 | 效果 | 使用场景 |
|--------|------|------|---------|
| **代码分割** | `splitChunks.chunks: 'all'` | 提取公共代码，减小单包体积 | 多入口项目、第三方库提取 |
| **懒加载** | `import()` 动态导入 | 路由级代码分割 | 路由组件、大型弹窗/抽屉 |
| **缓存** | `output.filename: '[contenthash].js'` | 长期缓存，未改动文件不重新下载 | 生产环境必配 |
| **Tree Shaking** | `mode: 'production'` + ES Module | 移除未使用代码 | 库项目、工具函数库 |
| **压缩** | `TerserPlugin`（生产默认启用） | 减小 JS 体积 | 生产环境必配 |
| **Scope Hoisting** | `ModuleConcatenationPlugin` | 减少函数包裹，提升运行性能 | 生产环境、模块多的项目 |
| **并行编译** | `thread-loader` | 多进程编译，加速大项目 | 大型项目、构建慢时 |
| **持久化缓存** | `cache.type: 'filesystem'` | 二次编译速度提升 50%+ | 本地开发、CI/CD |

**各优化项详细说明**：

#### 代码分割（Split Chunks）

**使用场景**：
- 多入口项目（多个页面共享公共代码）
- 提取第三方库（React、Vue 等单独打包）
- 按需加载大型组件（图表库、编辑器）

```javascript
// 提取 vendor 和公共代码
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      chunks: 'all'
    },
    common: {
      minChunks: 2,  // 被 2 个以上入口引用
      name: 'common',
      chunks: 'all'
    }
  }
}
```

#### 懒加载（Lazy Loading）

**使用场景**：
- 路由组件（访问时才加载）
- 大型弹窗/抽屉（打开时才加载）
- 权限相关组件（有权限才加载）

```javascript
// 路由懒加载
const UserList = () => import('./views/UserList.vue')

// 条件加载
if (hasPermission) {
  const AdminPanel = await import('./components/AdminPanel.vue')
}
```

#### 长期缓存（Content Hash）

**使用场景**：生产环境必配

```javascript
output: {
  filename: '[name].[contenthash].js',    // JS 文件
  chunkFilename: '[name].[contenthash].js' // 懒加载的 chunk
}
```

**效果**：
```
首次发布：app.a1b2c3.js
代码未改：app.a1b2c3.js（浏览器缓存命中）
代码改了：app.d4e5f6.js（浏览器重新下载）
```

#### Tree Shaking

**使用场景**：
- 工具函数库（只导入用到的函数）
- 组件库（只打包用到的组件）
- 生产环境（自动启用）

```javascript
// ✅ 正确：按需导入
import { debounce } from 'lodash-es'

// ❌ 错误：全量导入（Tree Shaking 无效）
import _ from 'lodash'
```

**前提条件**：
- 使用 ES Module（`import/export`）
- `package.json` 设置 `"sideEffects": false`

#### 压缩（Minification）

**使用场景**：生产环境必配

```javascript
// Webpack 5 默认启用 TerserPlugin
optimization: {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true,  // 移除 console
          drop_debugger: true  // 移除 debugger
        }
      }
    })
  ]
}
```

#### Scope Hoisting

**使用场景**：
- 生产环境（减少运行时开销）
- 模块数量多的项目（效果明显）

```javascript
// Webpack 5 生产模式默认启用
const { ModuleConcatenationPlugin } = require('webpack')

plugins: [
  new ModuleConcatenationPlugin()
]
```

**效果**：
```
优化前：每个模块一个函数包裹
  function(module) { ... }
  function(module) { ... }

优化后：多个模块合并到一个作用域
  function() {
    // 模块 1
    // 模块 2
  }
```

#### 并行编译（thread-loader）

**使用场景**：
- 大型项目（1000+ 模块）
- 构建时间超过 30 秒
- Babel/TypeScript 编译慢

```javascript
module: {
  rules: [
    {
      test: /\.js$/,
      use: [
        'thread-loader',  // 多进程编译
        'babel-loader'
      ]
    }
  ]
}
```

**注意**：
- 进程间通信有开销，小项目反而慢
- 推荐模块数 > 1000 时使用

```javascript
// 优化配置示例
module.exports = {
  mode: 'production',
  cache: {
    type: 'filesystem',  // 持久化缓存
    cacheDirectory: path.resolve(__dirname, '.cache')
  },
  // ...
}
```

**持久化缓存的使用场景**：

| 场景 | 说明 |
|------|------|
| **本地开发** | 二次启动/构建速度提升 50%+ |
| **CI/CD** | 配合缓存目录持久化，加速重复构建 |
| **大型项目** | 模块越多，缓存收益越大 |

**工作原理**：
```
首次构建：
  编译所有模块 → 缓存到 .cache 目录

二次构建：
  检查文件变化 → 只重新编译变化的模块
  未变化的模块从缓存读取 → 构建速度大幅提升
```

**注意事项**：
- `.cache` 目录应加入 `.gitignore`
- 依赖版本变化时需清缓存（`rm -rf .cache`）
- CI 上可缓存 `.cache` 目录加速构建

## Rollup

### 核心概念

```javascript
// rollup.config.js
export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/bundle.esm.js',
      format: 'esm'  // ES Module
    },
    {
      file: 'dist/bundle.cjs.js',
      format: 'cjs'  // CommonJS
    }
  ],
  plugins: [
    resolve(),   // 解析 node_modules
    commonjs(),  // 转换 CommonJS 为 ES Module
    babel()
  ]
}
```

### 为什么库打包首选 Rollup？

1. **输出更干净**：没有 Webpack 的 runtime  boilerplate
2. **Tree Shaking 更强**：原生支持，无需额外配置
3. **多格式输出**：一次打包生成 ESM、CJS、UMD 等格式

### 优化手段

| 优化项 | 配置 | 效果 |
|--------|------|------|
| **多格式输出** | `output.format: ['esm', 'cjs', 'umd']` | 适配不同环境 |
| **外部依赖** | `external: ['react', 'lodash']` | 不打包依赖，减小体积 |
| **Tree Shaking** | 默认启用 | 移除未使用导出 |
| **代码压缩** | `@rollup/plugin-terser` | 生产环境压缩 |
| **TypeScript** | `@rollup/plugin-typescript` | 直接编译 TS |

```javascript
// 库打包优化示例
export default {
  input: 'src/index.ts',
  external: ['react', 'react-dom'],  // 不打包 React
  output: [
    { file: 'dist/index.esm.js', format: 'esm' },
    { file: 'dist/index.cjs.js', format: 'cjs' }
  ],
  plugins: [
    typescript(),
    terser()  // 生产环境压缩
  ]
}
```

## Vite

### 核心原理

```
开发环境：
  浏览器请求 → Vite 拦截 → esbuild 编译 → 返回 ESM
  （按需编译，不打包）

生产环境：
  Vite 2-7：Rollup 打包 → 优化输出
  Vite 8+：Rolldown 打包 → 优化输出（Rust 编写，更快）
```

**Rolldown**：Vite 团队用 Rust 编写的 Rollup 替代品，兼顾 Rollup 的产物质量和 esbuild 的速度。

**为什么生产环境不用 esbuild？**

| 对比项 | esbuild | Rollup/Rolldown |
|--------|---------|-----------------|
| **速度** | 极快（Go/Rust） | 快（Rust） |
| **代码分割** | 弱（简单分割） | 强（灵活配置） |
| **Tree Shaking** | 基础支持 | 深度优化 |
| **插件生态** | 较少 | 成熟丰富 |
| **产物体积** | 较大 | 更小 |
| **适用场景** | 开发环境（速度优先） | 生产环境（质量优先） |

**核心原因**：生产环境更看重**产物质量**（体积、代码分割、Tree Shaking），esbuild 虽然快，但这些方面不如 Rollup/Rolldown。

### 为什么快？

| 对比项 | Webpack | Vite |
|--------|---------|------|
| **冷启动** | 全量编译所有模块 | 只编译入口，其他按需 |
| **热更新** | 重新编译整个模块图 | 只编译变更模块 |
| **编译器** | Babel（JS 编写） | esbuild（Go 编写，快 10-100 倍） |

### 优化手段

| 优化项 | 配置 | 效果 |
|--------|------|------|
| **依赖预构建** | `optimizeDeps.include` | 首次启动加速 |
| **按需编译** | 默认启用 | 开发时只编译访问的模块 |
| **生产打包** | `build.rollupOptions` | 复用 Rollup 优化能力 |
| **代码分割** | `build.rollupOptions.output.manualChunks` | 自定义分包策略 |
| **压缩** | `build.minify: 'terser'` 或 `'esbuild'` | esbuild 压缩更快 |
| **Source Map** | `build.sourcemap: false`（生产） | 减小产物体积 |
| **目标浏览器** | `build.target: 'es2020'` | 避免不必要的转译 |

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // 开发优化
  optimizeDeps: {
    include: ['lodash', 'axios']  // 预构建依赖
  },
  
  // 生产优化
  build: {
    target: 'es2020',  // 现代浏览器，减少转译
    minify: 'esbuild',  // 用 esbuild 压缩（更快）
    sourcemap: false,   // 生产不生成 sourcemap
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],  // 提取 React
          utils: ['lodash', 'dayjs']       // 提取工具库
        }
      }
    }
  }
})
```

## 通用优化策略

无论用哪个工具，以下策略都适用：

### 1. 减小包体积

| 策略 | 说明 |
|------|------|
| **Tree Shaking** | 使用 ES Module，避免副作用代码 |
| **按需导入** | `import { debounce } from 'lodash-es'` 而非 `import _ from 'lodash'` |
| **动态导入** | 路由级 `import()` 分割代码 |
| **压缩资源** | 图片用 WebP，字体用 woff2 |

### 2. 加速编译

| 策略 | 说明 |
|------|------|
| **缓存** | 开启持久化缓存，避免重复编译 |
| **并行编译** | 多进程处理（Webpack thread-loader） |
| **缩小范围** | `exclude: /node_modules/` 减少编译文件 |
| **升级工具** | Vite/esbuild 比 Webpack/Babel 快数倍 |

### 3. 优化产物

| 策略 | 说明 |
|------|------|
| **代码分割** | 提取公共代码，按需加载 |
| **长期缓存** | 文件名用 `[contenthash]` |
| **移除 Source Map** | 生产环境不生成 |
| **CDN 加速** | 大依赖用 CDN，设置 `external` |

## 选型建议

| 场景 | 推荐工具 | 原因 |
|------|---------|------|
| **大型应用** | Webpack | 生态成熟，插件丰富 |
| **组件库/工具库** | Rollup | 输出干净，Tree Shaking 强 |
| **新项目/中小应用** | Vite | 开发体验好，速度快 |
| **需要极致兼容** | Webpack | 支持老旧浏览器和复杂配置 |

## 常见误区

❌ **Webpack 一定比 Vite 慢**
> Webpack 5 的持久化缓存和模块联邦已经很快，大项目不一定慢。

 **Vite 生产环境不用优化**
> Vite 生产用 Rollup，仍需配置代码分割、压缩等优化。

❌ **Tree Shaking 配置了就一定生效**
> 代码必须有副作用声明（`package.json` 的 `sideEffects: false`），且使用 ES Module 导出。

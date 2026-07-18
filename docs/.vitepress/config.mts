import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '知识库',
  description: '个人知识库',

  themeConfig: {
    nav: [
      { text: 'JavaScript', link: '/javascript/memory' },
      { text: 'Vue', link: '/vue/double-binding' },
      { text: 'React', link: '/react/concept' },
      { text: 'AI Agent', link: '/ai-agent/' },
      { text: '浏览器', link: '/browser/overview' },
      { text: 'CSS', link: '/css/bfc' },
      { text: '性能优化', link: '/performance/web' },
      { text: '架构', link: '/engineering/micro-frontend' },
      { text: '算法', link: '/algorithms/basic' },
      { text: '读书笔记', link: '/books/js-you-dont-know' },
      { text: '运动', link: '/sports/breaststroke-for-beginners' },
      { text: '杂项', link: '/misc/notes' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '学习路径', link: '/guide/learning-path' },
            { text: '面试准备', link: '/guide/interview-prep' },
            { text: '导航总览', link: '/guide/navigation-overview' },
          ]
        }
      ],

      '/javascript/': [
        {
          text: 'JavaScript 核心',
          items: [
            { text: '数据类型与内存管理', link: '/javascript/memory' },
            { text: '事件循环', link: '/javascript/event-loop' },
            { text: 'ES6+ 新特性', link: '/javascript/es6' },
            { text: '设计模式', link: '/javascript/pubsub' },
            { text: '原型与继承', link: '/javascript/prototype' },
            { text: '闭包、作用域与 this', link: '/javascript/closure' },
            { text: '模块化进化史', link: '/javascript/module' },
            { text: 'TypeScript 核心', link: '/javascript/typescript' },
          ]
        }
      ],

      '/vue/': [
        {
          text: '响应系统',
          items: [
            { text: '双向绑定原理', link: '/vue/double-binding' },
            { text: 'Effect 实现原理', link: '/vue/effect' },
            { text: '原始值的响应式', link: '/vue/primitive-reactive' },
            { text: '非原始值的响应式', link: '/vue/non-primitive-reactive' },
            { text: 'Computed 和 Watch', link: '/vue/computed-watch' },
          ]
        },
        {
          text: '渲染器',
          items: [
            { text: 'Diff 算法的前世今生', link: '/vue/diff-history' },
            { text: 'Vue2 vs Vue3 Diff', link: '/vue/diff-compare' },
            { text: 'Vue2 vs Vue3 Patch', link: '/vue/patch-compare' },
            { text: '渲染器的设计', link: '/vue/renderer-design' },
          ]
        },
        {
          text: '编译器',
          items: [
            { text: '编译总览', link: '/vue/compiler-overview' },
            { text: 'OpenBlock 机制', link: '/vue/open-block' },
            { text: '编译优化', link: '/vue/compile-optimization' },
          ]
        },
        {
          text: '组件化',
          items: [
            { text: 'Vue2 生命周期', link: '/vue/lifecycle-v2' },
            { text: 'Vue3 生命周期', link: '/vue/lifecycle-v3' },
            { text: '组件实例', link: '/vue/component-instance' },
            { text: '异步组件', link: '/vue/async-component' },
            { text: '内置组件', link: '/vue/built-in-components' },
          ]
        },
        {
          text: '生态',
          items: [
            { text: 'Vuex 实现原理', link: '/vue/vuex' },
            { text: 'Vue Router 实现', link: '/vue/vue-router' },
          ]
        }
      ],

      '/react/': [
        {
          text: 'React 理念',
          items: [
            { text: 'React 设计理念', link: '/react/concept' },
            { text: '前端框架概览', link: '/react/framework-overview' },
          ]
        },
        {
          text: 'Hooks',
          items: [
            { text: 'FC 组件与 Hook', link: '/react/fc-hook' },
            { text: 'Hooks 用法总结', link: '/react/hooks-summary' },
            { text: '自定义 Hook 案例', link: '/react/custom-hooks' },
          ]
        },
        {
          text: 'Reconciler 协调器',
          items: [
            { text: 'Reconciler 协调器', link: '/react/reconciler' },
            { text: 'Reconcile 算法 (Diff)', link: '/react/reconcile-algorithm' },
            { text: 'Commit 阶段', link: '/react/commit' },
            { text: '状态更新流程', link: '/react/state-update' },
            { text: '性能优化', link: '/react/performance' },
          ]
        },
        {
          text: 'Renderer 渲染器',
          items: [
            { text: 'ReactDOM 实现', link: '/react/react-dom' },
            { text: 'React Native 渲染', link: '/react/react-native' },
          ]
        },
        {
          text: 'Scheduler 调度器',
          items: [
            { text: 'Scheduler', link: '/react/scheduler' },
            { text: 'React 优先级', link: '/react/priority' },
            { text: '批量更新', link: '/react/batched-update' },
          ]
        },
        {
          text: '其他核心概念',
          items: [
            { text: 'Context', link: '/react/context' },
            { text: 'JSX', link: '/react/jsx' },
            { text: 'State', link: '/react/state' },
            { text: 'Ref', link: '/react/ref' },
            { text: '逻辑复用', link: '/react/logic-reuse' },
            { text: '错误处理', link: '/react/error-handling' },
            { text: 'CSS 模块化', link: '/react/css-modules' },
            { text: '新版本内容', link: '/react/new-features' },
          ]
        },
        {
          text: '生命周期 & 事件',
          items: [
            { text: 'React 生命周期', link: '/react/lifecycle' },
            { text: '事件系统', link: '/react/event-system' },
          ]
        },
        {
          text: 'Router',
          items: [
            { text: 'Router 原理', link: '/react/router' },
          ]
        },
        {
          text: '渲染优化',
          items: [
            { text: '渲染优化实践', link: '/react/render-optimization' },
            { text: '异步渲染', link: '/react/async-render' },
          ]
        },
        {
          text: '最佳实践',
          items: [
            { text: '组件设计原则', link: '/react/best-practices/component-design' },
            { text: 'Hook 设计原则', link: '/react/best-practices/hook-design' },
            { text: '状态管理实践', link: '/react/best-practices/state-management' },
            { text: '性能优化清单', link: '/react/best-practices/performance-checklist' },
          ]
        }
      ],

      '/browser/': [
        {
          text: '概览',
          items: [
            { text: '浏览器总览', link: '/browser/overview' },
          ]
        },
        {
          text: '网络协议',
          items: [
            { text: 'DNS 域名系统', link: '/browser/dns' },
            { text: 'HTTP 协议演进', link: '/browser/http-history' },
            { text: 'TCP 协议', link: '/browser/tcp' },
            { text: 'HTTP Methods', link: '/browser/http-methods' },
            { text: 'HTTPS', link: '/browser/https' },
            { text: 'WebSocket', link: '/browser/websocket' },
            { text: 'SSE', link: '/browser/sse' },
          ]
        },
        {
          text: '存储与缓存',
          items: [
            { text: '存储与缓存', link: '/browser/storage-cache' },
            { text: '应用更新实践', link: '/browser/app-update' },
          ]
        },
        {
          text: '渲染',
          items: [
            { text: 'CSS 渲染优化', link: '/browser/css-rendering' },
            { text: '关键 CSS', link: '/browser/critical-css' },
            { text: 'Toy Browser', link: '/browser/toy-browser' },
          ]
        },
        {
          text: '其他',
          items: [
            { text: '浏览器兼容性', link: '/browser/compatibility' },
          ]
        }
      ],

      '/css/': [
        {
          text: '布局系统',
          items: [
            { text: 'BFC 概念', link: '/css/bfc' },
            { text: 'IFC 概念', link: '/css/ifc' },
            { text: 'Flex & Grid 布局', link: '/css/flex-grid' },
            { text: '常见布局最佳实践', link: '/css/layout-best-practices' },
          ]
        },
        {
          text: '移动端',
          items: [
            { text: '移动端适配', link: '/css/mobile-adaptation' },
          ]
        },
        {
          text: '高级特性',
          items: [
            { text: 'Content Visibility', link: '/css/content-visibility' },
            { text: 'rAF 和 rIC', link: '/css/raf-ric' },
          ]
        },
        {
          text: '基础',
          items: [
            { text: '伪类与伪元素', link: '/css/pseudo' },
            { text: '元素宽高', link: '/css/width-height' },
          ]
        }
      ],

      '/performance/': [
        {
          text: '性能优化',
          items: [
            { text: 'Web 性能优化', link: '/performance/web' },
            { text: '如何让网页更丝滑', link: '/performance/smooth' },
            { text: '大文件上传', link: '/performance/upload-idea' },
          ]
        },
        {
          text: '监控',
          items: [
            { text: '性能指标', link: '/performance/metrics' },
            { text: '错误监控', link: '/performance/error-monitoring' },
          ]
        },
        {
          text: '最佳实践',
          items: [
            { text: '性能优化清单', link: '/performance/best-practices' },
          ]
        }
      ],

      '/engineering/': [
        {
          text: '架构设计',
          items: [
            { text: '微前端架构', link: '/engineering/micro-frontend' },
            { text: 'Islands 架构', link: '/engineering/islands' },
            { text: 'PWA 方案', link: '/engineering/pwa' },
            { text: '国际化方案', link: '/engineering/i18n' },
            { text: '渲染方式', link: '/engineering/rendering' },
            { text: 'BFF 层设计', link: '/engineering/bff' },
            { text: 'Server Components', link: '/engineering/server-components' },
            { text: 'Product Feature', link: '/engineering/product-feature' },
          ]
        },
        {
          text: '团队协作',
          items: [
            { text: 'Git Flow 最佳实践', link: '/engineering/git-flow' },
            { text: 'CI/CD 持续集成与部署', link: '/engineering/cicd' },
            { text: '团队管理最佳实践', link: '/engineering/team-management' },
          ]
        }
      ],

      '/algorithms/': [
        {
          text: '算法基础',
          items: [
            { text: '算法基础', link: '/algorithms/basic' },
            { text: '二分查找', link: '/algorithms/binary-search' },
            { text: '变形二分法', link: '/algorithms/binary-search-variations' },
            { text: '堆', link: '/algorithms/heap' },
            { text: '散列表', link: '/algorithms/hash-table' },
            { text: '二叉查找树', link: '/algorithms/bst' },
            { text: '二叉树', link: '/algorithms/binary-tree' },
            { text: '字符串匹配算法', link: '/algorithms/string-matching' },
          ]
        },
        {
          text: '排序算法',
          items: [
            { text: '冒泡、插入、选择', link: '/algorithms/bubble-insert-selection' },
            { text: '归并排序', link: '/algorithms/merge-sort' },
            { text: '快速排序', link: '/algorithms/quick-sort' },
          ]
        }
      ],

      '/books/': [
        {
          text: '你不知道的 JS',
          items: [
            { text: '你不知道的 JS', link: '/books/js-you-dont-know' },
            { text: '作用域闭包', link: '/books/scope-closure' },
            { text: '对象', link: '/books/objects' },
          ]
        },
        {
          text: '重学前端',
          items: [
            { text: 'Class 语法糖原理', link: '/books/class-sugar' },
            { text: '函数分类和 this', link: '/books/function-this' },
            { text: '类型转换', link: '/books/type-coercion' },
          ]
        },
        {
          text: 'Node 深入浅出',
          items: [
            { text: 'Node 模块机制', link: '/books/node-module' },
            { text: 'Node 内存管理', link: '/books/node-memory' },
            { text: '多进程设计', link: '/books/node-process' },
            { text: '异步 IO', link: '/books/node-async-io' },
          ]
        },
        {
          text: '其他',
          items: [
            { text: '现代前端技术解析', link: '/books/modern-frontend' },
          ]
        }
      ],

      '/sports/': [
        {
          text: '游泳',
          items: [
            { text: '蛙泳入门：从零开始', link: '/sports/breaststroke-for-beginners' },
          ]
        }
      ],

      '/misc/': [
        {
          text: '杂项',
          items: [
            { text: '知识杂记', link: '/misc/notes' },
            { text: 'JavaScript 调试', link: '/misc/javascript-debugging' },
            { text: 'SSH 快速登录配置', link: '/misc/ssh-quick-login' },
            { text: '开发插件归纳', link: '/misc/dev-plugins-summary' },
          ]
        }
      ],

      '/mvvm/': [
        {
          text: '框架对比',
          items: [
            { text: 'React vs Vue', link: '/mvvm/react-vs-vue' },
          ]
        }
      ],

      '/ai-agent/': [
        {
          text: 'Spec-First 开发',
          items: [
            { text: '核心思想', link: '/ai-agent/spec-first/overview' },
            { text: '工作流程', link: '/ai-agent/spec-first/workflow' },
          ]
        },
        {
          text: 'Harness 工程',
          items: [
            { text: '核心思想', link: '/ai-agent/harness-engineering/core-concepts' },
            { text: '最佳实践', link: '/ai-agent/harness-engineering/best-practices' },
            { text: '质量控制对比', link: '/ai-agent/harness-engineering/quality-control-comparison' },
          ]
        },
        {
          text: 'Qoder 实践',
          items: [
            { text: '优化实践', link: '/ai-agent/qoder/optimization' },
          ]
        },
        {
          text: 'Prompt Engineering',
          items: [
            { text: '基础技巧', link: '/ai-agent/prompt-engineering/basics' },
            { text: '高级技巧', link: '/ai-agent/prompt-engineering/advanced' },
          ]
        },
        {
          text: 'RAG 检索增强',
          items: [
            { text: 'RAG 入门', link: '/ai-agent/rag/introduction' },
          ]
        }
      ]
    },

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://gitee.com/jun2333/front-end-knowledge-summary' }
    ],

    footer: {
      message: '',
      copyright: ''
    }
  },

  markdown: {
    // 使用 VitePress 内置的 Mermaid 支持
  },

  vite: {
    optimizeDeps: {
      include: ['mermaid']
    }
  }
})

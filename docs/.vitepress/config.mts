import { defineConfig } from 'vitepress'

// ==================== 环境区分：本地 / 线上 ====================
// 本地开发（pnpm dev）显示全量内容；线上构建（pnpm build）排除个人内容
const isProd = process.env.NODE_ENV === 'production'

// ---------- 本地专属内容：单一数据源 ----------
// 以后新增「仅本地」内容，只需在这里加一行，下面的四份配置会自动派生
//   path:   相对于 docs/ 的路径（目录或单文件）
//   isFile: 单篇文件（不填则按目录处理）
//   desc:   说明（仅供阅读）
const LOCAL_ONLY = [
  { path: 'sports', desc: '个人兴趣（乒乓球 / 游泳）' },
  { path: 'misc', desc: '杂项笔记' },
  { path: 'java-practice', desc: 'Java 学习实战（自用）' },
  { path: 'guide', desc: '指南类文章（自用，对外价值不高）' },
  { path: 'algorithms', desc: '算法笔记（质量待完善）' },
  { path: 'books', desc: '读书笔记（个人阅读记录，不公开）' },
  { path: 'service/roadmap.md', desc: '前端转全栈学习路线（自用）', isFile: true },
]

/** 'service/roadmap.md' → '/service/roadmap' */
const toSlug = (p: string) => '/' + p.replace(/\.md$/, '')

// ---------- 以下配置全部由 LOCAL_ONLY 派生，不要手写 ----------

// ① 生产环境不构建的路径（不进入产物，无法通过 URL 访问）
const LOCAL_ONLY_PATHS = LOCAL_ONLY.map((i) => (i.isFile ? i.path : `${i.path}/**`))

// ② 生产环境不显示的 sidebar 分组（目录级）
const LOCAL_ONLY_SIDEBAR_KEYS = LOCAL_ONLY.filter((i) => !i.isFile).map((i) => `/${i.path}/`)

// ③ 生产环境不显示的 sidebar 单条链接（文件级）
const LOCAL_ONLY_LINKS = LOCAL_ONLY.filter((i) => i.isFile).map((i) => toSlug(i.path))

// ④ 生产环境忽略的死链（其他文章里指向"已排除内容"的链接）
const IGNORED_DEAD_LINKS = LOCAL_ONLY.map(
  (i) => new RegExp(`^${toSlug(i.path)}${i.isFile ? '' : '\\/'}`),
)

// ---------- sidebar 过滤 ----------
interface SidebarItem {
  text?: string
  link?: string
  items?: SidebarItem[]
}

/** 生产环境过滤掉本地专属的分组与链接 */
function filterSidebar(sidebar: Record<string, SidebarItem[]>): Record<string, SidebarItem[]> {
  if (!isProd) return sidebar
  const result: Record<string, SidebarItem[]> = {}

  for (const [key, groups] of Object.entries(sidebar)) {
    if (LOCAL_ONLY_SIDEBAR_KEYS.includes(key)) continue

    const filtered = groups
      .map((group) => {
        // 兼容「直接链接」形式的条目（没有 items 字段）
        if (!group.items) return group
        return {
          ...group,
          items: group.items.filter((item) => !LOCAL_ONLY_LINKS.includes(item.link ?? '')),
        }
      })
      .filter((group) => !group.items || group.items.length > 0)

    // 整个路径下没有可见分组时，不保留空数组
    if (filtered.length > 0) result[key] = filtered
  }

  return result
}

// ---------- 顶部导航：本地版（全量） ----------
const localNav = [
  { text: 'AI Agent', link: '/ai-agent/' },
  {
    text: '前端', items: [
      { text: 'JavaScript', link: '/javascript/memory' },
      { text: 'Vue', link: '/vue/double-binding' },
      { text: 'React', link: '/react/concept' },
      { text: 'CSS', link: '/css/bfc' },
    ]
  },
  { text: '泛前端', link: '/frontend/hybrid' },
  { text: '浏览器', link: '/browser/overview' },
  {
    text: '工程化', items: [
      { text: '性能优化', link: '/performance/best-practices' },
      { text: '架构设计', link: '/engineering/micro-frontend' },
      { text: 'React vs Vue', link: '/engineering/react-vs-vue' },
    ]
  },
  {
    text: '后端', items: [
      { text: 'Service', link: '/service/roadmap' },
      { text: 'Java实战', link: '/java-practice/' },
    ]
  },
  { text: '算法', link: '/algorithms/basic' },
  {
    text: '个人记录', items: [
      { text: '读书笔记', link: '/books/js-you-dont-know' },
      { text: '运动', link: '/sports/breaststroke-for-beginners' },
      { text: '杂项', link: '/misc/notes' },
    ]
  },
]

// ---------- 顶部导航：线上版（去掉个人内容） ----------
const prodNav = [
  { text: 'AI Agent', link: '/ai-agent/' },
  {
    text: '前端', items: [
      { text: 'JavaScript', link: '/javascript/memory' },
      { text: 'Vue', link: '/vue/double-binding' },
      { text: 'React', link: '/react/concept' },
      { text: 'CSS', link: '/css/bfc' },
    ]
  },
  { text: '泛前端', link: '/frontend/hybrid' },
  { text: '浏览器', link: '/browser/overview' },
  {
    text: '工程化', items: [
      { text: '性能优化', link: '/performance/best-practices' },
      { text: '架构设计', link: '/engineering/micro-frontend' },
      { text: 'React vs Vue', link: '/engineering/react-vs-vue' },
    ]
  },
  { text: '后端', link: '/service/node-core' },
]

export default defineConfig({
  title: '知识库',
  description: '个人知识库',

  // GitHub Pages 子路径部署时需设置 base，否则静态资源 404：
  //   线上 https://jun2333.github.io/knowledge/ → BASE_PATH=/knowledge/（GitHub Actions 注入）
  //   本地开发 / 预览 → 默认 '/'
  base: process.env.BASE_PATH || '/',

  // 生产环境排除本地专属内容（不进入构建产物，无法通过 URL 访问）
  srcExclude: isProd ? LOCAL_ONLY_PATHS : [],

  // 生产环境忽略"指向已排除内容"的死链（本地开发仍会检查全部链接）
  ignoreDeadLinks: isProd ? IGNORED_DEAD_LINKS : false,

  themeConfig: {
    nav: isProd ? prodNav : localNav,

    sidebar: filterSidebar({
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
          text: '语言基础',
          items: [
            { text: '数据类型与内存管理', link: '/javascript/memory' },
            { text: '原型与继承', link: '/javascript/prototype' },
            { text: '闭包、作用域与 this', link: '/javascript/closure' },
            { text: 'ES6+ 新特性', link: '/javascript/es6' },
          ]
        },
        {
          text: '异步与运行时',
          items: [
            { text: '事件循环', link: '/javascript/event-loop' },
            { text: '异步编程与 Promise', link: '/javascript/async' },
            { text: '异步并发控制最佳实践', link: '/javascript/async-concurrency' },
          ]
        },
        {
          text: '工程实践',
          items: [
            { text: '模块化进化史', link: '/javascript/module' },
            { text: '设计模式', link: '/javascript/pubsub' },
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
          text: 'Next.js',
          items: [
            { text: 'Next.js 入门', link: '/react/nextjs' },
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
          text: '状态管理',
          items: [
            { text: 'Zustand（客户端状态）', link: '/react/zustand' },
            { text: 'TanStack Query（服务端状态）', link: '/react/tanstack-query' },
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
          text: '基础知识',
          items: [
            { text: 'DNS 域名系统', link: '/browser/dns' },
            { text: 'HTTP 协议演进', link: '/browser/http-history' },
            { text: 'TCP 协议', link: '/browser/tcp' },
            { text: 'HTTP Methods', link: '/browser/http-methods' },
            { text: 'HTTPS', link: '/browser/https' },
            { text: 'WebSocket', link: '/browser/websocket' },
            { text: 'SSE', link: '/browser/sse' },
            { text: '跨域通信', link: '/browser/cross-origin' },
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
          text: '安全',
          items: [
            { text: 'Web 安全常见攻击', link: '/browser/security' },
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
            { text: '首屏优化详解', link: '/performance/first-screen' },
            { text: '如何让网页更丝滑', link: '/performance/smooth' },
            { text: '大文件上传', link: '/performance/upload-idea' },
            { text: '长列表优化（虚拟滚动）', link: '/performance/virtual-list' },
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
            { text: '前端监控最佳实践', link: '/performance/monitoring' },
          ]
        }
      ],

      '/engineering/': [
        {
          text: '架构设计',
          items: [
            { text: '什么是架构师', link: '/engineering/architect' },
            { text: '微前端架构', link: '/engineering/micro-frontend' },
            { text: 'Islands 架构', link: '/engineering/islands' },
            { text: 'PWA 方案', link: '/engineering/pwa' },
            { text: '国际化方案', link: '/engineering/i18n' },
            { text: '渲染方式', link: '/engineering/rendering' },
            { text: 'BFF 层设计', link: '/engineering/bff' },
            { text: 'Server Components', link: '/engineering/server-components' },
            { text: 'Product Feature', link: '/engineering/product-feature' },
            { text: 'React vs Vue', link: '/engineering/react-vs-vue' },
          ]
        },
        {
          text: '前端构建',
          items: [
            { text: '工程构建优化', link: '/engineering/build-optimization' },
            { text: 'npm / yarn / pnpm 对比', link: '/engineering/package-managers' },
            { text: 'Monorepo 介绍与实践', link: '/engineering/monorepo' },
            { text: 'CI/CD 持续集成与部署', link: '/engineering/cicd' },
          ]
        },
        {
          text: '团队协作',
          items: [
            { text: 'Git Flow 最佳实践', link: '/engineering/git-flow' },
            { text: '团队管理最佳实践', link: '/engineering/team-management' },
          ]
        }
      ],

      '/frontend/': [
        {
          text: '大前端场景',
          items: [
            { text: 'Hybrid App 开发', link: '/frontend/hybrid' },
            { text: '小程序开发', link: '/frontend/mini-program' },
            { text: '桌面端应用', link: '/frontend/desktop' },
            { text: '原生 App 对比', link: '/frontend/native-app' },
          ]
        }
      ],

      '/service/': [
        {
          text: '学习路线',
          items: [
            { text: '前端转全栈学习路线', link: '/service/roadmap' },
          ]
        },
        {
          text: '后端基础',
          items: [
            { text: 'Node.js 入门', link: '/service/node-core' },
            { text: 'Java 入门', link: '/service/java-basics' },
            { text: '数据库基础', link: '/service/database' },
            { text: 'TypeORM 用法', link: '/service/typeorm' },
            { text: 'MySQL 进阶', link: '/service/mysql-advanced' },
            { text: 'MyBatis-Plus 入门', link: '/service/mybatis-plus' },
          ]
        },
        {
          text: 'Java 进阶',
          items: [
            { text: 'Java 并发编程', link: '/service/java-concurrency' },
            { text: '并发锁应用', link: '/service/concurrency-locks' },
            { text: '数据分布场景与锁设计', link: '/service/data-distribution-locks' },
            { text: 'JVM 入门', link: '/service/java-jvm' },
            { text: 'Java 集合源码', link: '/service/java-collections' },
            { text: 'Spring 核心原理', link: '/service/spring-principles' },
            { text: '设计模式', link: '/service/design-patterns' },
            { text: '线上问题排查', link: '/service/troubleshooting' },
          ]
        },
        {
          text: '中间件与分布式',
          items: [
            { text: 'Redis 入门', link: '/service/redis-intro' },
            { text: '消息队列（Kafka）入门', link: '/service/mq-intro' },
            { text: 'Elasticsearch 入门', link: '/service/elasticsearch' },
            { text: '分布式基础', link: '/service/distributed-basics' },
            { text: 'Spring Cloud 微服务', link: '/service/spring-cloud' },
          ]
        },
        {
          text: '高并发专题',
          items: [
            { text: 'Node.js 高并发与高可用设计', link: '/service/node-high-concurrency' },
            { text: 'Java（Spring Boot）高并发与高可用设计', link: '/service/java-high-concurrency' },
            { text: 'Node.js vs Java 后端选型', link: '/service/node-vs-java' },
          ]
        },
        {
          text: 'API 与安全',
          items: [
            { text: 'RESTful API 设计', link: '/service/restful-api' },
            { text: '认证与授权', link: '/service/auth' },
          ]
        },
        {
          text: '后端框架',
          items: [
            { text: 'Express 入门', link: '/service/express' },
            { text: 'Koa 入门', link: '/service/koa' },
            { text: 'Egg.js 入门', link: '/service/egg' },
            { text: 'NestJS 从入门到放弃', link: '/service/nest' },
            { text: 'Spring Boot 入门', link: '/service/spring-boot' },
            { text: 'Fastify 入门', link: '/service/fastify' },
          ]
        },
        {
          text: '架构设计',
          items: [
            { text: 'BFF 架构设计', link: '/service/bff' },
            { text: '权限设计', link: '/service/permission-design' },
            { text: '短链接服务设计', link: '/service/short-url-design' },
            { text: 'GraphQL 入门', link: '/service/graphql' },
            { text: 'Serverless 入门', link: '/service/serverless' },
          ]
        },
        {
          text: '工程化与部署',
          items: [
            { text: 'Docker 入门', link: '/service/docker' },
            { text: 'PM2 进程管理', link: '/service/pm2' },
            { text: 'Node.js 服务部署最佳实践', link: '/service/node-deployment' },
            { text: 'Java 服务部署最佳实践', link: '/service/java-deployment' },
            { text: '后端测试实践', link: '/service/backend-testing' },
            { text: 'Linux 常用命令', link: '/service/linux-basics' },
          ]
        }
      ],

      '/java-practice/': [
        {
          text: '学习计划',
          items: [
            { text: '整体计划（路线图）', link: '/java-practice/' },
            { text: 'IDEA 使用指南', link: '/java-practice/08-intellij-idea' },
          ]
        },
        {
          text: '阶段指南',
          items: [
            { text: '阶段 1：请求全链路', link: '/java-practice/01-run-and-trace-request' },
            { text: '阶段 2：CRUD 模块', link: '/java-practice/02-crud-module' },
            { text: '阶段 3：数据访问与事务', link: '/java-practice/03-data-access-transaction' },
            { text: '阶段 4：Redis 缓存', link: '/java-practice/04-redis-cache' },
            { text: '阶段 5：安全与权限', link: '/java-practice/05-security-auth' },
            { text: '阶段 6：动手开发', link: '/java-practice/06-build-new-feature' },
            { text: '阶段 7：12306 微服务', link: '/java-practice/07-microservice-12306' },
            { text: '📌 收获记录', link: '/java-practice/harvest' },
            { text: '📦 部署流程与最佳实践', link: '/java-practice/09-deployment-practice' },
          ]
        },
        {
          text: '📐 mall 设计记录',
          items: [
            { text: '权限设计（RBAC + 动态权限）', link: '/java-practice/mall-design/01-permission-design' },
            { text: 'Token 失效设计（版本号 + jti 黑名单）', link: '/java-practice/mall-design/02-token-invalidation-design' },
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
        },
        {
          text: '乒乓球',
          items: [
            { text: '专业术语入门', link: '/sports/table-tennis-glossary' },
            { text: '胶皮选择指南', link: '/sports/table-tennis-rubber' },
            { text: '底板选择指南', link: '/sports/table-tennis-blade' },
            { text: '搭配与保养指南', link: '/sports/table-tennis-racket-setup' },
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
        },
        {
          text: '个人记录',
          items: [
            { text: '自研模板编辑器', link: '/misc/template-editor' },
            { text: '架构叙事：客服平台', link: '/misc/arch-narrative-customer-platform' },
            { text: '架构叙事：SaaS 与 AI 工程化', link: '/misc/arch-narrative-saas-ai' },
          ]
        }
      ],

      '/ai-agent/': [
        {
          text: 'AI 应用开发',
          items: [
            { text: '名词解释', link: '/ai-agent/glossary' },
            { text: '大模型全景介绍', link: '/ai-agent/llm-landscape' },
            { text: 'LLM API 调用基础', link: '/ai-agent/llm-api-basics' },
            { text: 'Function Calling 与工具调用', link: '/ai-agent/function-calling' },
            { text: '知识库引入 Function Calling（RAG 升级）', link: '/ai-agent/function-calling-rag-upgrade' },
            { text: '自研 Agent CLI 设计', link: '/ai-agent/self-built-cli' },
            { text: 'AI 应用架构模式', link: '/ai-agent/app-architecture' },
            { text: 'LangChain 框架介绍', link: '/ai-agent/langchain-introduction' },
            { text: 'AI 应用工程化实践', link: '/ai-agent/app-engineering' },
            { text: 'Python 基础语法速成', link: '/ai-agent/python-basics' },
            { text: 'Python AI 生态入门', link: '/ai-agent/python-ai-ecosystem' },
          ]
        },
        {
          text: 'Prompt Engineering',
          items: [
            { text: '基础技巧', link: '/ai-agent/prompt-engineering/basics' },
            { text: '高级技巧', link: '/ai-agent/prompt-engineering/advanced' },
            { text: 'Skill：文件化的提示词工程', link: '/ai-agent/prompt-engineering/skills' },
          ]
        },
        {
          text: 'RAG 检索增强',
          items: [
            { text: 'RAG 入门', link: '/ai-agent/rag/introduction' },
            { text: 'AI 知识库实战', link: '/ai-agent/rag/knowledge-base' },
          ]
        },
        {
          text: 'Spec-First 开发',
          items: [
            { text: 'Spec-First 指南', link: '/ai-agent/spec-first/guide' },
          ]
        },
        {
          text: 'Harness 工程',
          items: [
            { text: '核心思想', link: '/ai-agent/harness-engineering/core-concepts' },
            { text: '最佳实践', link: '/ai-agent/harness-engineering/best-practices' },
            { text: '质量控制对比', link: '/ai-agent/harness-engineering/quality-control' },
            { text: 'dev-agent-harness 项目介绍', link: '/ai-agent/harness-engineering/dev-agent-harness' },
            { text: '引入 Function Calling 计划', link: '/ai-agent/harness-engineering/function-calling-upgrade' },
          ]
        },
        {
          text: '案例研究',
          items: [
            { text: 'Qoder 优化实践', link: '/ai-agent/case-studies/qoder' },
            { text: 'DeepSeek Harness 案例研究', link: '/ai-agent/case-studies/deepseek-harness' },
            { text: 'Claude Code 记忆机制', link: '/ai-agent/case-studies/claude-code-memory' },
          ]
        }
      ]
    }),

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jun2333/knowledge' }
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

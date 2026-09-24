# 02 · 文档站（docs）

> 目标：搞清 `docs/` 这个包是怎么组织的——VitePress 配置里最有价值的三个设计、主题扩展做了什么、构建和部署怎么跑通。

## 一、VitePress 在这里扮演什么角色

VitePress 把 `docs/` 下的 Markdown 编译成静态站点，同时提供：

- 侧边栏 / 导航（在 `config.mts` 里显式配置）
- 本地全文搜索（`search.provider: 'local'`）
- 主题扩展能力（我们靠它挂了 Mermaid 渲染和 AI 聊天）

它是**纯静态**的：所有页面在构建期生成，没有运行时后端依赖。

## 二、配置核心：`config.mts`

位置：`docs/.vitepress/config.mts`。这里有三个值得看的设计。

### 设计 1：base 与子路径部署

站点部署在 GitHub Pages 的**子路径** `https://jun2333.github.io/knowledge/`，所以 base 不能写死：

```ts
base: process.env.BASE_PATH || '/',
```

- 本地开发：`BASE_PATH` 不设 → base 为 `/`
- 线上构建：注入 `BASE_PATH=/knowledge/` → 资源路径自动变成 `/knowledge/assets/...`

> 这个变量必须**构建期**注入。构建后 base 就写死在产物里了，预览时也要用同样的值（见本节末尾的"预览"）。

### 设计 2：nav 兼任"仅本地"的唯一来源

有些内容是个人隐私（读书笔记、面试题、运动、杂项等），本地要看、线上不公开。做法是**让 `site.nav` 兼任唯一配置**：给导航项加 `onlyLocal`，它既在线上隐藏，其路径又会被排除出编译 / sidebar / 死链检查——**只维护 nav 一份**，不用再单独维护"哪些是私密内容"的列表：

```js
// knowledge.config.mjs（实例配置，唯一入口）
site: {
  nav: [
    { text: '算法', link: '/algorithms/basic', onlyLocal: 'algorithms' },            // 整个目录
    { text: 'Service', link: '/service/roadmap', onlyLocal: 'service/roadmap.md' }, // 单个文件
    { text: '个人记录', onlyLocal: ['books', 'resume'], items: [ /* … */ ] },        // 多项
  ],
}
```

```ts
// 实例的 docs/.vitepress/config.mts（全部逻辑在基座包 @kb/site 里）
import { defineSite } from '@kb/site'
import instanceConfig from '../../knowledge.config.mjs'
import manualSidebar from './sidebar.manual.mts'

export default defineSite({
  config: instanceConfig,
  manualSidebar,
  metaUrl: import.meta.url,
  mode: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  includeLocal: process.env.INCLUDE_LOCAL === '1',
})
```

`@kb/site` 的 `defineSite()` 内部从 nav 派生四份配置：

 ```js
// 基座 @kb/site 的 config/define-site.mjs（节选）
const navSource = site.nav?.length ? site.nav : buildAutoNav({ contentRoot, labels: categories })
const {
  paths,        // → srcExclude（生产不构建）
  sidebarKeys,  // → 侧边栏分组过滤
  links,        // → 侧边栏单条链接过滤
  deadLinks,    // → ignoreDeadLinks
} = deriveLocalOnly(resolveLocalEntries(collectLocalPaths(navSource), contentRoot))
```

派生出四份配置各自负责：

| 派生结果 | 作用 |
|---------|------|
| `LOCAL_ONLY_PATHS` | 交给 `srcExclude`，生产**不构建**这些路径（无法通过 URL 访问） |
| `LOCAL_ONLY_SIDEBAR_KEYS` | 过滤掉对应的侧边栏分组 |
| `LOCAL_ONLY_LINKS` | 过滤掉单文件形式的侧边栏条目 |
| `IGNORED_DEAD_LINKS` | 忽略"其他文章指向这些被排除内容"的死链，否则构建会失败 |

**以后要新增"仅本地"内容，只需要在 nav 给它加 `onlyLocal: '路径'`**（目录 / 文件自动识别），其余自动生效——这是这份配置最值得学的地方。

### 设计 3：环境判断与临时开关

```ts
const isProd = process.env.NODE_ENV === 'production'      // build 时为 true，dev 时为 false
const includeLocal = process.env.INCLUDE_LOCAL === '1'     // 临时开关
const excludeLocal = isProd && !includeLocal               // 是否排除本地专属内容
```

然后统一用 `excludeLocal` 驱动：

```ts
srcExclude: excludeLocal ? LOCAL_ONLY_PATHS : [],
nav,
ignoreDeadLinks: isProd
  ? excludeLocal
    ? IGNORED_DEAD_LINKS
    : [...IGNORED_DEAD_LINKS, /localhost/]
  : false,
```

其中 `nav` 由**同一份 `site.nav`** 派生，本地 / 线上共用：

```ts
// buildNav：过滤 onlyLocal 项 → 空分组移除 → 只剩 1 项的分组提到顶层（用子项名字）
const nav = buildNav(navSource, { excludeLocal })
```

于是有三种行为：

| 场景 | `excludeLocal` | 结果 |
|------|---------------|------|
| `pnpm dev`（本地） | false | 全量内容、全量菜单 |
| `pnpm build`（默认） | true | 排除本地专属内容、过滤 `onlyLocal` 项 |
| `INCLUDE_LOCAL=1 pnpm build` | false | **线上也全量**（临时用，比如自己看） |

> 全量模式下额外忽略 `/localhost/` 死链，因为面试题里有指向本地调试地址的链接。

> **导航与侧边栏都支持"从内容目录自动生成"**（基座能力，见 `@kb/site` 的 `config/nav.mjs`、`config/sidebar.mjs`）：`site.nav` 留空则按内容目录自动生成极简导航；`site.autoSidebar: true` 时 sidebar 也自动生成、手写项优先覆盖。本实例保留了精修的 sidebar。

侧边栏过滤函数同样只认 `excludeLocal`：

```ts
function filterSidebar(sidebar: Record<string, SidebarItem[]>) {
  if (!excludeLocal) return sidebar
  // ...过滤掉 LOCAL_ONLY 的分组与链接
}
```

## 三、首页跳转：`docs/index.md`

首页是个"跳板"，自动跳到 AI Agent 分类：

```md
---
layout: home
---

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // BASE_URL 由 Vite 在构建时注入（本地 /，线上 /knowledge/），比 router.go 更可靠
  const base = import.meta.env.BASE_URL || '/'
  window.location.replace(base + 'ai-agent/')
})
</script>
```

为什么用 `import.meta.env.BASE_URL` 而不是 `router.go('/ai-agent/')`：后者在子路径部署下会跳到 `/ai-agent/`（丢掉 `/knowledge` 前缀）导致 404。

## 四、主题扩展

入口 `docs/.vitepress/theme/`：

| 文件 | 作用 |
|------|------|
| `index.js` | 扩展默认主题；客户端按需加载 Mermaid 并渲染图表 |
| `Layout.vue` | 在 `#layout-bottom` 插槽挂入批注系统和 AI 聊天 |
| `components/AIChat.vue` | 聊天面板 UI |
| `composables/useAIChat.ts` | 聊天逻辑（SSE 解析），详见 [04 篇](./04-agent-chat.md) |
| `components/AnnotationSystem.vue` + `useAnnotations.js` | 选中文本加批注，存 LocalStorage |

### Mermaid 渲染

`theme/index.js` 里的思路：把 ```mermaid 代码块渲染成 SVG，并支持点击放大。

```js
router.onAfterRouteChanged = () => {
  setTimeout(() => renderMermaid(), 100)
}
```

要点是**路由切换后要重新渲染**（VitePress 是 SPA，切页不会重新执行脚本），且渲染后要打标记避免重复渲染。

### 只在本地挂 AI 功能

```vue
<script setup>
const isProd = import.meta.env.PROD
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <AnnotationSystem v-if="!isProd" />
      <AIChat v-if="!isProd" />
    </template>
  </Layout>
</template>
```

因为**后端服务没有线上部署**（只有本地 `localhost:3000`），线上挂上去也调不通，所以生产环境直接不渲染。

## 五、构建、预览与部署

### 构建

根 `package.json`：

```json
"build": "BASE_PATH=${BASE_PATH:-/knowledge/} pnpm --filter @kb/site build"
```

`${BASE_PATH:-/knowledge/}` 是"默认 `/knowledge/`，允许外部覆盖"的写法，保证平时不用记着加环境变量。

### 预览

```json
"preview": "BASE_PATH=/knowledge/ pnpm --filter @kb/site preview"
```

**必须和构建用同一个 `BASE_PATH`**，否则服务器在 `/` 下服务、产物里的资源却是 `/knowledge/...`，就会满屏 404。访问时也要带路径：`http://localhost:4173/knowledge/`。

### 部署（`scripts/deploy-github.sh`）

不走 GitHub Actions（账号有 billing 限制），改为本地构建后把产物推到 `gh-pages` 分支：

```bash
BASE_PATH=/knowledge/ pnpm build      # ① 构建

cd "$DIST_DIR"                         # ② 在 dist 里建独立 git 仓库
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push -f "$REMOTE" gh-pages:gh-pages
```

为什么在 `dist/` 里另建仓库：主仓库的 `gh-pages` 分支要只有构建产物，而 `dist/` 本身被 gitignore，两者互不影响。

> GitHub Pages 对仓库名是 `knowledge` 的项目页，站点天然挂在 `/knowledge/` 子路径，正好和 VitePress 的 base 对上。

## 六、面试题是怎么进来的

面试题原文在 `resume/interview-questions/`，通过 `scripts/sync-interview-questions.mjs` 同步到 `docs/interview-questions/`（同时生成 `index.md` 目录首页）。

为什么不能直接用软链接或原样复制：这些笔记里含有 Vue 模板语法和裸 HTML 标签，会被 VitePress 的 Vue 编译器当成要编译的东西而构建失败。脚本会在复制时做转义。细节见 [05 · 设计决策与踩坑](./05-decisions.md)。

---

**下一篇**：[03 · 后端与 RAG 检索](./03-server-rag.md)

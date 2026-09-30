# 02 · 文档站（docs）

> 目标：搞清 `docs/` 这个包是怎么组织的——VitePress 配置里最有价值的四个设计、主题扩展做了什么、**内容怎么导入和归档**、构建和部署怎么跑通。

## 一、VitePress 在这里扮演什么角色

VitePress 把 `docs/` 下的 Markdown 编译成静态站点，同时提供：

- 侧边栏 / 导航（由基座 `@minijun/kb-site` 从目录结构派生，或按 `menu.config.mjs` 渲染）
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

### 设计 2：菜单与侧边栏——默认按目录推导，需要时"导出即接管"

**默认行为（约定大于配置，不用配）**：

| 位置 | 结果 |
|---|---|
| `docs/A/` | 菜单一项「A」，名字取目录名（`categories` 可覆写显示名） |
| `docs/A/index.md` | 点菜单进这一页；没有就取 A 里第一篇 |
| 同一层有 **≥2 篇**页面 | 该层自动获得一份侧边栏（任意层级都算） |
| 只有 1 篇的目录 | 不给侧边栏（一条的导航没意义） |

侧边栏条目：子目录折叠成组，`index.md` 排最前，其余按文件名；标题取 `frontmatter.title` → 正文 h1 → 文件名。

**想完全接管**（分组菜单、外链、自定义顺序与名字）：跑 `pnpm kb menu:export` 生成实例根的 `menu.config.mjs` 再改。

> **关键语义：有配置文件就完全按配置渲染，不做任何兜底。** 不混合"自动 + 手写"是有意为之——混合时"哪一项真正生效"很难讲清，实例里就踩过"把开关关掉却还是手写生效"的困惑。

```ts
// 实例的 docs/.vitepress/config.mts（全部逻辑在基座包 @minijun/kb-site 里）
import { fileURLToPath } from 'node:url'
import { defineSite } from '@minijun/kb-site'
import { loadMenu } from '@minijun/kb-site/config/menu.mjs'
import instanceConfig from '../../knowledge.config.mjs'

// 顶层 await：VitePress 的配置支持；没有 menu.config.mjs 时返回 null → 走默认推导
const menu = await loadMenu(fileURLToPath(new URL('../../', import.meta.url)))

export default defineSite({
  config: instanceConfig,
  menu,
  metaUrl: import.meta.url,
  mode: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  includeLocal: process.env.INCLUDE_LOCAL === '1',
})
```

### 设计 3：「仅本地」是内容策略，不挂在菜单上

有些内容是个人隐私（读书笔记、面试题、运动、杂项等），本地要看、线上不公开。这属于**内容策略**，单独写在 `knowledge.config.mjs` 的 `site.onlyLocal` 里——和"菜单怎么排"是两件事：

```js
// knowledge.config.mjs
site: {
  // 相对 docs/ 的路径，目录或文件都行（可省略 .md）
  onlyLocal: ['algorithms', 'resume', 'service/roadmap.md'],
}
```

`defineSite()` 由它派生四份配置（`local-only.mjs`）：

```js
const derived = deriveLocalOnly(resolveLocalEntries(site.onlyLocal ?? [], contentRoot))
// paths       → srcExclude（生产不构建，URL 访问不到）
// prefixes    → 菜单过滤：link 落在这些前缀下的项线上隐藏
// sidebarKeys → 侧边栏分组过滤（目录级）
// links       → 侧边栏单条链接过滤（文件级）
// deadLinks   → ignoreDeadLinks（其他文章指向被排除内容的死链）
```

| 派生结果 | 作用 |
|---------|------|
| `paths` | 交给 `srcExclude`，生产**不构建**这些路径（无法通过 URL 访问） |
| `prefixes` | 过滤落在其下的菜单项（分组空了就移除、只剩 1 项就提到顶层） |
| `sidebarKeys` | 过滤掉对应的侧边栏分组 |
| `links` | 过滤掉单文件形式的侧边栏条目 |
| `deadLinks` | 忽略"其他文章指向这些被排除内容"的死链，否则构建会失败 |

**以后要新增"仅本地"内容，只在这一个数组里加一条**（目录 / 文件自动识别），菜单、侧边栏、编译、死链全部自动跟上。

### 设计 4：环境判断与临时开关

```ts
const isProd = process.env.NODE_ENV === 'production'      // build 时为 true，dev 时为 false
const includeLocal = process.env.INCLUDE_LOCAL === '1'     // 临时开关
const excludeLocal = isProd && !includeLocal               // 是否排除本地专属内容
```

然后统一用 `excludeLocal` 驱动：

```ts
srcExclude: excludeLocal ? derived.paths : [],
nav,                                    // buildNav 已按 derived.prefixes 过滤
ignoreDeadLinks: isProd
  ? excludeLocal
    ? derived.deadLinks
    : [...derived.deadLinks, /localhost/]
  : false,
```

菜单与侧边栏的过滤也都只认 `excludeLocal`：

```ts
// buildNav：link 落在仅本地前缀下的项线上隐藏 → 空分组移除 → 只剩 1 项的分组提到顶层
const nav = buildNav(navSource, { excludeLocal, hiddenPrefixes: derived.prefixes })

// filterSidebar：过滤掉仅本地的分组（key）与单文件链接
sidebar: filterSidebar(sidebarData, { excludeLocal, sidebarKeys, links })
```

于是有三种行为：

| 场景 | `excludeLocal` | 结果 |
|------|---------------|------|
| `pnpm dev`（本地） | false | 全量内容、全量菜单 |
| `pnpm build`（默认） | true | 排除仅本地内容、过滤落在其下的菜单项 |
| `INCLUDE_LOCAL=1 pnpm build` | false | **线上也全量**（临时用，比如自己看） |

> 全量模式下额外忽略 `/localhost/` 死链，因为面试题里有指向本地调试地址的链接。

## 三、首页：`docs/index.md`

首页是一个 `layout: home` 的 hero 页：大标题 + 一句话 + 一个「快速上手」按钮 + 4 张特性卡 + 一份"五步跑起来"的命令清单。

它**不是 `kb init` 拼字符串拼出来的**，而是骨架里的一个模板文件（`@minijun/kb-core` 的 `templates/instance/docs/index.md`）。`kb init` 把整个骨架 `cpSync` 过去，再只做一件事：**把 `{{name}}` 换成实例名**：

```js
// @minijun/kb-core 的 init.ts
fs.writeFileSync(file, src.replaceAll('{{name}}', () => o.name))
```

> 想改首页长什么样（改文案、加卡片、换按钮）→ **改模板文件**，别去改 `init.ts`。

### GitHub 按钮从配置派生，不写死在首页里

hero 的 `actions` 里只有「快速上手」。**GitHub 按钮是算出来的**——`defineSite` 在 `transformPageData` 里读 `site.socialLinks`：

```js
// @minijun/kb-site/config/define-site.mjs
function githubHeroAction(site) {
  const link = (site.socialLinks ?? []).find((s) => s?.icon === 'github')?.link
  return link ? { theme: 'alt', text: 'GitHub', link } : null
}
```

所以在 `knowledge.config.mjs` 里配**一次**：

```js
site: {
  socialLinks: [{ icon: 'github', link: 'https://github.com/你的用户名/你的仓库' }],
}
```

**仓库地址只写这一处，却喂了两处展示**：首页 hero 的 GitHub 按钮、右上角的图标。

- **不配** → 两处都不出现（不会留下指向空地址的死按钮）
- 首页里已经自己写了 GitHub 按钮 → 不会重复加（按 link 和文字判断）

> 为什么不让首页自己写 URL：那是"同一个事实写两遍"。首页还是**会被 `kb init` 复制给每个人的模板**，把某个人的仓库地址写进去，等于把个人信息固化进模板。

> 顺带一个子路径部署的坑（以后要在 `docs/` 里加客户端跳转时会用到）：跳转要用 `import.meta.env.BASE_URL` 拼前缀，**不能**写 `router.go('/xxx/')` —— 后者在 `BASE_PATH=/knowledge/` 下会丢掉前缀，跳成 404。

## 四、主题扩展

实例的入口 `docs/.vitepress/theme/index.js` **只有两行**——主题实体在基座包 `@minijun/kb-site` 里：

```js
// docs/.vitepress/theme/index.js（实例）
export { default } from '@minijun/kb-site/theme'
```

`@minijun/kb-site/theme/` 下：

| 文件 | 作用 |
|------|------|
| `index.js` | 扩展默认主题；客户端按需加载 Mermaid 并渲染图表（含点击放大弹层） |
| `Layout.vue` | 在 `#layout-bottom` 插槽挂入批注 / AI 助手 / 内容管理；生产环境整体关掉 |
| `components/AIChat.vue` | 聊天面板 UI |
| `composables/useAIChat.ts` | 聊天逻辑（SSE 解析），详见 [04 篇](./04-agent-chat.md) |
| `components/AnnotationSystem.vue` + `composables/useAnnotations.js` | 选中文本加批注，存 LocalStorage |
| `components/ManagePanel.vue`（+ `ImportTab` / `ArchiveTab`） | 「内容管理」面板：导入 Markdown、归档到分类、从收件箱删除 |
| `components/ToastHost.vue` + `composables/useToast.ts` | 全站共用的右上角提示（toast） |

实例想定制主题时，在 `theme/index.js` 里包一层再导出即可——这也是它留成两行的原因。

### 共享 UI 基础：遮罩与 toast

三个面板（批注 / AI 助手 / 内容管理）加上两个批注对话框，**不再各写一份遮罩样式**，统一用 `custom.css` 里的两个类，层级也集中在一处定义：

```css
.kb-overlay          /* 面板遮罩：rgba(0,0,0,.15)，z-index 999 */
.kb-overlay-dialog   /* 对话框遮罩：更重 + 居中，z-index 2000 */
```

toast 同理：`useToast.ts` 只存一份数据（模块级单例），`ToastHost.vue` 渲染一次并 `Teleport` 到 `body`，从右侧滑入、几秒后自动消失、点一下就关。之前是**两套实现**（一个 `document.createElement` 直插 DOM、一个面板内嵌提示条），样式和位置都不一致。

> **一个容易踩的坑**：`.kb-overlay` 带了 `z-index`，所以它**必须和面板容器平级**，不能塞进一个自身有 `z-index` 的容器里 ——
> 那样容器会形成层叠上下文，遮罩（999）反而把没设 `z-index` 的面板（auto）压住，表现为"整个弹窗被遮罩盖住"。
> 三个面板里 `ManagePanel` 就踩过这个（它原本遮罩和面板在同一个 `.mg-root` 里），修法是把遮罩挪出来当兄弟节点。

### Mermaid 渲染

`theme/index.js` 里的思路：把 ```mermaid 代码块渲染成 SVG，并支持点击放大。

```js
router.onAfterRouteChanged = () => {
  setTimeout(() => renderMermaid(), 100)
}
```

要点是**路由切换后要重新渲染**（VitePress 是 SPA，切页不会重新执行脚本），且渲染后要打标记避免重复渲染。

### 只在本地挂 AI 功能

`@minijun/kb-site/theme/Layout.vue`：

```vue
<script setup>
const isProd = import.meta.env.PROD
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <AnnotationSystem v-if="!isProd" />
      <AIChat v-if="!isProd" />
      <ManagePanel v-if="!isProd" />
    </template>
  </Layout>
</template>
```

因为**后端服务没有线上部署**（只有本地 `localhost:3000`），线上挂上去也调不通，所以生产环境直接不渲染。

> 「内容管理」面板还会**写文件**（导入 / 归档），线上更不该暴露——这是它只能本地跑的第二个理由。

## 五、构建、预览与部署

### 构建

根 `package.json`：

```json
"build": "BASE_PATH=${BASE_PATH:-/knowledge/} kb build"
```

`${BASE_PATH:-/knowledge/}` 是"默认 `/knowledge/`，允许外部覆盖"的写法，保证平时不用记着加环境变量。

### 预览

```json
"preview": "BASE_PATH=/knowledge/ kb preview"
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

## 六、内容管理：导入与归档

前面几节讲的都是"站点怎么渲染"；这一节讲**内容怎么进来**——由站点右下角的 **➕「内容管理」** 面板承担（本地开发时才显示，因为它是**会写文件**的界面）。

它解决的是一个很实际的问题：你的笔记本来散落在别处，目录名可能带 `#`、有嵌套、混着图片和 `index.md`。手工搬进 `docs/` 很容易漏和错，所以把"搬"拆成**导入 → 归档**两步。

### 第一步：导入（把笔记搬进收件箱）

交互是**三步**，关键是中间那步"预检"——**先让你看清会发生什么，再决定要不要落盘**：

| 步 | 做什么 |
|---|---|
| 1 · 选来源 | 选**文件夹**、选**多个文件**，或直接**拖进来**。**可以反复选，会累加到同一份清单**（不用一次挑完） |
| 2 · 预检 | 显示：本次的**待导入清单**（可逐项 ✕ 移除，移除后自动重算）、会新增哪些分类、哪些文件**重名冲突**、哪些会被**改名**、哪些被**忽略**，以及**图片引用警告**（图片不会被一起搬，可能裂图）。这一步**只读盘不写盘** |
| 3 · 执行 | 落盘到 `docs/imported/`；然后可以一键**建立索引**（SSE 实时进度） |

> 每步的操作按钮都在**面板右下角**（`返回` / `确认导入` / `建立索引`），位置固定，不用跟着内容找。

落盘规则（`@minijun/kb-core` 的 `import.ts`）：

| 规则 | 说明 |
|---|---|
| **只收 `.md`** | 非 Markdown 一律忽略；图片、附件不会进库（所以预检会提示"这里有图片引用"） |
| **排除** | `.git` / `node_modules` / `.vitepress` / `dist` / `public` / 隐藏文件 |
| **`index.md` 跳过** | 它会和站点首页冲突 |
| **保留结构，剥掉顶层** | 保留被选目录内部的相对结构；若所有文件都在同一个顶层目录下，就剥掉那层（避免多出一层没意义的目录名） |
| **文件名规范化** | 只处理会破坏 URL / 文件系统的字符（`#?%&+:*"<>|`、空白、首尾点横线），**中文原样保留**。例：`C#泛型.md` → `C-泛型.md` |
| **冲突策略** | `skip`（默认）/ `rename`（自动加 `-2`）/ `overwrite` |

> **源目录永不被修改**——这是"复制"语义，不是"移动"。所以试错零成本。

### 第二步：归档（从收件箱归到分类）

归档面板是**左右两栏**：左边是 `docs/imported/` 下的待归档树，右边是现有分类（**分类就是 `docs/` 下的一个目录**）。

> 面板只有两个 tab（导入 / 归档），而**「归档」只在收件箱非空时才出现** —— 没有待归档内容时点进去也做不了什么；面板打开时默认落在「导入」（收件箱刚被清空时也会自动切回去）。

- 勾选批量归档，或**把条目拖到右边的分类上**
- **文件**归档 → 打平到分类目录下；**目录**归档 → 保留内部结构
- **同名目录会合并**，不会变成 `前端/前端/`
- **删掉不需要的**：收件箱里总会混进几篇不要的（临时笔记、跑题内容），与其归档脏了分类，不如直接删 —— 「删除」按钮要**二次确认**
- 收件箱里**还有东西时**，站点导航会自动多出一项「待归档」（方便预览）；清空后自动消失

> 想新建分类？**直接在文件系统里建一个目录**就行——分类就是目录，没有"新建分类"这个概念。

### 接口一览

| 接口 | 作用 |
|---|---|
| `POST /api/import/scan` | 预检（只读） |
| `POST /api/import/execute` | 执行导入 |
| `GET /api/import/stat` | 收件箱待归档数量（导航徽标用） |
| `GET /api/manage/tree` | 收件箱树 + 现有分类 |
| `POST /api/manage/archive` · `/delete` | 归档到分类 / 从收件箱删除 |
| `POST /api/index` | 建立索引，**SSE 流式**推进度 |

命令行是同一套逻辑（`@minijun/kb-core` 里服务端与 CLI 共用 `import.ts` / `manage.ts`）：

```bash
pnpm kb import <目录> --dry-run     # 预检：看看会发生什么
pnpm kb import <目录>               # 真正导入
```

### ⚠️ 归档不会自动更新索引

导入、归档、删除**都只动文件**，不碰向量库。所以整理完要显式更新一次索引 —— 否则 AI 还搜不到刚搬进来的内容。

**入口是面板底部那条常驻状态栏**（左侧状态、右侧「更新索引」按钮），**不挂在任何 tab 上**。这一点是踩过的：

> 索引过期可能由导入 / 归档 / 删除里任何一件事引起，而「归档」tab 在收件箱空时是不显示的
> —— 早先把按钮放在归档 tab 里，出现了"把文章都归档完 → tab 消失 → 想更新索引却够不着"。

状态栏有四种状态：`内容有改动，索引未更新`（黄）→ `正在建立索引…` + 最后一行进度（形如"已写入 300/2772"）→ `索引已更新 ✅`；失败时显示 `索引失败：…`（红）并弹右上角提示。

命令行等价：`pnpm index`。

> 为什么不做成自动：索引要调本地模型、可能要几十秒到几分钟，**不该在你每次拖一个文件时悄悄触发**。宁可多一次点击，也别让"界面卡住但不说在干嘛"。

**如果向量库没起会怎样**（点了「更新索引」但忘了 `pnpm chroma:start`）：

- 会**立刻失败并说清原因** —— "连不上向量库（http://localhost:8000）—— 先在项目里把它启动起来：`pnpm chroma:start`"，面板里也会红字显示 + 右上角提示
- **不会留下"看起来索引好了"的假象**：`index-manifest.json` 是**最后一步**才写的，中途失败就中止 → 清单里还是旧的内容哈希。
  所以向量库起来之后再点一次，它会正确识别出"变更 N 个"并**增量补齐**，不需要手动全量重建
- 索引开始前会先 `heartbeat()` 探一下向量库。不探的话有三个后果：报错是底层英文异常；
  "连不上"会被 `getCollection` 的 catch 误判成"集合不存在"而**静默转成全量重建**；等向量库回来就会白删一次集合
- **清单和向量库不一致时会自愈**：清单只记录"文件内容没变"，证明不了"库里真有向量"。
  所以"没有变更 → 已是最新"这条捷径会先**实物核对** `collection.count()`；库是空的（换过库 / 集合被清过）
  就改走全量重建，并把原因打印出来。不加这一步的话，界面会显示"索引已更新 ✅"而 AI 其实什么都搜不到

### ⚠️ 导航和侧边栏要重启 dev 才会变

**菜单/侧边栏是在 VitePress 加载站点配置时算出来的**（`defineSite` 读目录结构），运行期不会重算。所以这几件事**不会立刻**反映到导航上：

- 导入后收件箱从空变非空 → 导航里该多出「待归档」
- 归档时顺手创建了新分类目录 → 导航里该多出那个分类
- 收件箱清空 → 「待归档」该消失

内容其实**已经落盘了**（刷新页面就能看到文件），只是导航还没跟着重算。面板会在这些时机用**右上角提示**告诉你"重启 `pnpm dev` 才会更新"，别误以为操作失败。

> 同一个原因：`menu.config.mjs`（以及 `@minijun/kb-site` 的所有配置代码）也**不参与热更新** ——
> 它不在 VitePress 的"配置依赖监听清单"里（那份清单只有 `docs/.vitepress/config.mts` 和 `knowledge.config.mjs`，
> 因为 `menu.config.mjs` 是由 `loadMenu()` **动态 import** 的，esbuild 静态分析看不到）。
> 所以改完菜单配置、或改完基座的 `define-site.mjs`，都要**重启 dev**。

---


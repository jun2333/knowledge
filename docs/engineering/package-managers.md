---
title: npm / yarn / pnpm 包管理器对比
date: 2026-08-06
---

# npm / yarn / pnpm 包管理器对比

npm、yarn、pnpm 是前端最主流的三个包管理器，核心差异在于 **node_modules 的组织结构**。

## 一句话总结

**npm 是默认、yarn 是速度革命、pnpm 是结构革命**——pnpm 用"全局 store + 硬链接 + 严格依赖树"同时解决磁盘占用和幽灵依赖，是 Monorepo 时代的主流选择。

## 发展史：为什么会有 yarn 和 pnpm

```
npm 2（2011）     嵌套 node_modules → 目录深、安装慢、Windows 路径超长
npm 3+（2015）    扁平化 node_modules → 快，但引入幽灵依赖
yarn 1（2016）    并行安装 + 缓存 + yarn.lock → 更快更稳，但仍是扁平结构
pnpm（2017）      全局 store + 硬链接 + 严格树 → 磁盘省、无幽灵依赖
```

每次"革命"都是解决前一代的痛点：

| 痛点 | 解法 |
|------|------|
| npm 2 嵌套太深太慢 | npm 3+ / yarn 扁平化 |
| 扁平化的幽灵依赖 | pnpm 严格依赖树 |
| 多项目重复装依赖浪费磁盘 | pnpm 全局 store 硬链接 |

## 前置知识：Node 模块解析规则

理解三者差异的钥匙是 Node 的解析规则：**从当前文件目录开始，逐层向上找 `node_modules`，找到就停止**。

```text
/src/app.js 里 import 'lodash'
查找顺序：/src/node_modules → /node_modules → /../node_modules ...
```

这个规则决定了：**只要某个包出现在你能"看到"的某一层 node_modules 里，你就能用到它**——这就是扁平化产生幽灵依赖的根本原因。

## 三种 node_modules 结构

### 1. 嵌套结构（npm 2）

每个包在自己的 node_modules 里装自己的依赖，层层嵌套：

```text
node_modules/
└── a/
    ├── index.js
    └── node_modules/
        └── b/
            └── node_modules/
                └── c/
```

问题：目录深（Windows 路径超长）、同一个包被重复安装 N 份、安装慢。

### 2. 扁平结构（npm 3+ / yarn 1）

所有依赖（包括依赖的依赖）尽量提升到顶层：

```text
node_modules/
├── react        ← 你的直接依赖
├── lodash       ← 被 a 依赖，但提升到了顶层（幽灵依赖温床）
├── a/
└── b/
```

问题：**幽灵依赖**——你代码里能 `import` 到的包，可能不在你的 `package.json` 里。

### 3. 严格树结构（pnpm）

顶层只有直接依赖（软链接），真实文件都放在 `.pnpm` 虚拟商店里：

```text
node_modules/
├── react -> .pnpm/react@18.2.0/node_modules/react    ← 软链接
├── a -> .pnpm/a@1.0.0/node_modules/a                 ← 软链接
└── .pnpm/
    ├── react@18.2.0/node_modules/react               ← 真实文件（硬链接自全局 store）
    └── a@1.0.0/node_modules/
        ├── a
        └── lodash -> ../../lodash@4.17.21/node_modules/lodash
```

## 术语详解

### 硬链接（Hard Link）

**同一份数据的多个名字**。磁盘上数据只存一份（inode），可以有多个文件名指向它。

```bash
echo "hello" > c.txt   # 数据 hello，链接计数 = 1
ln c.txt a.txt         # 计数 = 2，a.txt 和 c.txt 是同一份数据的两个名字
rm c.txt               # 计数 = 1，数据还在！a.txt 照样能读
```

- 修改任意一个名字的内容，所有名字都变（本来就是同一份数据）
- 删除只是"摘掉一个名字"（计数 -1），**计数归 0 数据才真正释放**
- 没有"本体 vs 引用"之分，所有名字地位平等
- 只能在同磁盘分区内创建，不能对目录创建

**pnpm 用它做什么**：所有项目装的依赖都硬链接自全局 store（`pnpm store path`）里的同一份数据——100 个项目装同一个 React，磁盘只占一份。

### 软链接（Symbolic Link）

**路径的快捷方式**。软链接自己是一个独立小文件，内容就是一行目标路径字符串。

```bash
ln -s c.txt shortcut   # shortcut 内容 = "c.txt"
rm c.txt               # shortcut 断链 → cat shortcut 报 No such file
rm shortcut            # 目标无感
```

- 依赖目标存在，目标被删就悬空（broken）
- 可以跨磁盘、可以指向目录

**pnpm 用它做什么**：项目顶层 `node_modules` 里的每个包都是一个软链接，指向 `.pnpm` 里的真实文件。

| | 硬链接 | 软链接 |
|---|--------|--------|
| 本质 | 数据的另一个名字 | 路径的引用 |
| 删除链接本身 | 目标无感（计数 -1） | 目标无感 |
| 删除目标 | 只要还有名字指向，数据就在 | 链接断链 |
| 跨分区 | 不行 | 可以 |
| 指向目录 | 不行 | 可以 |

### 幽灵依赖（Phantom Dependency）

**没在 `package.json` 里声明，却能被代码 import 到的依赖**。

产生原因：扁平化结构把"依赖的依赖"也提升到了顶层 node_modules，而 Node 解析规则又允许从顶层找到它。

```js
// package.json 里没装 lodash，但代码能跑：
import _ from 'lodash'  // lodash 是 a 包的依赖，被扁平化提升到了顶层
```

危害：
- 某天 `a` 升级后不再依赖 lodash → **你的代码突然崩了，但你什么都没改**
- 换环境（CI / 新同事）安装布局不同 → 本地好、线上炸
- 两个包依赖同一库的不同版本，扁平化只能提升一个 → 版本错乱

pnpm 的严格树结构从根源上杜绝：顶层只有你声明的依赖，lodash 藏在 `.pnpm` 里，你的代码向上找两层都找不到，**直接报错**，逼你把依赖写进 `package.json`。

### 锁文件（Lockfile）

记录**实际安装的精确版本和依赖关系**的文件，保证"任何人、任何时候安装，结果完全一致"。

| 工具 | 锁文件 |
|------|--------|
| npm | `package-lock.json` |
| yarn | `yarn.lock` |
| pnpm | `pnpm-lock.yaml` |

必须提交到 Git：不提交的话，同事/CI 安装时可能解析到不同的次版本，出现"我这边好的你那边炸"。

## pnpm 的完整安装流程

```text
pnpm install
    │
    ├─ 1. 解析依赖 → 生成依赖图
    ├─ 2. 检查全局 store 是否有缓存
    │     ├─ 有 → 直接硬链接，跳过下载
    │     └─ 没有 → 下载到 store，再硬链接
    ├─ 3. 在 node_modules/.pnpm 建立真实文件（硬链接）
    └─ 4. 在顶层 node_modules 建立软链接（只有直接依赖）
```

三层结构对应三个职责：

| 层 | 机制 | 职责 |
|----|------|------|
| 全局 store | 真实数据唯一副本 | 省磁盘 |
| `.pnpm` 虚拟商店 | 硬链接自 store | 版本隔离（每个版本独立目录） |
| 顶层 node_modules | 软链接 | 只暴露直接依赖，杜绝幽灵依赖 |

## 三工具对比

| 维度 | npm | yarn 1 | pnpm |
|------|-----|--------|------|
| **node_modules 结构** | 扁平 | 扁平 | 严格树 |
| **幽灵依赖** | 有 | 有 | 无 |
| **磁盘占用** | 每个项目一份 | 每个项目一份 | 全局 store 一份（硬链接） |
| **安装速度** | 串行、慢 | 并行、缓存 | 并行 + 硬链接，最快 |
| **锁文件** | package-lock.json | yarn.lock | pnpm-lock.yaml |
| **Monorepo 支持** | workspace（基础） | workspace（基础） | workspace + 严格隔离，最完善 |
| **社区生态** | 默认标配 | 较成熟 | 快速增长，主流新项目选择 |

## Monorepo 下的差异

### workspace 协议（`workspace:*`）

Monorepo 里包之间互相依赖，用 `workspace:*` 声明"引用仓库内的这个包"：

```json
// packages/app/package.json
{
  "dependencies": {
    "@my-org/ui": "workspace:*"   // 指向仓库内的 ui 包，不是 npm 上的版本
  }
}
```

解决：本地引用即时生效、无需发布 npm 就能联调、版本统一管理。

### 增量构建

Monorepo 里只构建"受影响的包"（依赖链上的包），需要工具支持：pnpm 的 `--filter`、Turborepo 的依赖图分析 + 远程缓存。

## 选型建议

| 场景 | 推荐 |
|------|------|
| 新项目、Monorepo | **pnpm**（严格依赖 + 省磁盘 + workspace 完善） |
| 老项目迁移成本敏感 | npm（零迁移，生态默认） |
| 团队习惯 yarn 且无 Monorepo 需求 | yarn classic（够用） |
| 企业级超大型仓库 | pnpm + Turborepo / Nx |

## 面试速答

- **硬链接 vs 软链接**：硬链接是"数据的另一个名字"（计数归零才删），软链接是"路径的快捷方式"（目标没了就断）
- **幽灵依赖是什么**：没声明却能 import 的依赖，扁平化的产物，换依赖就崩
- **pnpm 本质区别**：全局 store 硬链接省磁盘 + 严格树杜绝幽灵依赖 + workspace 协议支持 Monorepo
- **为什么 pnpm 没有幽灵依赖**：顶层 node_modules 只有直接依赖的软链接，Node 向上解析找不到没声明的包
- **lockfile 作用**：锁定精确版本，保证环境一致，必须提交 Git

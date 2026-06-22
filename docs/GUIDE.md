# 📝 知识库维护指南

## 🎯 核心理念

**单一真相源（Single Source of Truth）**：所有笔记内容统一在 `docs/` 目录下维护，直接编辑即可同步到网站。

---

## 📂 目录结构

```
front-end-knowledge-summary/
├── docs/                      # 🌟 唯一的内容来源
│   ├── .vitepress/           # VitePress 配置
│   │   └── config.mts        # 侧边栏和导航配置
│   ├── react/                # React 相关笔记
│   ├── vue/                  # Vue 相关笔记
│   ├── browser/              # 浏览器相关
│   ├── css/                  # CSS 相关
│   ├── javascript/           # JavaScript 核心
│   ├── algorithms/           # 算法
│   ├── performance/          # 性能优化
│   ├── engineering/          # 工程化与架构
│   ├── books/                # 读书笔记
│   ├── ai-agent/             # AI Agent 学习
│   ├── guide/                # 使用指南
│   ├── misc/                 # 杂项
│   └── mvvm/                 # 框架对比
├── archive/                   # 历史归档（只读）
│   └── source-notes-2025/    # 2025年前的旧笔记结构
├── package.json
└── README.md
```

---

## ✍️ 日常写作流程

### 1. 新增笔记

```bash
# 在对应的分类下创建新文件
touch docs/react/my-new-topic.md

# 编辑内容
code docs/react/my-new-topic.md
```

### 2. 更新现有笔记

直接在 `docs/` 目录下找到对应文件编辑即可：

```bash
# 例如更新 React Hooks 相关内容
code docs/react/fc-hook.md
```

### 3. 预览效果

```bash
# 启动本地开发服务器
npm run dev

# 浏览器访问 http://localhost:5173
```

VitePress 支持热重载，保存文件后浏览器会自动刷新。

### 4. 提交更改

```bash
git add docs/
git commit -m "更新 React Hooks 相关内容"
git push
```

---

## 🔧 添加新笔记到导航

当你创建了新的笔记文件后，需要将其添加到侧边栏导航中：

### 步骤：

1. **打开配置文件**
   ```bash
   code docs/.vitepress/config.mts
   ```

2. **找到对应的 sidebar 配置**
   
   例如，要在 React 分类下添加新笔记：
   ```typescript
   '/react/': [
     {
       text: 'React 理念',
       items: [
         { text: 'React 设计理念', link: '/react/concept' },
         { text: '前端框架概览', link: '/react/framework-overview' },
         { text: '我的新主题', link: '/react/my-new-topic' },  // ← 添加这一行
       ]
     }
   ]
   ```

3. **保存并刷新页面**

   配置修改后，VitePress 会自动重新加载，无需重启服务器。

### 命名规范：

- **文件名**：使用 kebab-case（短横线分隔），如 `my-new-topic.md`
- **链接路径**：去掉 `.md` 后缀，如 `/react/my-new-topic`
- **显示文本**：使用中文或英文标题，清晰易懂

---

## 📊 内容组织原则

### 1. 分类逻辑

| 分类 | 内容范围 | 示例 |
|------|---------|------|
| `react/` | React 框架相关知识 | Hooks、生命周期、渲染机制 |
| `vue/` | Vue 框架相关知识 | 响应式系统、编译器、组件化 |
| `browser/` | 浏览器原理与网络 | HTTP、DNS、渲染机制 |
| `css/` | CSS 布局与特性 | BFC、Flexbox、Grid |
| `javascript/` | JS 语言核心 | 数据类型、闭包、异步编程 |
| `algorithms/` | 数据结构与算法 | 排序、查找、树结构 |
| `performance/` | 性能优化 | 指标监控、优化策略 |
| `engineering/` | 工程化与架构 | 微前端、PWA、国际化 |
| `books/` | 读书笔记 | 《你不知道的JS》等 |
| `ai-agent/` | AI 相关知识 | Prompt Engineering、RAG |
| `misc/` | 杂项知识 | 调试技巧、工具配置 |

### 2. 文件命名

✅ **推荐**：
- `binary-search.md`
- `lifecycle-v2.md`
- `custom-hooks.md`

❌ **避免**：
- `二分查找.md`（中文文件名可能导致兼容性问题）
- `BinarySearch.md`（大小写混用）
- `binary_search.md`（下划线风格）

### 3. 内容结构

建议每篇笔记包含：

```markdown
# 标题

## 核心概念

简要介绍主题的核心思想。

## 详细讲解

分章节深入讲解...

## 代码示例

```javascript
// 示例代码
```

## 总结

关键点回顾。

## 参考资料

- [相关链接](url)
```

---

## 🚀 发布流程

### 本地预览

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

构建产物会生成在 `docs/.vitepress/dist/` 目录。

### 部署

项目已配置 Vercel 自动部署：
1. 推送到 Git 仓库
2. Vercel 自动检测变更并部署
3. 访问你的 Vercel 域名查看最新内容

---

## 📝 最佳实践

### ✅ 推荐做法

1. **小步迭代**：每次更新聚焦一个主题，便于管理和回顾
2. **及时提交**：完成一个小节就 commit，避免大量未提交的更改
3. **善用标签**：在配置中使用 `⭐` 标记重要程度
4. **保持简洁**：一篇笔记专注一个知识点，避免过于冗长
5. **配图说明**：复杂概念配合图表更易懂

### ❌ 避免的做法

1. ~~在多个地方维护相同内容~~（单一真相源原则）
2. ~~直接修改归档目录中的文件~~（archive/ 是只读的）
3. ~~忘记更新导航配置~~（新文件需要手动添加到 config.mts）
4. ~~使用过长的文件名~~（保持简洁清晰）

---

## 🔍 常见问题

### Q: 我可以在原来的目录（如 React设计原理/）继续写吗？

**A**: 不建议。原目录已归档到 `archive/source-notes-2025/`，作为历史参考。请直接在 `docs/` 下编辑。

### Q: 如何快速找到某篇笔记？

**A**: 
- 使用 VitePress 的搜索功能（右上角搜索框）
- 或者在 VSCode 中使用 `Cmd+P` 搜索文件名

### Q: 我想调整分类结构怎么办？

**A**:
1. 移动文件到新的子目录
2. 更新 `config.mts` 中的 sidebar 配置
3. 检查是否有其他文件引用了旧路径

### Q: 图片放在哪里？

**A**: 建议在与 markdown 文件同级的目录下创建图片文件夹，或使用相对路径引用。

---

## 📚 相关资源

- [VitePress 官方文档](https://vitepress.dev/)
- [Markdown 语法指南](https://www.markdownguide.org/)
- [项目 README](../README.md)

---

**最后更新**: 2026-06-22  
**维护者**: Jun

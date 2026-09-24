---
layout: home

hero:
  name: 知识库
  text: 本地知识库 + AI 问答
  tagline: 把一堆 Markdown 笔记，变成可浏览、可搜索、可对话的网站 —— 默认全本地运行、零 API 成本，需要时也能切远程
  actions:
    - theme: brand
      text: 快速上手
      link: /getting-started/
    - theme: alt
      text: GitHub
      link: https://github.com/jun2333/knowledge

features:
  - title: 默认本地运行
    details: Ollama（qwen3:8b + bge-m3）+ Chroma，不联网、不花钱、数据不出本机；也可按需指向远程大模型 / 远程向量库
  - title: 目录即知识
    details: Markdown 丢进目录就自动索引，导航与侧边栏按目录结构自动生成
  - title: 带来源的问答
    details: Agent 先检索你的笔记再回答（向量 + 关键词两路融合），句末标注可点击来源；没检索到就如实说没找到
  - title: 可复制
    details: 通用能力都在基座包里，基座自带评估体系自行校准质量；脚手架可生成属于你自己的知识库实例
---

## 五步跑起来

```bash
pnpm install               # 1. 装依赖
pnpm ollama:pull-chat      # 2. 下载模型（首次，约 6.5GB）
pnpm ollama:pull-embed
pnpm chroma:start          # 3. 启动向量库（需 Docker）
pnpm kb index              # 4. 建立索引
pnpm dev                   # 5. 启动 → http://localhost:5173
```

> 第一次用？看 **[快速上手](/getting-started/)** —— 从装什么到换成你自己的内容，一步步来。
>
> 想自己搭一个同款：见 **[快速上手](/getting-started/)** —— 装包 → `kb init` → 放你的内容。

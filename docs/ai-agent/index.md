# AI Agent 工程实践

::: tip 模块说明
本模块涵盖 AI 应用开发的完整知识体系：从 LLM API 调用、Agent 架构设计，到 Prompt Engineering、RAG 检索增强，再到 Spec-First 开发和 Harness 工程等进阶主题。
:::

## 🎯 学习目标

通过本模块的学习，你将掌握：

- **基础概念** - AI 开发常见名词和术语
- **LLM API 开发** - 调用 OpenAI/Claude API、流式响应、多轮对话
- **Agent 架构设计** - Function Calling、Chat/Agent/Workflow 三种模式
- **Prompt Engineering** - 基础技巧到高级思维链、ReAct 模式
- **RAG 检索增强** - 让 LLM 访问外部知识库
- **工程化实践** - 评估测试、可观测性、成本控制、安全防护
- **Spec-First 开发** - 规范优先的 AI 应用开发方法论
- **AI Harness 工程** - 构建可维护、可扩展的 AI 应用架构

---

##  知识地图

### 1. 基础概念 ⭐⭐⭐⭐⭐

AI 开发的核心术语和名词解释。

- [名词解释](/ai-agent/glossary) - LLM、Token、RAG、Agent 等术语速查

### 2. AI 应用开发 ⭐⭐⭐⭐⭐

从零开始构建 AI 应用的核心知识。

- [LLM API 调用基础](/ai-agent/llm-api-basics) - OpenAI/Claude API、流式响应、Token 计费、错误处理
- [Function Calling 与工具调用](/ai-agent/function-calling) - 让 LLM 调用外部工具执行任务
- [AI 应用架构模式](/ai-agent/app-architecture) - Chat/Agent/Workflow 三种模式、记忆管理、多 Agent 协作
- [AI 应用工程化实践](/ai-agent/app-engineering) - 评估测试、可观测性、成本控制、安全防护

### 3. Prompt Engineering ⭐⭐⭐

通过优化与 LLM 的交互方式获得更高质量的回答。

- [基础技巧](/ai-agent/prompt-engineering/basics) - Role/Context/Task 结构、Few-shot、CoT
- [高级技巧](/ai-agent/prompt-engineering/advanced) - Self-Consistency、Tree of Thoughts、ReAct

### 4. RAG 检索增强 ⭐⭐⭐⭐

让 LLM 能够访问和利用外部知识库。

- [RAG 入门](/ai-agent/rag/introduction) - 向量检索、文档切片、检索增强生成流程

### 5. Spec-First 开发 ⭐⭐⭐⭐⭐

规范优先的开发模式，适合复杂的 AI Agent 项目。

- [Spec-First 指南](/ai-agent/spec-first/guide) - Scripts prepare facts, LLM decides

### 6. AI Harness 工程 ⭐⭐⭐⭐⭐

构建企业级 AI 应用的工程化实践。

- [核心思想](/ai-agent/harness-engineering/core-concepts) - Harness Engineering 三层模型
- [最佳实践](/ai-agent/harness-engineering/best-practices) - 项目结构、Prompt 管理、错误处理
- [质量控制](/ai-agent/harness-engineering/quality-control) - 评估与质量保障

### 7. 案例研究 ⭐⭐⭐

工业级 AI 应用的实践案例。

- [Qoder 优化实践](/ai-agent/case-studies/qoder) - AI IDE 的 Harness Engineering 实践

---

## 💡 学习建议

### 入门路径（开发 AI 应用）
1. [名词解释](/ai-agent/glossary) — 先搞懂术语
2. [LLM API 调用基础](/ai-agent/llm-api-basics) — 学会调用模型
3. [Function Calling](/ai-agent/function-calling) — 让模型使用工具
4. [AI 应用架构模式](/ai-agent/app-architecture) — 理解三种架构
5. 动手写一个带工具调用的 Chat 应用

### 进阶路径（工程化）
1. [AI 应用工程化实践](/ai-agent/app-engineering) — 评估、监控、成本、安全
2. [Harness 核心思想](/ai-agent/harness-engineering/core-concepts) — 工程闭环
3. [Spec-First 指南](/ai-agent/spec-first/guide) — 工作流治理

### Prompt 优化路径
1. [Prompt 基础技巧](/ai-agent/prompt-engineering/basics)
2. [Prompt 高级技巧](/ai-agent/prompt-engineering/advanced)
3. [RAG 入门](/ai-agent/rag/introduction)

---

## 🔗 相关资源

### 官方文档
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/claude/docs)
- [LangChain Documentation](https://js.langchain.com/docs)

### 开源项目
- [LangChain](https://github.com/langchain-ai/langchain) - AI 应用开发框架
- [AutoGen](https://github.com/microsoft/autogen) - Multi-Agent 框架
- [LlamaIndex](https://github.com/run-llama/LlamaIndexTS) - 数据索引与检索

### 学习资源
- [Prompt Engineering Guide](https://www.promptingguide.ai/) - Prompt 工程指南
- [Spec-First.cn](http://spec-first.cn) - Spec-First 开发社区

---
title: AI 开发名词解释
date: 2026-07-30
---

# AI 开发名词解释

进入 AI 应用开发前，先统一术语。本文按类别整理常见名词，后续文章中会直接使用这些术语。

## 基础概念

| 名词 | 全称 | 解释 |
|------|------|------|
| **LLM** | Large Language Model | 大语言模型，如 GPT-4o、Claude。通过海量文本训练，能理解和生成自然语言 |
| **Token** | — | LLM 处理文本的最小单位。1000 Token ≈ 750 英文单词 ≈ 500 中文字 |
| **Prompt** | — | 发给 LLM 的输入文本，包含指令、上下文、问题等 |
| **Completion** | — | LLM 根据 Prompt 生成的输出文本 |
| **Context Window** | — | 上下文窗口，模型一次能处理的最大 Token 数（含输入+输出） |
| **Temperature** | — | 控制输出随机性的参数。0 = 确定性最高，1 = 随机性最高 |
| **Fine-tuning** | — | 微调，用特定领域数据继续训练模型，使其适配特定任务 |
| **Inference** | — | 推理，用训练好的模型处理输入并生成输出的过程 |

## 模型相关

| 名词 | 解释 |
|------|------|
| **GPT** | Generative Pre-trained Transformer，OpenAI 的模型系列 |
| **Claude** | Anthropic 的大语言模型系列，以安全性和长上下文著称 |
| **Embedding** | 将文本转换为向量（数字数组），用于语义搜索和相似度计算 |
| **Transformer** | 现代 LLM 的基础架构，通过注意力机制处理序列数据 |
| **MoE** | Mixture of Experts，混合专家模型，不同任务路由到不同"专家"子网络 |
| **Multimodal** | 多模态，模型能同时处理文本、图片、音频等多种输入 |
| **Open Source Model** | 开源模型，如 Llama、Qwen、Mistral，可本地部署 |

## 应用模式

| 名词 | 解释 |
|------|------|
| **Chat** | 对话模式，用户问 LLM 答，最简单直接的交互方式 |
| **Agent** | 智能体，LLM + 工具 + 自主决策循环，能独立完成复杂任务 |
| **Function Calling** | 函数调用，让 LLM 决定调用哪个外部工具并传参，应用层执行后返回结果 |
| **Tool Use** | 工具使用，与 Function Calling 同义，Anthropic 的叫法 |
| **RAG** | Retrieval Augmented Generation，检索增强生成。先检索相关知识，再让 LLM 基于知识回答 |
| **Workflow** | 工作流，预定义的处理流程，LLM 只在特定节点发挥作用 |
| **Multi-Agent** | 多智能体，多个专门的 Agent 协作完成复杂任务 |
| **ReAct** | Reasoning + Acting，先思考再行动再观察的经典 Agent 模式 |
| **BFF** | Backend For Frontend，为前端定制的后端服务层（不是 AI 专属，但常用于 AI 应用） |

## 工程技术

| 名词 | 解释 |
|------|------|
| **Prompt Engineering** | 提示工程，通过优化 Prompt 获得更高质量的 LLM 输出 |
| **Context Engineering** | 上下文工程，通过 RAG、MCP 等手段给 LLM 提供正确的上下文 |
| **Harness Engineering** | 治理工程，构建任务追踪、完成证据、知识沉淀的工程闭环 |
| **Spec-First** | 规范优先，先写规格文档再让 AI 执行，把中间态写回仓库 |
| **Streaming** | 流式输出，LLM 逐 Token 返回结果，而非等全部生成完再返回 |
| **SSE** | Server-Sent Events，服务器推送事件，常用于实现流式响应 |
| **MCP** | Model Context Protocol，模型上下文协议，标准化的工具/数据源接入协议 |
| **Vector Database** | 向量数据库，存储和检索 Embedding 向量的数据库（如 Pinecone、Milvus） |
| **Chunk** | 文本切片，将长文档拆分为小片段，用于 RAG 检索 |

## 评估与质量

| 名词 | 解释 |
|------|------|
| **Hallucination** | 幻觉，LLM 生成看似合理但实际错误的内容 |
| **LLM-as-Judge** | 用 LLM 来评估另一个 LLM 的输出质量 |
| **Ground Truth** | 标准答案，用于评估模型输出准确性的参考答案 |
| **Benchmark** | 基准测试，用标准化数据集评估模型能力 |
| **Regression Test** | 回归测试，确保修改 Prompt 或模型后不破坏已有能力 |

## 安全与成本

| 名词 | 解释 |
|------|------|
| **Prompt Injection** | 提示注入，用户通过输入试图覆盖或绕过 System Prompt |
| **Jailbreak** | 越狱，绕过模型安全限制使其输出本应拒绝的内容 |
| **Rate Limit** | 速率限制，API 对单位时间内请求次数的上限 |
| **Token Quota** | Token 配额，用户或应用在特定时间段内的 Token 使用上限 |
| **Red Teaming** | 红队测试，主动攻击 AI 系统以发现安全漏洞 |
| **Guardrails** | 护栏，输入/输出的安全过滤规则 |

## 常见缩写速查

```
LLM    → Large Language Model        大语言模型
API    → Application Programming Interface  应用程序接口
RAG    → Retrieval Augmented Generation    检索增强生成
MCP    → Model Context Protocol       模型上下文协议
SSE    → Server-Sent Events           服务器推送事件
DI     → Dependency Injection          依赖注入
RBAC   → Role-Based Access Control    基于角色的访问控制
JWT    → JSON Web Token               JSON Web 令牌
ORM    → Object-Relational Mapping    对象关系映射
SQL    → Structured Query Language    结构化查询语言
NoSQL  → Not Only SQL                 非关系型数据库
SDK    → Software Development Kit     软件开发工具包
CLI    → Command Line Interface       命令行界面
CRUD   → Create Read Update Delete    增删改查
MVP    → Minimum Viable Product       最小可行产品
```

## 学习路径中的术语映射

本模块文章与术语的对应关系：

```
名词解释 ← 你在这里
  ↓
LLM API 调用基础 → LLM, Token, Prompt, Completion, Streaming, SSE
  ↓
Function Calling → Function Calling, Tool Use, Agent, ReAct
  ↓
AI 应用架构模式 → Chat, Agent, Workflow, Multi-Agent, RAG, Embedding
  ↓
AI 应用工程化 → Hallucination, LLM-as-Judge, Prompt Injection, Guardrails
  ↓
Prompt Engineering → Prompt Engineering, Temperature, Context Window
  ↓
RAG 入门 → RAG, Vector Database, Embedding, Chunk
  ↓
Harness Engineering → Harness Engineering, Spec-First, Context Engineering
```

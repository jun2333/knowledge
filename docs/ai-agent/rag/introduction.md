# RAG (检索增强生成) 入门

RAG (Retrieval Augmented Generation, 检索增强生成) 是目前最流行的AI应用模式之一,它让LLM能够访问和利用外部知识库。

## 🎯 什么是 RAG?

### 问题背景

LLM有一个致命弱点:**知识截止**和**幻觉**。

```
用户: "我们公司内部的API文档里,getUserInfo接口怎么调用?"

❌ 没有RAG的LLM:
"我不知道你们公司的内部API,但可以给你一个通用的REST API示例..."

✅ 有RAG的LLM:
"根据你们的API文档,getUserInfo接口这样调用:
GET /api/v1/user/:id
Headers: { Authorization: 'Bearer <token>' }
返回: { id, name, email, role }"
```

### RAG的核心思想

```
传统LLM:
用户提问 → LLM → 回答 (仅依赖训练数据)

RAG:
用户提问 → 检索相关知识 → LLM + 知识 → 回答 (依赖训练数据+实时知识)
```

**类比**: 
- 没有RAG = 闭卷考试 (只能靠记忆)
- 有RAG = 开卷考试 (可以查资料)

---

## 🏗️ RAG 架构详解

### 基本流程

```
┌─────────────┐
│  用户提问    │
└──────┬──────┘
       ↓
┌─────────────┐
│  Query Embedding  │  ← 将问题转换为向量
└──────┬──────┘
       ↓
┌─────────────┐
│  Vector Search  │  ← 在向量数据库中搜索相似内容
└──────┬──────┘
       ↓
┌─────────────┐
│  Retrieved Docs │  ← 找到相关的文档片段
└──────┬──────┘
       ↓
┌─────────────┐
│  LLM + Context  │  ← 将相关文档作为context给LLM
└──────┬──────┘
       ↓
┌─────────────┐
│   最终回答    │
└─────────────┘
```

### 核心组件

#### 1. Document Loader (文档加载器)

负责读取各种格式的文档:
- PDF
- Markdown
- Word
- HTML
- Database

```javascript
// 示例: 使用LangChain加载Markdown文档
import { TextLoader } from "langchain/document_loaders/fs/text";

const loader = new TextLoader("docs/api-guide.md");
const docs = await loader.load();
```

#### 2. Text Splitter (文本分割器)

将长文档切分成小片段(chunks):

```javascript
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // 每个chunk的字符数
  chunkOverlap: 200,    // chunk之间的重叠(保持上下文连贯)
});

const chunks = await splitter.splitDocuments(docs);
```

**为什么需要split?**
- LLM的context window有限
- 检索时只需要相关片段,不需要整篇文档

#### 3. Embedding Model (嵌入模型)

将文本转换为向量:

```javascript
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-ada-002",
});

// 将文本转换为向量
const vectors = await embeddings.embedDocuments(
  chunks.map(chunk => chunk.pageContent)
);
```

**向量的作用**: 
- 语义相似度搜索
- "登录功能" 和 "authentication" 会被认为是相似的

#### 4. Vector Store (向量数据库)

存储和检索向量:

**常用向量数据库:**
- **ChromaDB** - 轻量级,适合本地开发
- **Pinecone** - 云服务,易扩展
- **Weaviate** - 功能强大,支持混合搜索
- **FAISS** - Facebook开源,高性能

```javascript
import { Chroma } from "@langchain/community/vectorstores/chroma";

// 存储
const vectorStore = await Chroma.fromDocuments(
  chunks,
  embeddings,
  { collectionName: "api-docs" }
);

// 检索
const results = await vectorStore.similaritySearch("如何获取用户信息?", 3);
// 返回最相关的3个文档片段
```

#### 5. Retriever (检索器)

封装检索逻辑:

```javascript
const retriever = vectorStore.asRetriever({
  k: 5,  // 返回top 5相关文档
});

const relevantDocs = await retriever.getRelevantDocuments(userQuestion);
```

#### 6. LLM + Prompt (生成)

将检索到的文档作为context给LLM:

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const llm = new ChatOpenAI({ model: "gpt-4" });

const prompt = PromptTemplate.fromTemplate(`
基于以下参考文档回答问题。如果文档中没有相关信息,请说"我不知道"。

参考文档:
{context}

问题: {question}

回答:
`);

// 组合context
const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

// 生成回答
const response = await llm.invoke(
  prompt.format({ context, question: userQuestion })
);
```

---

## 💻 完整示例: 构建API文档问答机器人

### 项目结构

```
api-docs-bot/
├── docs/              # API文档
│   ├── user-api.md
│   ├── order-api.md
│   └── payment-api.md
├── scripts/
│   ├── ingest.js      # 文档入库脚本
│   └── query.js       # 查询脚本
├── package.json
└── .env
```

### Step 1: 安装依赖

```bash
npm init -y
npm install langchain @langchain/openai chromadb
```

### Step 2: 文档入库 (Ingestion)

```javascript
// scripts/ingest.js
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

async function ingest() {
  console.log("📚 Loading documents...");
  
  // 1. 加载文档
  const loader = new DirectoryLoader("./docs", {
    glob: "**/*.md",
  });
  const docs = await loader.load();
  console.log(`Loaded ${docs.length} documents`);
  
  // 2. 分割文档
  console.log("✂️  Splitting documents...");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);
  console.log(`Created ${chunks.length} chunks`);
  
  // 3. 生成embeddings并存储
  console.log("🔢 Generating embeddings...");
  const embeddings = new OpenAIEmbeddings();
  const vectorStore = await Chroma.fromDocuments(
    chunks,
    embeddings,
    { collectionName: "api-docs" }
  );
  
  console.log("✅ Ingestion complete!");
}

ingest().catch(console.error);
```

运行:
```bash
node scripts/ingest.js
```

### Step 3: 查询

```javascript
// scripts/query.js
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

async function query(question) {
  // 1. 检索相关文档
  console.log("🔍 Searching for relevant docs...");
  const embeddings = new OpenAIEmbeddings();
  const vectorStore = await Chroma.fromExistingCollection(
    embeddings,
    { collectionName: "api-docs" }
  );
  
  const retriever = vectorStore.asRetriever({ k: 3 });
  const relevantDocs = await retriever.getRelevantDocuments(question);
  
  if (relevantDocs.length === 0) {
    console.log("❌ No relevant documents found.");
    return;
  }
  
  console.log(`Found ${relevantDocs.length} relevant documents`);
  
  // 2. 生成回答
  console.log("🤖 Generating answer...\n");
  const llm = new ChatOpenAI({ model: "gpt-4" });
  
  const prompt = PromptTemplate.fromTemplate(`
你是一个API文档助手。基于以下参考文档回答问题。
如果文档中没有相关信息,请说"我在文档中没有找到相关信息"。

参考文档:
{context}

问题: {question}

请给出清晰、准确的回答,包含具体的代码示例(如果有)。

回答:
`);
  
  const context = relevantDocs
    .map(doc => `来源: ${doc.metadata.source}\n${doc.pageContent}`)
    .join("\n\n");
  
  const response = await llm.invoke(
    prompt.format({ context, question })
  );
  
  console.log(response.content);
  
  // 3. 显示引用来源
  console.log("\n📖 参考来源:");
  relevantDocs.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.metadata.source}`);
  });
}

// 从命令行参数获取问题
const question = process.argv.slice(2).join(" ");
if (!question) {
  console.log("Usage: node scripts/query.js <your question>");
  process.exit(1);
}

query(question).catch(console.error);
```

运行:
```bash
node scripts/query.js 如何获取用户信息?
```

输出:
```
🔍 Searching for relevant docs...
Found 2 relevant documents
🤖 Generating answer...

根据API文档,获取用户信息的接口如下:

**接口**: GET /api/v1/user/:id

**请求示例**:
```javascript
fetch('/api/v1/user/123', {
  headers: {
    'Authorization': 'Bearer your_token_here'
  }
})
```

**返回**:
```json
{
  "id": 123,
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "admin"
}
```

📖 参考来源:
1. docs/user-api.md
2. docs/authentication.md
```

---

## 🎓 进阶技巧

### 1. Metadata Filtering (元数据过滤)

为文档添加元数据,实现更精确的检索:

```javascript
// 入库时添加元数据
const docs = await loader.load();
docs.forEach(doc => {
  doc.metadata = {
    ...doc.metadata,
    category: "user-api",  // 分类
    version: "v1",         // 版本
    author: "team-a",      // 作者
  };
});

// 查询时过滤
const retriever = vectorStore.asRetriever({
  filter: {
    category: "user-api",
    version: "v1",
  },
});
```

### 2. Hybrid Search (混合搜索)

结合关键词搜索和向量搜索:

```javascript
import { WeaviateStore } from "@langchain/weaviate";

// Weaviate支持BM25(关键词) + 向量搜索
const store = new WeaviateStore(embeddings, {
  client: weaviateClient,
  indexName: "DocIndex",
  textKey: "text",
});

// 混合搜索
const results = await store.similaritySearchWithScore(query, {
  hybridSearch: true,
  alpha: 0.7,  // 向量搜索权重0.7,关键词搜索权重0.3
});
```

### 3. Re-Ranking (重排序)

检索后再次排序,提高相关性:

```javascript
import { CohereRerank } from "@langchain/cohere";

// 第一步: 检索较多文档
const initialResults = await retriever.getRelevantDocuments(question, 10);

// 第二步: 用Cohere重新排序
const reranker = new CohereRerank({
  apiKey: process.env.COHERE_API_KEY,
  topN: 3,  // 只保留top 3
});

const rankedResults = await reranker.compressDocuments(
  initialResults,
  question
);
```

### 4. Multi-Query Retrieval (多查询检索)

自动生成多个相关问题,扩大检索范围:

```javascript
import { MultiQueryRetriever } from "langchain/retrievers/multi_query";

const baseRetriever = vectorStore.asRetriever();

const multiQueryRetriever = MultiQueryRetriever.fromLLM({
  llm,
  retriever: baseRetriever,
});

// 自动生成3-5个相关查询,合并结果
const docs = await multiQueryRetriever.getRelevantDocuments(question);
```

---

## ⚡ 性能与成本优化

RAG 的延迟和成本主要来自两个环节：

```
检索延迟: 向量库扫描候选集的时间 (文档越多越慢)
生成延迟: LLM 生成 token 的时间 (上下文越长越慢,且按 token 计费)
```

### 1. 检索延迟: 从全量扫描到近似检索

知识库只有几十篇文档时,直接全量扫描没问题。但文档数量增长到**上千篇**时,逐条计算相似度是 O(n),延迟线性上涨。

解法是给向量库开 **近似最近邻(ANN)索引**——HNSW/IVF,牺牲一点点召回精度,换来**对数级**检索时间:

| 检索方式 | 复杂度 | 说明 |
|---------|--------|------|
| **暴力扫描** (Flat) | O(n) | 逐条算相似度,最准但最慢 |
| **IVF** | O(√n) | 先聚类分桶,只搜相近的桶 |
| **HNSW** | O(log n) | 跳表式多层图结构,精度和速度平衡最好 |

```javascript
// Chroma 默认使用 HNSW,可通过 collectionMetadata 调参
const vectorStore = await Chroma.fromDocuments(chunks, embeddings, {
  collectionName: "api-docs",
  collectionMetadata: {
    "hnsw:space": "cosine",        // 距离度量
    "hnsw:M": 16,                  // 每个节点的最大连接数(越大越准,索引越大)
    "hnsw:search_ef": 100,         // 检索探索广度(越大越准,越慢)
  },
});
```

**配合手段:**
- **元数据预过滤**: 先按 `category`/`version`/`时间` 缩小候选集,再向量检索(如只搜 `user-api` 分类,而不是全部文档)
- **top-k 调小**: 检索 3-5 条足够,不需要 20 条
- **分片/分库**: 按业务域拆多个 collection,或按时间分片,各查各的

### 2. 生成延迟与成本: 控制上下文

LLM 生成速度和成本与上下文长度强相关——**塞进 Prompt 的文档越多,首字越慢、越贵、越容易超限**。控制手段:

```
检索 10 条 → rerank 压缩到 3 条 → 精简后拼进 Prompt
```

```javascript
// 先检索多一些,rerank 后只保留最相关的 3 条
const initialResults = await retriever.getRelevantDocuments(question, 10);

const reranker = new CohereRerank({ topN: 3 });  // 排序压缩
const context = (await reranker.compressDocuments(initialResults, question))
  .map(doc => doc.pageContent)
  .join("\n\n");
```

**查询改写**也是成本优化: 用户口语化的长问题先让 LLM 改写成精炼的检索语句,减少无效检索和无效上下文。

### 3. 缓存: 相同问题不重复花钱

**语义缓存**是 RAG 场景的标配——用户问"如何登录"和"怎么登录"是同一个问题,不该重复调用 LLM:

```javascript
// 语义缓存: 问题向量相似度超过阈值直接命中,跳过检索 + LLM
const cache = new Map()

async function queryWithCache(question) {
  const qVector = await embeddings.embedQuery(question)

  for (const [cachedQ, cached] of cache) {
    const score = cosineSimilarity(qVector, cachedQ.vector)
    if (score > 0.95) return cached  // 相似度阈值命中
  }

  const answer = await generate(question)
  cache.set({ text: question, vector: qVector }, answer)
  return answer
}
```

**其他缓存点:**
- **embedding 结果缓存**: 同一段文本只算一次向量(入库 + 查询都复用)
- **热点问题缓存**: 高频问题直接缓存完整回答
- 缓存注意设置 TTL/容量上限,避免脏数据常驻(与知识库更新联动失效)

### 4. 索引构建性能

文档入库(向量化)是**离线任务**,但文档量大时也要优化:

- **embedding 离线预计算**: 入库脚本提前算好向量存库,查询时只算问题向量
- **分批 + 并发控制**: 每批 N 篇文档,用信号量限制 embedding 并发数(接口限流,也防内存暴涨)
- **增量索引**: 只对新文档做 embedding,而不是全量重建

---

## 🚫 常见陷阱

### 陷阱1: Chunk太大或太小

```
❌ Chunk太大 (5000+字符)
- 检索不精确
- 浪费token

❌ Chunk太小 (100字符以下)
- 丢失上下文
- 检索效果差

✅ 推荐: 500-1500字符,overlap 100-200
```

### 陷阱2: 忽略Metadata

```
❌ 只存储文本,不存储metadata
- 无法过滤
- 无法追溯来源

✅ 始终保存metadata:
- source (来源文件)
- page (页码)
- section (章节)
- timestamp (时间戳)
```

### 陷阱3: 检索过多文档

```
❌ 一次检索20+文档
- Context太长
- LLM注意力分散
- Token成本高

✅ 检索3-5个最相关文档即可
```

### 陷阱4: 不处理"不知道"的情况

```
❌ LLM强行回答文档中没有的内容

✅ Prompt中明确说明:
"如果文档中没有相关信息,请说'我不知道'"
```

---

## 📊 RAG vs Fine-tuning

| 维度 | RAG | Fine-tuning |
|------|-----|-------------|
| **适用场景** | 动态知识、频繁更新 | 固定领域、风格迁移 |
| **知识更新** | ✅ 实时更新 | ❌ 需要重新训练 |
| **成本** | ✅ 低 (只需embedding) | ❌ 高 (需要GPU训练) |
| **可解释性** | ✅ 可追溯来源 | ❌ 黑盒 |
| **幻觉风险** | ✅ 较低 (有文档支撑) | ❌ 仍有幻觉 |
| **实施难度** | ✅ 简单 | ❌ 复杂 |

**建议**: 大多数场景优先选择RAG,只有在需要特定领域语言风格时才考虑fine-tuning。

---

## 🔧 常用工具和库

### JavaScript/TypeScript

- **LangChain.js** - 最流行的LLM应用框架
- **LlamaIndex.ts** - 专注于数据索引和检索
- **Vectara** - 托管的RAG服务

### Python

- **LangChain** - Python版
- **LlamaIndex** - Python版
- **Haystack** - Deepset开源框架

### 向量数据库

- **ChromaDB** - 轻量级,易上手
- **Pinecone** - 云服务,生产就绪
- **Weaviate** - 功能强大
- **Qdrant** - 高性能
- **Milvus** - 大规模部署

---

## 🎯 实战项目建议

### 项目1: 个人知识库问答
- 收集你的笔记(Markdown)
- 构建RAG系统
- 可以随时提问你的笔记内容

### 项目2: 公司文档助手
- 导入公司内部文档
- 新员工可以快速查询流程、规范

### 项目3: API文档机器人
- 如上面的示例
- 帮助开发者快速查找API用法

### 项目4: 代码库问答
- 索引代码仓库
- 提问"如何实现XX功能?"
- AI定位相关代码并解释

---

## 🔗 延伸阅读

- [Prompt Engineering Basics](../prompt-engineering/basics.md) - 基础提示工程
- [LangChain.js Documentation](https://js.langchain.com/) - 官方文档
- [Vector Databases Explained](https://www.pinecone.io/learn/vector-database/) - 向量数据库详解

---

## 💬 总结

RAG的核心价值:

1. **解决知识截止** - LLM可以访问最新知识
2. **减少幻觉** - 回答有文档支撑
3. **可追溯** - 可以查看引用来源
4. **低成本** - 无需fine-tuning

**学习路径:**
1. ✅ 理解RAG基本原理
2. ✅ 动手实现一个简单的RAG系统
3. ✅ 学习进阶技巧(metadata filtering, re-ranking)
4. ✅ 应用到实际项目中

下一步: 学习 [知识库实战](./knowledge-base.md),用代码实现RAG系统。

import { glob } from 'glob'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { Document } from '@langchain/core/documents'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { ChromaClient } from 'chromadb'
import { OpenAIEmbeddings } from '@langchain/openai'
import { createMarkdownChunker } from './chunker.js'
import { config } from '../config/index.js'

async function index() {
  console.log('开始索引文档...')
  console.log(`文档路径: ${config.docsPath}`)

  const files = await glob('**/*.md', {
    cwd: config.docsPath,
    ignore: ['node_modules/**', '.vitepress/**'],
    absolute: true,
  })

  console.log(`找到 ${files.length} 个 Markdown 文件`)

  const docs: Document[] = []
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8')
    const { content, data } = matter(raw)
    const relativePath = path.relative(config.docsPath, file)
    docs.push(
      new Document({
        pageContent: content,
        metadata: { source: relativePath, title: data.title || '' },
      })
    )
  }

  const chunker = createMarkdownChunker()
  const chunks = await chunker.splitDocuments(docs)

  // 块级标题上下文：切分后的孤立块不带章节归属，embedding 时容易断章取义，
  // 在块首拼上文档标题，让向量同时编码"来自哪篇文章"的信息
  for (const chunk of chunks) {
    const title = chunk.metadata.title || chunk.metadata.source || ''
    chunk.pageContent = title ? `【${title}】\n${chunk.pageContent}` : chunk.pageContent
  }

  console.log(`切分为 ${chunks.length} 个文档块`)

  const embeddings = new OpenAIEmbeddings({
    modelName: config.embeddingModel,
    apiKey: 'ollama',
    configuration: { baseURL: config.ollamaBaseUrl },
    batchSize: 10,
  })

  const chromaUrl = `http://${config.chromaHost}:${config.chromaPort}`
  console.log(`正在写入 Chroma (${chromaUrl})...`)

  // 每次索引都全量重建：删除旧集合，避免随机 ID 造成数据累积重复
  const client = new ChromaClient({ path: chromaUrl })
  try {
    await client.deleteCollection({ name: config.collectionName })
    console.log(`已删除旧集合 ${config.collectionName}`)
  } catch {
    // 集合不存在时忽略
  }

  const vectorStore = new Chroma(embeddings, {
    collectionName: config.collectionName,
    url: chromaUrl,
  })

  // 分批写入：Chroma 服务端对单次请求体大小有限制（约 35MB），
  // 2200+ 块 × 1024 维向量一次性提交会超出限制导致 413
  const BATCH_SIZE = 300
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    await vectorStore.addDocuments(batch)
    console.log(`已写入 ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} 个文档块`)
  }

  console.log(`索引完成: ${chunks.length} 个文档块, 来自 ${files.length} 个文件`)
}

index().catch((err) => {
  console.error('索引失败:', err)
  process.exit(1)
})

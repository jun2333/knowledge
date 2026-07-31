import { glob } from 'glob'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { Document } from '@langchain/core/documents'
import { Chroma } from '@langchain/community/vectorstores/chroma'
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
  console.log(`切分为 ${chunks.length} 个文档块`)

  const embeddings = new OpenAIEmbeddings({
    modelName: config.embeddingModel,
    apiKey: config.dashscopeApiKey,
    configuration: { baseURL: config.dashscopeBaseUrl },
    batchSize: 10,
  })

  const chromaUrl = `http://${config.chromaHost}:${config.chromaPort}`
  console.log(`正在写入 Chroma (${chromaUrl})...`)

  await Chroma.fromDocuments(chunks, embeddings, {
    collectionName: config.collectionName,
    url: chromaUrl,
  })

  console.log(`索引完成: ${chunks.length} 个文档块, 来自 ${files.length} 个文件`)
}

index().catch((err) => {
  console.error('索引失败:', err)
  process.exit(1)
})

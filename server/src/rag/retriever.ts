import { Chroma } from '@langchain/community/vectorstores/chroma'
import { OpenAIEmbeddings } from '@langchain/openai'
import { config } from '../config/index.js'

let cachedStore: Chroma | null = null
let cacheValidated = false

async function getVectorStore(): Promise<Chroma> {
  if (!cachedStore || !cacheValidated) {
    const embeddings = new OpenAIEmbeddings({
      modelName: config.embeddingModel,
      apiKey: 'ollama',
      configuration: { baseURL: config.ollamaBaseUrl },
      batchSize: 10,
    })

    cachedStore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: config.collectionName,
      url: `http://${config.chromaHost}:${config.chromaPort}`,
    })
    cacheValidated = true
  }

  return cachedStore
}

/**
 * 按需检索：供 Function Calling 工具使用，top_k 可动态传入。
 * 返回 [Document, score][]（score 越小越相关）。
 */
export async function searchDocs(query: string, k: number = 5) {
  const store = await getVectorStore()
  return store.similaritySearchWithScore(query, k)
}

/** 兼容旧接口（rag-eval 等）：固定 topK 的 retriever */
export async function getRetriever(topK: number = 5) {
  const store = await getVectorStore()
  return store.asRetriever({ k: topK })
}

// rag:index 会删除并重建集合，旧句柄会失效；调用方在检索失败时调用此函数触发重建
export function invalidateRetriever() {
  cacheValidated = false
}

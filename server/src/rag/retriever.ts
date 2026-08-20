import { Chroma } from '@langchain/community/vectorstores/chroma'
import { OpenAIEmbeddings } from '@langchain/openai'
import { config } from '../config/index.js'

let cachedRetriever: ReturnType<Chroma['asRetriever']> | null = null
let cacheValidated = false

async function createRetriever(topK: number) {
  const embeddings = new OpenAIEmbeddings({
    modelName: config.embeddingModel,
    apiKey: 'ollama',
    configuration: { baseURL: config.ollamaBaseUrl },
    batchSize: 10,
  })

  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: config.collectionName,
    url: `http://${config.chromaHost}:${config.chromaPort}`,
  })

  return vectorStore.asRetriever({ k: topK })
}

export async function getRetriever(topK: number = 5) {
  if (!cachedRetriever || !cacheValidated) {
    cachedRetriever = await createRetriever(topK)
    cacheValidated = true
  }

  return cachedRetriever
}

// rag:index 会删除并重建集合，旧句柄会失效；调用方在检索失败时调用此函数触发重建
export function invalidateRetriever() {
  cacheValidated = false
}

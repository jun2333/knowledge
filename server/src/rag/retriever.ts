import { Chroma } from '@langchain/community/vectorstores/chroma'
import { OpenAIEmbeddings } from '@langchain/openai'
import type { Document } from '@langchain/core/documents'
import { config } from '../config/index.js'
import { rerank } from './reranker.js'

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
 * 按来源去重：同一篇文档只保留最相关的一块。
 * 否则 topK 会被同一篇的多个块占满（实测「前端错误监控」前 4 名全是同一篇），
 * 既浪费位置，也让期望文档被挤下去。入参需已按相关性从高到低排好序。
 */
function dedupeBySource(results: [Document, number][], k: number): [Document, number][] {
  const seen = new Set<string>()
  const out: [Document, number][] = []
  for (const item of results) {
    const src = String(item[0].metadata.source || '')
    if (seen.has(src)) continue
    seen.add(src)
    out.push(item)
    if (out.length >= k) break
  }
  return out
}

/**
 * 语义检索：先向量召回候选（可选经 cross-encoder 精排），再按来源去重后取 topK。
 * 返回 [Document, score][]：未开 rerank 时 score 为向量距离（越小越相关），
 * 开启 rerank 时为相关性分数（越大越相关）。
 */
export async function searchDocs(query: string, k: number = 5) {
  const store = await getVectorStore()
  const candidates = await store.similaritySearchWithScore(query, Math.max(k, config.rerankCandidates))

  if (!config.rerankEnabled) {
    return dedupeBySource(candidates, k)
  }

  const ranked = await rerank(
    query,
    candidates.map(([doc]) => doc),
    candidates.length
  )
  return dedupeBySource(
    ranked.map((r) => [r.doc, r.score] as [Document, number]),
    k
  )
}

/** 兼容旧接口（rag-eval 等）：返回带 invoke 的检索器（内部已含 rerank） */
export async function getRetriever(topK: number = 5) {
  return {
    async invoke(query: string): Promise<Document[]> {
      const results = await searchDocs(query, topK)
      return results.map(([doc]) => doc)
    },
  }
}

// rag:index 会删除并重建集合，旧句柄会失效；调用方在检索失败时调用此函数触发重建
export function invalidateRetriever() {
  cacheValidated = false
}

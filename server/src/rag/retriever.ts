import { Chroma } from '@langchain/community/vectorstores/chroma'
import { OpenAIEmbeddings } from '@langchain/openai'
import { config } from '../config/index.js'

export async function getRetriever(topK: number = 5) {
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

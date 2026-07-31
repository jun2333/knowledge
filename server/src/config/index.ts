import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

export const config = {
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY || '',
  dashscopeBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  embeddingModel: 'text-embedding-v3',
  chatModel: 'qwen-plus',

  chromaHost: process.env.CHROMA_HOST || 'localhost',
  chromaPort: parseInt(process.env.CHROMA_PORT || '8000'),
  collectionName: 'knowledge_base',

  docsPath: path.resolve(__dirname, '../../../docs'),

  chunkSize: 1000,
  chunkOverlap: 200,

  port: parseInt(process.env.PORT || '3000'),
}

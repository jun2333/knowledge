import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

export const config = {
  // === LLM 模型（本地 Ollama）===
  ollamaBaseUrl: 'http://localhost:11434/v1',  // Ollama 本地服务地址，兼容 OpenAI API 格式
  chatModel: 'qwen3:8b',  // 聊天模型名称（qwen3 新一代，质量优于 qwen2.5:7b）
  embeddingModel: 'bge-m3',  // 向量模型名称（bge-m3 中文检索质量显著优于 mxbai-embed-large，实测对比见 rag-eval）

  // === Chroma 向量数据库 ===
  chromaHost: process.env.CHROMA_HOST || 'localhost',  // Chroma 服务地址
  chromaPort: parseInt(process.env.CHROMA_PORT || '8000'),  // Chroma 服务端口
  collectionName: 'knowledge_base',  // 向量集合名称，存储所有文档向量

  // === 文档处理 ===
  docsPath: path.resolve(__dirname, '../../../docs'),  // 文档根目录，索引时扫描此目录下的 .md 文件

  // === 文本切分策略 ===
  chunkSize: 1000,   // 每个文本块的最大字符数
  chunkOverlap: 200, // 相邻文本块的重叠字符数，避免关键信息被切断

  // === 服务端口 ===
  port: parseInt(process.env.PORT || '3000'),  // Koa 后端服务监听端口
}

// 知识库实例配置（唯一入口）。
// 换一份内容只需改这里；路径支持相对本文件或绝对路径（内容可放在仓库外）。
// 类型提示来自 server/src/config/types.ts。
/** @type {import('@kb/core/types').KnowledgeConfig} */
export default {
  name: 'front-end-knowledge',

  // 索引范围（glob）。exclude 同时用于索引与评估出题，避免个人内容混入
  index: {
    include: ['**/*.md'],
    // interview-questions：与其他正文同质、会挤占检索；index.md / getting-started：站点的元信息，非知识正文
    exclude: ['node_modules/**', '.vitepress/**', 'interview-questions/**', 'index.md', 'getting-started/**'],
  },

  // 本实例的数据目录（index-manifest / chroma / eval-history / eval-baseline）
  dataDir: './data',

  // 评估目录（测试集 / 阈值 / 已审核记录 / 报告）
  evalDir: './eval',

  // 向量集合名（一实例一库；不同实例用不同名字即可隔离）
  collectionName: 'knowledge_base',

  // 模型：默认走本地 Ollama；也可指向任意 OpenAI 兼容的远程服务（Key 从环境变量读）
  models: {
    baseUrl: 'http://localhost:11434/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    chat: 'qwen3:8b',
    embedding: 'bge-m3',
    // 远程示例（取消注释并配好对应环境变量即可）：
    // chat: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKeyEnv: 'DEEPSEEK_API_KEY' },
    // embedding: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'BAAI/bge-m3', apiKeyEnv: 'SILICONFLOW_API_KEY' },
  },

  // 文本切分
  chunk: { size: 1000, overlap: 200 },

  // Rerank 重排（实测 bge-reranker-base 弱于 bge-m3 向量本身，默认关闭）
  rerank: { enabled: false, candidates: 20 },

  // 检索策略：混合检索（向量 + BM25 关键词），默认开启
  // 纯向量在精确词（英文缩写 / 专有名词 / 代码标识符）上最弱，BM25 正好互补。
  // 实测：Hit@5 98.4%→100%，Hit@1 87.6%→89.6%，MRR 0.923→0.944（零模型成本）
  retrieval: {
    hybrid: { enabled: true, candidates: 50, vectorWeight: 0.7, bm25Weight: 0.3 },
  },

  // 向量库：默认本地 Chroma；远程 / 云给 url + tokenEnv（可被 CHROMA_HOST / CHROMA_PORT 覆盖）
  chroma: {
    host: 'localhost',
    port: 8000,
    // 远程示例：url: 'https://xxx.chromadb.cloud', tokenEnv: 'CHROMA_TOKEN', tenant: 'xxx', database: 'xxx'
  },

  // 后端服务端口（可被 PORT 覆盖）
  port: 3000,

  // .env 文件（相对本文件）
  envFile: './.env',

  // 目录名 → 分类显示名（评估统计 / 出题用）
  categories: {
    react: 'React',
    vue: 'Vue',
    browser: '浏览器',
    javascript: 'JavaScript',
    css: 'CSS',
    performance: '性能',
    engineering: '工程化',
    service: '服务端',
    'ai-agent': 'AI Agent',
    algorithms: '算法',
    'cross-platform': '大前端',
  },

  // 站点（docs/.vitepress 消费）
  site: {
    title: '知识库',
    description: '个人知识库',

    // 「仅本地」的内容路径（相对 docs/，可省略 .md）—— 内容策略：
    // 这些目录/文件只在本地产出（线上不构建、不进菜单、不进侧边栏）
    onlyLocal: [
      'algorithms',
      'java-practice',
      'books',
      'sports',
      'misc',
      'interview-questions',
      'project-architecture',
      'template-editor',
      'agent-cli',
      'resume',
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/jun2333/knowledge' }],

    // AI 助手的文案（不写则用通用默认值）
    chat: {
      title: '知识库助手',
      welcome: '你好！我是知识库助手',
      hints: '可以问我关于本知识库涉及的任何问题',
    },
  },
}


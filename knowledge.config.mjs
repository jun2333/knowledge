// 知识库实例配置（唯一入口）。
// 内容固定放本文件同级的 docs/（不可配置）；dataDir / evalDir 等其它路径支持相对本文件或绝对路径。
// 类型提示来自基座包 @minijun/kb-core。
/** @type {import('@minijun/kb-core/types').KnowledgeConfig} */
export default {
  name: 'front-end-knowledge',

  // 索引范围（glob）。exclude 同时用于索引与评估出题，避免个人内容混入
  index: {
    include: ['**/*.md'],
    // 排除「不是知识正文」的内容：
    //   interview-questions：与其他正文同质、会挤占检索
    //   resume：个人简历副本，会被当成技术内容误召回
    //   index.md / ANNOTATION-GUIDE.md / getting-started：站点的元信息与使用说明
    exclude: [
      'node_modules/**',
      '.vitepress/**',
      'interview-questions/**',
      'resume/**',
      'index.md',
      'ANNOTATION-GUIDE.md',
      'getting-started/**',
    ],
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
    embedding: 'bge-m3',
    // 关掉思考：查笔记这类问题不需要推理，开着首字要等 34 秒（实测），关掉降到个位数。
    // 只对本地 Ollama 生效（走原生 /api/chat 的 think 参数；OpenAI 兼容接口不支持该参数）。
    thinking: false,
    // 空闲超时：多久没收到任何数据就中断（默认 120s）。
    // 防的是「连接还在但一个字节都不来」——没有它会一直挂着。
    timeoutMs: 120000,

    // 模型池：只描述「连哪」，不含调用参数。key 是别名。
    pool: {
      // 常规档：继承上面的 thinking: false，用于准备阶段和简单问题的生成
      'qwen3-8b': { model: 'qwen3:8b' },
      // 同模型开思考：复杂问题的生成用
      'qwen3-8b-think': { model: 'qwen3:8b', thinking: true },

      // ── 外部模型示例（取消注释并配好环境变量即可用）──────────────
      // SiliconFlow：OpenAI 兼容，key 放 .env，配置里只写变量名
      // 'sf-qwen3-8b': {
      //   baseUrl: 'https://api.siliconflow.cn/v1',
      //   model: 'Qwen/Qwen3-8B',
      //   apiKeyEnv: 'SILICONFLOW_API_KEY',
      //   timeoutMs: 30000,          // 远端超时给短一点，挂了快速失败好切下一个
      // },
      // DeepSeek：便宜、指令遵循好，非思考模式也能稳定调工具
      // 'ds-flash': {
      //   baseUrl: 'https://api.deepseek.com/v1',
      //   model: 'deepseek-chat',
      //   apiKeyEnv: 'DEEPSEEK_API_KEY',
      //   timeoutMs: 30000,
      // },
    },

    // 按阶段选模型：数组顺序 = 优先级 = 失败降级顺序
    stages: {
      // 准备阶段：改写 + 要不要检索 + 复杂不复杂（一次调用搞定）
      prepare: ['qwen3-8b'],
      // 简单问题的生成：关思考，快
      generate: ['qwen3-8b'],
      // 复杂问题的生成：开思考，回答更完整（对比 / 综合 / 原理类问题）
      generateComplex: ['qwen3-8b-think'],
    },
  },

  // 文本切分
  chunk: { size: 1000, overlap: 200 },

  // 对话编排
  // 只有一条路径：改写 → 意图判断 → 检索 → 拼装 → 生成
  // topK = 预检索条数（生成阶段模型还能自己补检索，编号沿用同一张表）
  agent: { topK: 3 },

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
    title: `Jun's Knowledge Base`,
    description: '个人知识库',

    // 「仅本地」的内容路径（相对 docs/，可省略 .md）—— 内容策略：
    // 这些目录/文件只在本地产出（线上不构建、不进菜单、不进侧边栏）
    //
    // 已在线上：service / dev-agent-harness（项目技术文档，对外展示）
    // 仍为本地：下面这些要么是个人内容（简历、面试题、笔记），要么是
    //含内部数据的项目文档（project-architecture 有评估基线数字、
    // template-editor 是公司商业项目）。
    onlyLocal: [
      'algorithms',
      'java-practice',
      'books',
      'sports',
      'misc',
      'interview-questions',
      // 'project-architecture',
      'template-editor',
      'resume',
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/jun2333/knowledge' }],

    // AI 助手的文案（不写则用通用默认值）
    chat: {
      title: '知识库助手',
      welcome: '你好！我是知识库助手',
      hints: '可以问我关于本知识库涉及的任何问题',
      suggestions: ['前端主流框架对比', 'agent是什么?']
    },
  },
}


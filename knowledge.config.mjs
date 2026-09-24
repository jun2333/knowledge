// 知识库实例配置（唯一入口）。
// 换一份内容只需改这里；路径支持相对本文件或绝对路径（内容可放在仓库外）。
// 类型提示来自 server/src/config/types.ts。
/** @type {import('@kb/core/types').KnowledgeConfig} */
export default {
  name: 'front-end-knowledge',

  // 内容根目录：文档扫描与站点源码目录
  contentRoot: './docs',

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
    frontend: '大前端',
  },

  // 站点（docs/.vitepress 消费）
  site: {
    dir: './docs', // 站点根（含 .vitepress 的目录）
    title: '知识库',
    description: '个人知识库',
    socialLinks: [{ icon: 'github', link: 'https://github.com/jun2333/knowledge' }],

    // AI 助手的文案（不写则用通用默认值）
    chat: {
      title: '前端知识库助手',
      welcome: '你好！我是前端知识库助手',
      hints: '可以问我关于 JavaScript、Vue、React、CSS、性能优化等问题',
    },
    // 本实例保留精修的 sidebar（写在 docs/.vitepress/sidebar.manual.mts），故不启用自动生成
    autoSidebar: false,

    // 顶部导航 = 「仅本地」的唯一来源（本地 / 线上共用这一份）。
    // 带 onlyLocal 的项：线上自动隐藏，且其路径会被排除出编译 / sidebar / 死链检查：
    //   onlyLocal: 'algorithms'          → 排除整个目录
    //   onlyLocal: 'service/roadmap.md'  → 只排除该文件（目录 / 文件自动识别，可省略 .md）
    //   onlyLocal: ['a', 'b']            → 分组内多项
    //   onlyLocal: true                  → 仅隐藏菜单，路径按该项 link 推导
    // 某分组过滤后只剩 1 项时，该项会自动提到顶层。留空则按内容目录自动生成。
    nav: [
      { text: '快速上手', link: '/getting-started/' },
      { text: 'AI Agent', link: '/ai-agent/' },
      {
        text: '前端',
        items: [
          { text: 'JavaScript', link: '/javascript/memory' },
          { text: 'Vue', link: '/vue/double-binding' },
          { text: 'React', link: '/react/concept' },
          { text: 'CSS', link: '/css/bfc' },
        ],
      },
      { text: '泛前端', link: '/frontend/hybrid' },
      { text: '浏览器', link: '/browser/overview' },
      {
        text: '工程化',
        items: [
          { text: '性能优化', link: '/performance/best-practices' },
          { text: '架构设计', link: '/engineering/micro-frontend' },
          { text: 'React vs Vue', link: '/engineering/react-vs-vue' },
        ],
      },
      {
        text: '后端',
        items: [
          { text: 'Service（学习路线）', link: '/service/roadmap', onlyLocal: 'service/roadmap.md' },
          { text: 'Service', link: '/service/node-core' },
          { text: 'Java 实战', link: '/java-practice/', onlyLocal: 'java-practice' },
        ],
      },
      { text: '算法', link: '/algorithms/basic', onlyLocal: 'algorithms' },
      {
        text: '个人记录',
        onlyLocal: [
          'books',
          'sports',
          'misc',
          'guide',
          'interview-questions',
          'project-architecture',
          'template-editor',
          'resume',
        ],
        items: [
          { text: '读书笔记', link: '/books/js-you-dont-know' },
          { text: '面试题', link: '/interview-questions/' },
          { text: '项目架构', link: '/project-architecture/' },
          { text: 'Agent CLI', link: '/agent-cli/' },
          { text: '模板编辑器', link: '/template-editor/' },
          { text: '简历', link: '/resume/v4-frontend' },
          { text: '运动', link: '/sports/breaststroke-for-beginners' },
          { text: '杂项', link: '/misc/notes' },
        ],
      },
    ],
  },
}

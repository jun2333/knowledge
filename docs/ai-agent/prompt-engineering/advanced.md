# Prompt Engineering 高级技巧

在掌握了基础技巧后,我们来学习一些更高级的Prompt Engineering技术。

## 🎯 高级技巧概览

1. **Self-Consistency** - 自我一致性
2. **Tree of Thoughts** - 思维树
3. **ReAct Pattern** - 推理+行动
4. **Meta-Prompting** - 元提示
5. **Constitutional AI** - 宪法式AI
6. **Prompt Chaining** - 提示链

---

## 1. Self-Consistency (自我一致性)

### 原理

让AI多次回答同一个问题,然后选择最一致的答案。

### 应用场景

- 复杂逻辑推理
- 数学计算
- 代码生成验证

### 实现方式

```markdown
# 第一轮
请实现一个函数,判断字符串是否是回文:

'''typescript
function isPalindrome(s: string): boolean {
  // 你的实现
}
'''

# 第二轮(用不同的方法)
请用另一种方法实现同样的功能:

# 第三轮(验证)
请比较以上两种实现:
1. 哪种更高效?
2. 哪种更易读?
3. 是否有边界情况未处理?

基于以上分析,给出最终推荐方案。
```

### 效果

通过多次迭代,可以发现潜在问题,提高代码质量。

---

## 2. Tree of Thoughts (思维树)

### 原理

让AI探索多种可能的解决路径,形成"思维树",然后选择最优路径。

### 应用场景

- 复杂问题解决
- 架构设计
- 算法优化

### 实现方式

```markdown
我需要设计一个前端缓存策略。

请从以下三个维度分别分析:

## 路径1: 浏览器缓存
- 优势: ...
- 劣势: ...
- 适用场景: ...

## 路径2: Service Worker缓存
- 优势: ...
- 劣势: ...
- 适用场景: ...

## 路径3: CDN缓存
- 优势: ...
- 劣势: ...
- 适用场景: ...

## 综合评估

基于以上分析,对于电商网站的商品列表页,哪种方案最合适?
请给出理由和具体实现建议。
```

### 效果

避免AI陷入单一思路,获得更全面的解决方案。

---

## 3. ReAct Pattern (Reasoning + Acting)

### 原理

让AI交替进行推理(Reasoning)和行动(Acting),逐步解决问题。

### 应用场景

- 需要查阅文档的任务
- 调试复杂问题
- 多步骤任务

### 实现方式

```markdown
请按照ReAct模式帮我调试这个问题:

问题: React应用在某些情况下出现内存泄漏

Thought 1: 首先需要确定泄漏的来源
Action 1: 检查是否有未清理的定时器、事件监听器、订阅

[AI分析代码,找出潜在问题]

Observation 1: 发现useEffect中有addEventListener但没有removeEventListener

Thought 2: 这确实会导致内存泄漏,需要在cleanup函数中移除
Action 2: 提供修复代码

[AI给出修复方案]

Thought 3: 还需要检查其他组件是否有类似问题
Action 3: 扫描整个项目的useEffect

...继续直到问题解决
```

### 效果

系统性地解决问题,不会遗漏关键步骤。

---

## 4. Meta-Prompting (元提示)

### 原理

让AI帮你优化prompt,或者让AI生成prompt。

### 应用场景

- 不知道如何提问
- 需要标准化prompt模板
- 自动化prompt生成

### 实现方式

#### 方式1: 让AI优化prompt

```markdown
我想让AI帮我实现一个登录页面,但不知道如何写prompt。

请帮我优化以下prompt:

原始prompt: "做个登录页面"

请改进这个prompt,使其能够引导AI生成高质量的登录页面代码。
考虑:
- 技术栈指定
- 功能需求
- UI/UX要求
- 安全性考虑
```

#### 方式2: 让AI生成prompt模板

```markdown
我经常需要让AI帮我做Code Review。

请为我生成一个标准化的Code Review prompt模板,包含:
- Role设定
- Review要点
- 输出格式
- 评分标准

模板应该可以复用于不同语言的代码review。
```

### 效果

快速获得高质量的prompt,提高工作效率。

---

## 5. Constitutional AI (宪法式AI)

### 原理

给AI设定一组不可违背的原则(宪法),确保其行为符合预期。

### 应用场景

- 安全敏感的應用
- 需要严格遵循规范的场景
- 团队协作中的AI助手

### 实现方式

```markdown
# Constitution (宪法)

你是一个前端开发助手,必须遵守以下原则:

## 安全性原则
1. 永远不要硬编码敏感信息(API keys, passwords)
2. 始终使用HTTPS
3. 对用户输入进行验证和转义

## 质量原则
1. 代码必须符合TypeScript严格模式
2. 必须添加适当的错误处理
3. 必须考虑性能影响

## 可维护性原则
1. 代码必须有清晰的注释
2. 遵循SOLID原则
3. 避免过度工程化

## 响应规则

当被要求做违反上述原则的事情时:
1. 明确指出违反了哪条原则
2. 解释为什么这样做不好
3. 提供符合原则的替代方案

---

现在,请基于以上constitution,帮我实现用户认证功能。
```

### 效果

确保AI的输出始终符合团队规范和安全要求。

---

## 6. Prompt Chaining (提示链)

### 原理

将复杂任务拆分成多个步骤,每一步的output作为下一步的input。

### 应用场景

- 复杂的数据处理流程
- 多阶段的内容生成
- 端到端的自动化任务

### 实现方式

```markdown
## Step 1: 需求分析
请分析以下用户需求,提取关键功能点:

"我想要一个博客系统,用户可以写文章、评论、点赞,还要有标签分类和搜索功能"

输出格式: JSON数组,每个元素包含 { feature: string, priority: 'high' | 'medium' | 'low' }

---

## Step 2: 数据库设计
基于Step 1的功能列表,设计数据库schema:

[Step 1的输出]

输出: PostgreSQL表结构SQL

---

## Step 3: API设计
基于Step 2的数据库设计,设计RESTful API:

[Step 2的输出]

输出: OpenAPI spec

---

## Step 4: 前端组件设计
基于Step 3的API,设计React组件树:

[Step 3的输出]

输出: 组件层级结构和props定义
```

### 自动化实现

可以用脚本自动执行prompt chain:

```javascript
async function promptChain() {
  // Step 1
  const requirements = await llm.generate(requirementsPrompt);
  
  // Step 2
  const schema = await llm.generate(schemaPrompt(requirements));
  
  // Step 3
  const api = await llm.generate(apiPrompt(schema));
  
  // Step 4
  const components = await llm.generate(componentPrompt(api));
  
  return { requirements, schema, api, components };
}
```

### 效果

将复杂任务自动化,减少人工干预。

---

## 🚀 实战案例

### 案例1: 用Tree of Thoughts设计架构

```markdown
我需要为一个日活10万的电商网站设计前端架构。

请从以下三个角度分别分析:

## 方案A: 传统SPA (React Router)
**优势:**
- 开发简单,生态成熟
- SEO可以通过SSR解决

**劣势:**
- 首屏加载慢
- 大量路由时bundle体积大

**适用场景:**
- 中小型应用
- SEO要求不高

## 方案B: Micro-Frontends
**优势:**
- 团队独立开发
- 技术栈灵活

**劣势:**
- 复杂度高
- 共享状态困难

**适用场景:**
- 大型团队
- 多业务线

## 方案C: Islands Architecture (Astro)
**优势:**
- 极致的性能
- 按需加载JS

**劣势:**
- 生态较新
- 学习成本

**适用场景:**
- 内容为主的网站
- 性能要求极高

## 决策

对于我们的场景(日活10万电商,5人前端团队,SEO重要):

**推荐方案:** 方案A (SPA) + SSR (Next.js)

**理由:**
1. 团队规模适中,不需要micro-frontends的复杂度
2. SEO重要,Next.js的SSR开箱即用
3. 生态成熟,招聘容易

**实施计划:**
[详细计划]
```

### 案例2: 用ReAct Pattern调试

```markdown
请用ReAct模式帮我解决这个性能问题:

问题: 商品列表页滚动卡顿

Thought 1: 首先确认瓶颈在哪里
Action 1: 使用React DevTools Profiler分析组件渲染

Observation 1: ProductList组件每次滚动都重新渲染,耗时200ms

Thought 2: 可能是props变化导致的重渲染
Action 2: 检查ProductList的props

Observation 2: 父组件传递了一个新的array引用给products prop

Thought 3: 这就是问题所在!需要用useMemo稳定引用
Action 3: 提供修复代码

```typescript
// 修复前
const filteredProducts = products.filter(...);

// 修复后
const filteredProducts = useMemo(() => 
  products.filter(...), 
  [products, filter]
);
```

Thought 4: 还可以进一步优化,使用虚拟列表
Action 4: 建议使用react-window

最终方案:
1. 用useMemo稳定props引用
2. 用react-window实现虚拟滚动
3. 图片懒加载
```

### 案例3: 用Prompt Chaining生成CRUD

```markdown
## Chain: 从数据库表到完整CRUD

### Prompt 1: 生成TypeScript类型
```
基于以下PostgreSQL表结构,生成TypeScript interface:

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

Output:
```typescript
interface User {
  id: number;
  email: string;
  name?: string;
  createdAt: Date;
}
```

### Prompt 2: 生成API endpoints
```
基于User interface,生成Express.js CRUD endpoints:

[User interface]
```

Output: Express routes

### Prompt 3: 生成React hooks
```
基于API endpoints,生成React Query hooks:

[API endpoints]
```

Output: useUsers, useUser, useCreateUser, etc.

### Prompt 4: 生成UI组件
```
基于hooks,生成完整的用户管理页面:

[hooks]
```

Output: 完整的React组件
```

---

## 📊 技巧对比

| 技巧 | 适用场景 | 复杂度 | 效果 |
|------|---------|--------|------|
| Self-Consistency | 验证答案正确性 | 低 | ⭐⭐⭐ |
| Tree of Thoughts | 多方案对比 | 中 | ⭐⭐⭐⭐ |
| ReAct Pattern | 调试/问题解决 | 中 | ⭐⭐⭐⭐⭐ |
| Meta-Prompting | Prompt优化 | 低 | ⭐⭐⭐ |
| Constitutional AI | 规范化输出 | 中 | ⭐⭐⭐⭐ |
| Prompt Chaining | 复杂任务自动化 | 高 | ⭐⭐⭐⭐⭐ |

---

## 🎓 最佳实践

### 1. 组合使用技巧

不要只用一种技巧,而是根据场景组合:

```markdown
# 示例: 用Constitutional + Tree of Thoughts设计系统

## Constitution
你必须遵守:
- 安全性第一
- 性能优先
- 可维护性

## Tree of Thoughts
请从以下三个方案中选择:
- 方案A: ...
- 方案B: ...
- 方案C: ...

## Self-Consistency
对选定的方案,请用两种不同方法验证其可行性。
```

### 2. 建立Prompt库

将常用的prompt保存为模板:

```
prompts/
├── code-review.md
├── bug-fix.md
├── feature-design.md
└── refactoring.md
```

### 3. 持续优化

记录哪些prompt效果好,哪些不好:

```markdown
# Prompt Performance Log

## Prompt: Code Review Template
- Used: 50 times
- Success rate: 90%
- Issues: 有时会过于strict
- Improvement: 添加severity级别

## Prompt: Bug Fix Assistant
- Used: 30 times
- Success rate: 75%
- Issues: 有时找不到root cause
- Improvement: 加入ReAct pattern
```

---

## 🔗 延伸阅读

- [Prompt Engineering Basics](./basics.md) - 基础技巧回顾
- [Harness Engineering](../harness-engineering/core-concepts.md) - 超越Prompt Engineering
- [LangChain Documentation](https://js.langchain.com/) - Prompt Chain的实现库

---

## 💬 总结

高级Prompt Engineering的核心:

1. **系统性思考** - 不只是单次交互,而是设计完整的对话流程
2. **多路径探索** - 让AI探索多种可能性,而不是单一答案
3. **自动化思维** - 用prompt chain实现复杂任务的自动化
4. **质量控制** - 用constitution和自我验证确保输出质量

记住:**Prompt Engineering不是魔法,而是一种工程化思维。**

下一步: 学习 [RAG (Retrieval Augmented Generation)](../rag/introduction.md),了解如何给AI添加知识库。

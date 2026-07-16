# AI Harness 工程最佳实践

::: tip 什么是 AI Harness?
AI Harness 是指构建 AI 应用的工程化框架和工具集，包括项目结构、配置管理、Prompt 工程、错误处理、监控等最佳实践。
:::

::: info 前置阅读
本文聚焦工程实践细节。关于 Harness Engineering 的整体思想，请先阅读 [核心概念](/ai-agent/harness-engineering/core-concepts)。
:::

## 核心原则

| 原则 | 说明 |
|------|------|
| 模块化设计 | Agent 拆分为独立模块，职责清晰 |
| 配置驱动 | 通过配置文件管理行为，而非硬编码 |
| 错误容忍 | LLM 可能失败，必须有完善的降级策略 |
| 可观测性 | 详细的日志和监控，便于调试和优化 |

---

## 项目结构

### 推荐目录结构（通用）

```
my-ai-project/
├── AGENTS.md              # AI Agent 入口指引
├── src/
│   ├── agents/            # Agent 实现
│   ├── prompts/           # Prompt 模板
│   ├── tools/             # 工具函数
│   └── config/            # 配置文件
├── docs/
│   ├── solutions/         # 知识沉淀
│   ├── plans/             # 实施方案
│   └── tasks/             # 任务包
├── tests/                 # 测试文件
└── .env.example           # 环境变量示例
```

### 进阶结构（来自 dev-agent-harness）

```
dev-agent-harness/
├── harness.md             # Agent 主入口 prompt
├── context-rules/         # 上下文加载策略
│   ├── file-discovery.md  # 文件发现策略
│   └── loading-strategy.md # 分阶段加载规则
── skills/                # 通用技能
│   ├── knowledge-init/    # 知识库初始化
│   ├── reflecting/        # 复盘 + 经验收集
│   ├── skill-evolution/   # 技能自成长
│   └── state-checkpoint/  # 状态记录与断点恢复
├── templates/             # 产出模板
├── workflows/             # 工作流定义（YAML）
└── workspace/             # 运行时产物（gitignore）
```

### 进阶结构（来自 spec-first）

```
spec-first/
├── CLAUDE.md              # Claude Code 入口（source-of-truth）
├── AGENTS.md              # 从 CLAUDE.md 自动派生
── skills/                # 37 个 workflow skill
├── agents/                # 51 个 agent profile
├── templates/             # host runtime 模板
├── docs/
│   ├── contracts/         # 契约定义
│   ├── solutions/         # 可复用经验
│   └── standards/         # 团队规范
├── src/cli/               # CLI 实现
└── .claude/               # Generated runtime（禁止手改）
```

---

## Prompt 工程最佳实践

### 1. Prompt 模板化

** Bad: 硬编码 Prompt**
```typescript
const prompt = `你是一个客服助手。请回答这个问题：${question}`;
```

**✅ Good: 使用模板**
```typescript
// prompts/faq.prompt.txt
你是一个专业的客服助手，负责回答用户关于产品的问题。

要求：
- 回答要简洁明了，不超过 200 字
- 如果不确定，请诚实告知
- 语气友好专业
- 基于以下参考资料回答

参考资料：
{{references}}

用户问题：{{question}}

你的回答：
```

```typescript
// 使用模板引擎
import { compile } from 'handlebars';

const template = await readFile('prompts/faq.prompt.txt', 'utf-8');
const compiled = compile(template);

const prompt = compiled({
  question: userQuestion,
  references: knowledgeResults.join('\n'),
});
```

### 2. System Prompt 设计

**结构化 System Prompt**：
```typescript
const systemPrompt = `
# Role
你是一名资深客服专家，专注于解决用户问题。

# Constraints
- 只回答与产品相关的问题
- 不要编造不存在的信息
- 遇到无法回答的问题，建议转人工
- 保持专业和友好的语气

# Output Format
请按照以下格式回答：
1. 直接回答问题
2. 提供相关建议（可选）
3. 询问是否需要进一步帮助

# Examples
User: "如何重置密码？"
Assistant: "您可以通过以下步骤重置密码：
1. 点击登录页面的'忘记密码'
2. 输入您的邮箱
3. 查收邮件并点击链接
4. 设置新密码

需要我帮您操作吗？"
`;
```

### 3. Few-Shot Learning

在 Prompt 中提供示例：

```typescript
const prompt = `
根据用户问题，判断意图分类：

示例 1:
User: "我的订单什么时候到？"
Intent: ORDER_STATUS

示例 2:
User: "我想退货"
Intent: RETURN_REQUEST

示例 3:
User: "这个产品怎么用？"
Intent: PRODUCT_USAGE

现在请分类以下问题：
User: "${userQuestion}"
Intent:
`;
```

### 4. Chain of Thought

引导 LLM 逐步思考：

```typescript
const prompt = `
请按以下步骤分析问题：

1. 理解用户的核心需求
2. 检索相关的知识库内容
3. 评估信息的可靠性
4. 组织清晰的回答
5. 检查回答是否完整

用户问题：${question}

思考过程：
1. 核心需求：
2. 相关知识：
3. 可靠性评估：
4. 回答草稿：
5. 最终回答：
`;
```

---

## Token 管理与成本控制

### 1. Token 计数

```typescript
import { encode } from 'gpt-tokenizer';

class TokenManager {
  countTokens(text: string): number {
    return encode(text).length;
  }
  
  estimateCost(tokens: number, model: string): number {
    const prices = {
      'gpt-4': 0.03 / 1000,      // $0.03 per 1K tokens
      'gpt-3.5-turbo': 0.001 / 1000,
      'claude-2': 0.008 / 1000,
    };
    
    return tokens * (prices[model] || 0.002 / 1000);
  }
}
```

### 2. Prompt 优化技巧

**减少冗余**：
```typescript
// ❌ Bad: 冗长的描述
const prompt = `
你好，我是一个人工智能助手。我今天想帮助你回答一个问题。
这个问题是关于我们的产品的。请你仔细阅读下面的问题，然后给出一个详细的回答。
我希望你的回答能够准确、清晰、并且有帮助...
`;

// ✅ Good: 简洁明了
const prompt = `
作为客服助手，请准确回答用户问题：

问题：${question}
回答：
`;
```

**截断过长的上下文**：
```typescript
function truncateContext(context: string[], maxTokens: number): string[] {
  let totalTokens = 0;
  const result: string[] = [];
  
  // 从后往前添加，保留最近的上下文
  for (let i = context.length - 1; i >= 0; i--) {
    const tokens = tokenManager.countTokens(context[i]);
    if (totalTokens + tokens > maxTokens) break;
    
    result.unshift(context[i]);
    totalTokens += tokens;
  }
  
  return result;
}
```

### 3. 缓存策略

```typescript
import NodeCache from 'node-cache';

class ResponseCache {
  private cache = new NodeCache({ stdTTL: 3600 }); // 1小时过期
  
  async getOrFetch(key: string, fetchFn: () => Promise<string>): Promise<string> {
    const cached = this.cache.get(key);
    if (cached) {
      metrics.cacheHit++;
      return cached as string;
    }
    
    metrics.cacheMiss++;
    const response = await fetchFn();
    this.cache.set(key, response);
    
    return response;
  }
}
```

---

## 错误处理与降级

### 1. 重试机制

```typescript
import { retry } from 'async-retry';

class LLMClient {
  async generateWithRetry(prompt: string, maxRetries = 3): Promise<string> {
    return retry(async (bail, attempt) => {
      try {
        return await this.generate(prompt);
      } catch (error: any) {
        if (error.status === 429) {
          // Rate limit, wait and retry
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Rate limited, waiting ${waitTime}ms...`);
          await sleep(waitTime);
          throw error;
        } else if (error.status >= 500) {
          throw error;
        } else {
          bail(error);
        }
      }
    }, {
      retries: maxRetries,
      minTimeout: 1000,
      maxTimeout: 10000,
    });
  }
}
```

### 2. Fallback 策略

```typescript
class AgentWithFallback {
  async answerQuestion(question: string): Promise<string> {
    try {
      return await this.callGPT4(question);
    } catch (error) {
      console.warn('GPT-4 failed, falling back to GPT-3.5');
      
      try {
        return await this.callGPT35(question);
      } catch (error2) {
        console.warn('GPT-3.5 also failed, using cached response');
        return this.getCachedAnswer(question) || 
          '抱歉，暂时无法回答您的问题，请稍后再试或转人工客服。';
      }
    }
  }
}
```

### 3. 超时控制

```typescript
import pTimeout from 'p-timeout';

async function generateWithTimeout(prompt: string, timeout = 10000): Promise<string> {
  return pTimeout(
    llm.generate(prompt),
    timeout,
    new Error('LLM request timeout')
  );
}
```

---

## 日志与监控

### 1. 结构化日志

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'agent.log' }),
  ],
});

logger.info('LLM Request', {
  eventType: 'llm_request',
  agentId: 'customer-support',
  action: 'answerFAQ',
  prompt: prompt.substring(0, 500),
  promptTokens: tokenCount,
  timestamp: Date.now(),
});

logger.info('LLM Response', {
  eventType: 'llm_response',
  agentId: 'customer-support',
  action: 'answerFAQ',
  response: answer.substring(0, 500),
  responseTokens: responseTokenCount,
  cost: estimatedCost,
  latency: endTime - startTime,
  timestamp: Date.now(),
});
```

### 2. 指标收集

```typescript
class MetricsCollector {
  private metrics = {
    requests: 0,
    successes: 0,
    failures: 0,
    totalLatency: 0,
    totalCost: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  
  recordRequest(latency: number, cost: number, success: boolean) {
    this.metrics.requests++;
    if (success) this.metrics.successes++;
    else this.metrics.failures++;
    this.metrics.totalLatency += latency;
    this.metrics.totalCost += cost;
  }
  
  getStats() {
    return {
      ...this.metrics,
      avgLatency: this.metrics.totalLatency / this.metrics.requests,
      successRate: this.metrics.successes / this.metrics.requests,
      cacheHitRate: this.metrics.cacheHits / 
        (this.metrics.cacheHits + this.metrics.cacheMisses),
    };
  }
}
```

### 3. 关键指标监控

```typescript
const alertRules = {
  successRate: { threshold: 0.95, operator: '<', severity: 'warning' },
  avgLatency: { threshold: 2000, operator: '>', severity: 'warning' },
  hourlyCost: { threshold: 10, operator: '>', severity: 'critical' },
  cacheHitRate: { threshold: 0.3, operator: '<', severity: 'info' },
};
```

---

## 安全性考虑

### 1. API Key 管理

**✅ Good: 使用环境变量**
```typescript
// .env (不要提交到 Git)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

// .env.example (提交到 Git 的模板)
OPENAI_API_KEY=your_api_key_here

// 代码中读取
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not set');
}
```

### 2. 输入验证

```typescript
function validateUserInput(input: string): void {
  if (input.length > 1000) {
    throw new Error('Input too long');
  }
  
  const dangerousPatterns = [
    /system\s*:/i,           // Prompt injection
    /ignore\s+previous/i,    // Instruction override
    /<script/i,              // XSS
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      logger.warn('Potentially malicious input detected', { input });
      throw new Error('Invalid input');
    }
  }
}
```

### 3. 输出过滤

```typescript
function filterOutput(output: string): string {
  const sensitivePatterns = [
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // 信用卡号
    /\b\d{3}-\d{2}-\d{4}\b/g,                       // SSN
    /password\s*[:=]\s*\S+/gi,                      // 密码
  ];
  
  let filtered = output;
  for (const pattern of sensitivePatterns) {
    filtered = filtered.replace(pattern, '[REDACTED]');
  }
  
  return filtered;
}
```

---

## 高级场景

### 多 Agent 协作

当单个 Agent 无法完成复杂任务时，需要多个 Agent 协作。

**协作模式**：

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| 路由分发 | 主 Agent 根据意图分发 | 客服、咨询 |
| 流水线 | Agent A 输出 → Agent B 输入 | 翻译 + 润色 |
| 投票 | 多个 Agent 独立回答，投票决定 | 代码审查、风险评估 |
| 辩论 | Agent 之间互相质疑，达成共识 | 复杂决策 |

**示例**（来自 spec-first）：
- 51 个 agent profile，涵盖架构、安全、性能、正确性等各专业维度
- 每个 skill 可调用多个 agent 进行多维度评审

### 复杂工作流编排

**场景**：代码生成需要多个步骤，每步依赖前一步的结果。

```yaml
# workflow.yaml
workflow:
  name: "feature-implementation"
  
  steps:
    - id: analyze
      agent: "analyst"
      input: "{{user_request}}"
      output: "requirements.md"
      
    - id: design
      agent: "architect"
      input: "{{analyze.output}}"
      output: "design.md"
      depends_on: ["analyze"]
      
    - id: implement
      agent: "developer"
      input: "{{design.output}}"
      output: "src/"
      depends_on: ["design"]
      
    - id: review
      agent: "reviewer"
      input: "{{implement.output}}"
      output: "review.md"
      depends_on: ["implement"]
```

**执行逻辑**：
```typescript
class WorkflowEngine {
  async execute(workflow: Workflow, inputs: Record<string, any>) {
    const results = new Map<string, any>();
    
    for (const step of workflow.steps) {
      // 等待依赖完成
      for (const dep of step.depends_on) {
        if (!results.has(dep)) {
          await this.waitFor(dep);
        }
      }
      
      // 准备输入
      const stepInputs = this.resolveInputs(step.input, results);
      
      // 执行
      const result = await step.agent.execute(stepInputs);
      results.set(step.id, result);
    }
    
    return results;
  }
}
```

---

## 来自实践项目的进阶技巧

### 1. 反合理化红旗表（来自 dev-agent-harness）

列出 AI 常见的"偷懒念头"和纠正动作：

| 偷懒念头 | 纠正动作 |
|---------|---------|
| "测试应该能过，先声明完成吧" | 实际运行验证命令 |
| "这个改动很明显，不用读上游设计文档" | 先读上游产出物的 Summary 区块 |
| "claim 说测试通过就够了" | 测试报告必须列出全部用例的实际状态 |

### 2. Summary-first 交接协议（两个项目都有）

所有产出物头部统一有 "Summary for downstream" 区块：

```markdown
## Summary for downstream

- **Goal**: 实现用户登录功能
- **Scope**: LoginForm 组件 + AuthContext + API client
- **Key Decisions**: 使用 httpOnly cookie 存储 JWT
- **Known Risks**: 未实现 i18n
- **Downstream Files**: src/components/LoginForm.tsx, src/context/AuthContext.tsx
```

**解决什么问题**：下游阶段不读上游产出物，或全文塞入 context 导致 token 浪费。

### 3. 确定性事实与语义判断分离（两个项目都有）

**规则**：
- **确定性输入**：从实际状态读取（文件列表、git hash、exit code），必须标注来源
- **语义判断**：基于确定性输入推断（需求理解、架构取舍、风险评估），必须标注依据

**不要**：
- 把语义判断伪装成确定性事实
- 把确定性工作交给 LLM 判断

### 4. 知识淘汰机制

**dev-agent-harness 方式**：

| 规则 | 条件 |
|------|------|
| **回源检查**（优先） | `source_refs` 指向的文件有变更 → 触发失效判断，人工确认后更新或归档 |
| **过期淘汰** | 创建 > 90 天 **且** use_count = 0 **且** 无 `source_refs` → 移入 archive/ |
| **低置信度淘汰** | confidence < 0.3 → 归档 |
| **重复合并** | 标签高度重合且场景相似 → 合并 |
| **晋升机制** | use_count >= 5 且 confidence >= 0.8 → 建议提升为 pattern |

**spec-first 方式**：
- `invalidation_condition` 字段：具体可验证的失效条件（如"NextAuth 升级到 v6"）
- `source_refs` 字段：关联的源码文件路径，用于回源检查
- `spec-compound-refresh`：检测并更新过时的 learning 文档

### 5. Source/Runtime 分离（来自 spec-first）

```
Source truth (手动维护):
- skills/           # workflow 定义
- agents/           # agent 配置
- templates/        # 产物模板
- CLAUDE.md         # 入口指引

Generated runtime (CLI 自动生成):
- .claude/          # Claude Code 入口
- .codex/           # Codex 入口
- .agents/skills/   # 运行时副本
```

**原则**：永远不要手改 generated runtime，修改 source 后重新 init。

---

## 检查清单

在项目上线前，确保完成以下检查：

### 基础功能
- [ ] Prompt 模板已优化，无冗余内容
- [ ] 实现了完整的错误处理
- [ ] 有合理的超时和重试机制
- [ ] Fallback 策略已配置

### 性能与成本
- [ ] 实现了响应缓存
- [ ] Token 使用已优化
- [ ] 有成本控制措施
- [ ] 并发请求有限流

### 可观测性
- [ ] 详细的日志记录
- [ ] 关键指标已收集
- [ ] 告警规则已配置
- [ ] 仪表盘已搭建

### 安全性
- [ ] API Key 使用环境变量
- [ ] 输入验证已实现
- [ ] 输出过滤已配置
- [ ] 敏感信息已脱敏

### 测试
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试已通过
- [ ] 压力测试已完成
- [ ] 边界情况已覆盖

### Harness Engineering（进阶）
- [ ] 有明确的 AGENTS.md 或入口指引
- [ ] 任务拆解为可追踪的 waves/tasks
- [ ] 完成声明附带证据（测试、diff、build）
- [ ] 知识沉淀到 docs/solutions/
- [ ] 有反合理化机制
- [ ] 确定性/判断分离

---

## 延伸阅读

- [核心概念](/ai-agent/harness-engineering/core-concepts) - Harness Engineering 整体思想
- [Spec-First 核心思想](/ai-agent/spec-first/overview) - Spec-First 如何实践这些思想
- [Spec-First 工作流程](/ai-agent/spec-first/workflow) - 完整的 workflow 链路

---

## 总结

AI Harness 工程的最佳实践可以概括为：

1. **模块化** - 清晰的职责划分
2. **配置化** - 灵活的行为控制
3. **容错性** - 完善的错误处理
4. **可观测** - 详细的日志监控
5. **安全性** - 严格的输入输出控制
6. **工程化** - 任务追踪、证据收集、知识沉淀

遵循这些实践，你将构建出健壮、可维护的 AI 应用。

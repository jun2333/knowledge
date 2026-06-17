# AI Harness 工程最佳实践

::: tip 什么是 AI Harness?
AI Harness 是指构建 AI 应用的工程化框架和工具集,包括项目结构、配置管理、Prompt 工程、错误处理、监控等最佳实践。它帮助你快速搭建可维护、可扩展的 AI 应用。
:::

## 🎯 核心原则

### 1. 模块化设计
将 Agent 拆分为独立的模块,每个模块职责清晰。

### 2. 配置驱动
通过配置文件管理行为,而非硬编码。

### 3. 错误容忍
LLM 可能失败,必须有完善的降级策略。

### 4. 可观测性
详细的日志和监控,便于调试和优化。

---

## 📁 项目结构

### 推荐的目录结构

```
my-ai-agent/
├── src/
│   ├── agents/              # Agent 实现
│   │   ├── customer-support/
│   │   │   ├── index.ts
│   │   │   ├── faq.handler.ts
│   │   │   └── ticket.handler.ts
│   │   └── base-agent.ts    # Agent 基类
│   │
│   ├── prompts/             # Prompt 模板
│   │   ├── faq.prompt.txt
│   │   ├── ticket.prompt.txt
│   │   └── system.prompt.txt
│   │
│   ├── tools/               # 工具函数
│   │   ├── llm-client.ts    # LLM 客户端封装
│   │   ├── vector-store.ts  # 向量存储
│   │   └── cache.ts         # 缓存工具
│   │
│   ├── config/              # 配置文件
│   │   ├── default.json
│   │   ├── production.json
│   │   └── development.json
│   │
│   ├── middleware/          # 中间件
│   │   ├── logging.ts       # 日志中间件
│   │   ├── rate-limit.ts    # 限流中间件
│   │   └── auth.ts          # 认证中间件
│   │
│   └── utils/               # 通用工具
│       ├── logger.ts
│       ├── metrics.ts
│       └── errors.ts
│
├── tests/                   # 测试文件
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/                    # 文档
├── .env.example             # 环境变量示例
├── package.json
└── tsconfig.json
```

---

## 🔧 Prompt 工程最佳实践

### 1. Prompt 模板化

**❌ Bad: 硬编码 Prompt**
```typescript
const prompt = `你是一个客服助手。请回答这个问题: ${question}`;
```

**✅ Good: 使用模板**
```typescript
// prompts/faq.prompt.txt
你是一个专业的客服助手,负责回答用户关于产品的问题。

要求:
- 回答要简洁明了,不超过 200 字
- 如果不确定,请诚实告知
- 语气友好专业
- 基于以下参考资料回答

参考资料:
{{references}}

用户问题: {{question}}

你的回答:
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

**结构化 System Prompt**:
```typescript
const systemPrompt = `
# Role
你是一名资深客服专家,专注于解决用户问题。

# Constraints
- 只回答与产品相关的问题
- 不要编造不存在的信息
- 遇到无法回答的问题,建议转人工
- 保持专业和友好的语气

# Output Format
请按照以下格式回答:
1. 直接回答问题
2. 提供相关建议(可选)
3. 询问是否需要进一步帮助

# Examples
User: "如何重置密码?"
Assistant: "您可以通过以下步骤重置密码:
1. 点击登录页面的'忘记密码'
2. 输入您的邮箱
3. 查收邮件并点击链接
4. 设置新密码

需要我帮您操作吗?"
`;
```

### 3. Few-Shot Learning

在 Prompt 中提供示例:

```typescript
const prompt = `
根据用户问题,判断意图分类:

示例 1:
User: "我的订单什么时候到?"
Intent: ORDER_STATUS

示例 2:
User: "我想退货"
Intent: RETURN_REQUEST

示例 3:
User: "这个产品怎么用?"
Intent: PRODUCT_USAGE

现在请分类以下问题:
User: "${userQuestion}"
Intent:
`;
```

### 4. Chain of Thought

引导 LLM 逐步思考:

```typescript
const prompt = `
请按以下步骤分析问题:

1. 理解用户的核心需求
2. 检索相关的知识库内容
3. 评估信息的可靠性
4. 组织清晰的回答
5. 检查回答是否完整

用户问题: ${question}

思考过程:
1. 核心需求: 
2. 相关知识:
3. 可靠性评估:
4. 回答草稿:
5. 最终回答:
`;
```

---

## 💰 Token 管理与成本控制

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

// 使用
const tokenManager = new TokenManager();
const tokens = tokenManager.countTokens(prompt + response);
const cost = tokenManager.estimateCost(tokens, 'gpt-4');
console.log(`Cost: $${cost.toFixed(4)}`);
```

### 2. Prompt 优化技巧

**减少冗余**:
```typescript
// ❌ Bad: 冗长的描述
const prompt = `
你好,我是一个人工智能助手。我今天想帮助你回答一个问题。
这个问题是关于我们的产品的。请你仔细阅读下面的问题,然后给出一个详细的回答。
我希望你的回答能够准确、清晰、并且有帮助...
`;

// ✅ Good: 简洁明了
const prompt = `
作为客服助手,请准确回答用户问题:

问题: ${question}
回答:
`;
```

**截断过长的上下文**:
```typescript
function truncateContext(context: string[], maxTokens: number): string[] {
  let totalTokens = 0;
  const result: string[] = [];
  
  // 从后往前添加,保留最近的上下文
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
    // 尝试从缓存获取
    const cached = this.cache.get(key);
    if (cached) {
      metrics.cacheHit++;
      return cached as string;
    }
    
    // 缓存未命中,调用 LLM
    metrics.cacheMiss++;
    const response = await fetchFn();
    
    // 存入缓存
    this.cache.set(key, response);
    
    return response;
  }
}

// 使用
const cache = new ResponseCache();
const answer = await cache.getOrFetch(
  `faq:${questionHash}`,
  () => llm.generate(prompt)
);
```

---

## ⚠️ 错误处理与降级

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
          throw error; // Retry
        } else if (error.status >= 500) {
          // Server error, retry
          throw error;
        } else {
          // Client error, don't retry
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
      // 尝试使用 GPT-4
      return await this.callGPT4(question);
    } catch (error) {
      console.warn('GPT-4 failed, falling back to GPT-3.5');
      
      try {
        // Fallback 到 GPT-3.5
        return await this.callGPT35(question);
      } catch (error2) {
        console.warn('GPT-3.5 also failed, using cached response');
        
        // 最后的 Fallback: 返回预设答案
        return this.getCachedAnswer(question) || 
          '抱歉,暂时无法回答您的问题,请稍后再试或转人工客服。';
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

// 使用
try {
  const answer = await generateWithTimeout(prompt, 5000);
} catch (error) {
  if (error.message.includes('timeout')) {
    // 处理超时
    return '响应超时,请稍后再试';
  }
  throw error;
}
```

---

## 📊 日志与监控

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

// 记录完整的 LLM 交互
logger.info('LLM Request', {
  eventType: 'llm_request',
  agentId: 'customer-support',
  action: 'answerFAQ',
  prompt: prompt.substring(0, 500), // 截断避免过长
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
    if (success) {
      this.metrics.successes++;
    } else {
      this.metrics.failures++;
    }
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

// 定期上报
setInterval(() => {
  const stats = metricsCollector.getStats();
  logger.info('Agent Metrics', stats);
  
  // 发送到监控系统
  sendToMonitoring(stats);
}, 60000); // 每分钟
```

### 3. 关键指标监控

```typescript
// 告警规则
const alertRules = {
  // 成功率低于 95% 时告警
  successRate: { threshold: 0.95, operator: '<', severity: 'warning' },
  
  // 平均延迟超过 2秒 时告警
  avgLatency: { threshold: 2000, operator: '>', severity: 'warning' },
  
  // 成本超过预算时告警
  hourlyCost: { threshold: 10, operator: '>', severity: 'critical' },
  
  // 缓存命中率低于 30% 时告警
  cacheHitRate: { threshold: 0.3, operator: '<', severity: 'info' },
};

function checkAlerts(metrics: any) {
  for (const [metric, rule] of Object.entries(alertRules)) {
    if (evaluateRule(metrics[metric], rule)) {
      sendAlert({
        metric,
        value: metrics[metric],
        rule,
        timestamp: Date.now(),
      });
    }
  }
}
```

---

## 🔒 安全性考虑

### 1. API Key 管理

**❌ Bad: 硬编码密钥**
```typescript
const apiKey = 'sk-xxxxxxxxxxxxx'; // 永远不要这样做!
```

**✅ Good: 使用环境变量**
```typescript
// .env (不要提交到 Git)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxx

// .env.example (提交到 Git 的模板)
OPENAI_API_KEY=your_api_key_here
ANTHROPIC_API_KEY=your_api_key_here

// 代码中读取
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not set');
}
```

### 2. 输入验证

```typescript
function validateUserInput(input: string): void {
  // 长度限制
  if (input.length > 1000) {
    throw new Error('Input too long');
  }
  
  // 检测潜在的攻击
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
  // 移除可能的敏感信息
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

## 📝 检查清单

在项目上线前,确保完成以下检查:

### 基础功能
- [ ] Prompt 模板已优化,无冗余内容
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

---

## 🔗 延伸阅读

- [架构设计](/ai-agent/harness-engineering/architecture) - 深入理解系统设计
- [脚手架与模板](/ai-agent/harness-engineering/scaffolding) - 快速启动项目
- [Spec-First 工作流](/ai-agent/spec-first/workflow) - 规范驱动开发

---

## 💬 总结

AI Harness 工程的最佳实践可以概括为:

1. **模块化** - 清晰的职责划分
2. **配置化** - 灵活的行为控制
3. **容错性** - 完善的错误处理
4. **可观测** - 详细的日志监控
5. **安全性** - 严格的输入输出控制

遵循这些实践,你将构建出健壮、可维护的 AI 应用。

**下一步**: 学习 [架构设计](/ai-agent/harness-engineering/architecture),深入了解系统设计的细节。

# Harness Engineering 核心思想

::: tip 什么是 Harness Engineering?
Harness Engineering 是 AI Agent 开发的第三层工程化思维,超越 Prompt Engineering 和 Context Engineering,专注于构建可追溯、可复用、可验证的工程闭环系统。
:::

## 🎯 为什么需要 Harness Engineering?

### AI 开发的三层演进

```
┌─────────────────────────────────────────┐
│         Prompt Engineering              │  ← 2022-2023
│  "如何让单次回答质量更高?"               │
│  • Few-shot learning                    │
│  • Chain of Thought                     │
│  • Role prompting                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Context Engineering             │  ← 2023-2024
│  "如何给 AI 正确的上下文?"               │
│  • RAG (检索增强生成)                    │
│  • Vector databases                     │
│  • MCP servers                          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│        Harness Engineering              │  ← 2024-2026
│  "如何构建工程化闭环?"                   │
│  • Workflow governance                  │
│  • Artifact management                  │
│  • Evidence-driven review               │
│  • Knowledge沉淀                        │
└─────────────────────────────────────────┘
```

### 现实痛点

**没有 Harness Engineering 时**:

```
开发者: "帮我实现一个用户登录功能"
AI:     "好的,这是代码..." (给出代码)
开发者: (复制代码,运行,报错)
开发者: "报错了: xxx"
AI:     "哦,需要修改这里..." (反复迭代)
开发者: (最终跑通了,但...)
         - 不知道为什么要这样设计
         - 下次遇到类似问题又要从头问
         - 团队其他人也不知道这个经验
         - 代码review只能看到diff,看不到决策过程
```

**有了 Harness Engineering**:

```
开发者: /spec:brainstorm "用户登录功能"
系统:   → docs/brainstorms/2026-06-17-login-requirements.md
         (记录需求背景、用户故事、验收标准)

开发者: /spec:plan
系统:   → docs/plans/2026-06-17-login-implementation.md
         (记录技术方案、文件清单、风险评估)

开发者: /spec:work
系统:   → 实现代码 + git commit
         → .spec-first/workflows/spec-work/evidence.json
         (记录实现证据: source reads, tests, build output)

开发者: /spec:code-review
系统:   → Review findings (结构化评审结果)
         → docs/solutions/authentication/login-pattern.md
         (沉淀为可复用知识)

下次团队成员要做类似功能:
/spec:sessions → 自动检索到之前的 login pattern
                → 直接复用,少走弯路
```

---

## 💡 Harness Engineering 六层模型详解

### 1. Context Harness - 上下文管理层

**问题**: LLM 的上下文窗口有限,给少了信息不足,给多了噪声太大且成本高。

**核心思想**: **Bounded Direct Reads** - 精确控制读取范围

#### 实践方法:

**❌ Bad: 无限制上下文**
```typescript
// 把整个项目扔给 AI
const context = await readEntireProject(); // 1000+ files
await llm.generate({ prompt, context });   // 超出窗口,或被截断
```

**✅ Good: Bounded Direct Reads**
```typescript
// 1. 基于任务类型确定读取边界
const readStrategy = {
  'bug-fix': {
    maxFiles: 10,
    priority: ['related-files', 'recent-changes', 'error-stack'],
  },
  'feature-add': {
    maxFiles: 20,
    priority: ['similar-features', 'architecture-docs', 'test-examples'],
  },
  'refactor': {
    maxFiles: 15,
    priority: ['target-module', 'dependents', 'integration-tests'],
  },
};

// 2. Summary-first handoff
// 先读高层摘要,再按需深入
const summary = await readArchitectureSummary();
const relevantFiles = selectRelevant(summary, task);
const details = await readSelective(relevantFiles);

// 3. Project guidance
// 从 AGENTS.md / CLAUDE.md 读取项目级约定
const projectRules = await readProjectGuidance();
```

**实际案例**:
```markdown
# .claude/agents/frontend-dev.md
You are a frontend developer for this project.

## Project Context
- Framework: React 18 + TypeScript
- State Management: Zustand
- Styling: Tailwind CSS
- Testing: Vitest + React Testing Library

## Reading Strategy
When implementing features:
1. Read `docs/architecture.md` for system overview
2. Read similar existing features in `src/features/`
3. Read component patterns from `src/components/`
4. NEVER read entire node_modules or dist/

## Output Expectations
- Always reference source files you read
- Explain tradeoffs in your approach
- Include test cases for critical paths
```

---

### 2. Execution Harness - 执行控制层

**问题**: AI 执行过程不透明,不知道进展,无法中断/恢复,难以协作。

**核心思想**: **Task Pack + Wave Execution** - 结构化任务拆解和分批执行

#### 实践方法:

**任务打包(Task Pack)**:
```yaml
# docs/tasks/2026-06-17-user-auth.yaml
task_pack:
  id: user-auth-implementation
  goal: "实现用户认证功能"
  
  waves:
    - wave: 1
      name: "基础结构"
      tasks:
        - id: 1.1
          description: "创建 AuthContext"
          files: [src/context/AuthContext.tsx]
          dependencies: []
          
        - id: 1.2
          description: "实现 login API client"
          files: [src/api/auth.ts]
          dependencies: []
      
    - wave: 2
      name: "UI 组件"
      tasks:
        - id: 2.1
          description: "LoginForm 组件"
          files: [src/components/LoginForm.tsx]
          dependencies: [1.1, 1.2]
          
        - id: 2.2
          description: "ProtectedRoute 组件"
          files: [src/components/ProtectedRoute.tsx]
          dependencies: [1.1]
      
    - wave: 3
      name: "测试与集成"
      tasks:
        - id: 3.1
          description: "单元测试"
          files: [src/**/*.test.tsx]
          dependencies: [2.1, 2.2]
          
        - id: 3.2
          description: "E2E 测试"
          files: [e2e/login.spec.ts]
          dependencies: [3.1]

  verification:
    build_success: true
    tests_passed: true
    lint_clean: true
```

**Wave 执行**:
```typescript
class TaskExecutor {
  async executeTaskPack(pack: TaskPack) {
    for (const wave of pack.waves) {
      console.log(`Executing wave ${wave.name}...`);
      
      // 并行执行当前 wave 的任务
      const results = await Promise.allSettled(
        wave.tasks.map(task => this.executeTask(task))
      );
      
      // 检查是否有失败
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        // 根据 stop_if 决定是否继续
        if (wave.stop_if_failure) {
          throw new Error(`Wave ${wave.name} failed`);
        }
      }
      
      // 记录 evidence
      await this.recordEvidence(wave, results);
    }
  }
}
```

**优势**:
- ✅ 清晰的进度跟踪
- ✅ 可以中断/恢复
- ✅ 多人/多 Agent 协作
- ✅ 失败时有明确的回滚点

---

### 3. Evidence Harness - 证据追踪层

**问题**: AI 说"完成了",但怎么证明?代码可能编译不过,测试可能没跑,需求可能没满足。

**核心思想**: **Verification Profile** - 完成声明必须附带证据

#### 证据类型:

```typescript
interface CompletionEvidence {
  // 1. Source reads - 证明了什么被读过
  sourceReads: {
    filePath: string;
    lines: string;
    purpose: string;  // 为什么读这个文件
  }[];
  
  // 2. Git diff - 证明改了什么
  gitDiff: {
    commitHash: string;
    filesChanged: string[];
    additions: number;
    deletions: number;
  };
  
  // 3. Test results - 证明测试通过
  testResults: {
    passed: number;
    failed: number;
    skipped: number;
    coverage?: number;
    reportPath: string;
  };
  
  // 4. Build output - 证明能编译
  buildOutput: {
    success: boolean;
    warnings: string[];
    errors: string[];
    outputPath?: string;
  };
  
  // 5. Runtime evidence - 证明能运行
  runtimeEvidence?: {
    logs: string[];
    screenshots?: string[];  // UI 变更
    apiResponses?: any[];
  };
  
  // 6. Requirement mapping - 证明满足需求
  requirementMapping?: {
    requirement: string;
    implementation: string;
    verifiedBy: string;  // 哪个测试/证据验证了
  }[];
}
```

**实际应用**:

```markdown
## Task Completion Report

**Task**: Implement user login form
**Status**: ✅ Completed

### Evidence Summary

#### Source Reads
- Read `src/api/auth.ts` (lines 10-45) - Existing login API
- Read `src/components/SignupForm.tsx` - Similar form pattern
- Read `docs/forms-guidelines.md` - Form validation standards

#### Changes Made
- Created `src/components/LoginForm.tsx` (+156 lines)
- Updated `src/routes/index.tsx` (+8 lines)
- Added `src/tests/LoginForm.test.tsx` (+89 lines)

Git commit: `abc1234`

#### Test Results
```
✓ LoginForm renders correctly (23ms)
✓ LoginForm validates email format (15ms)
✓ LoginForm calls onSubmit with credentials (18ms)
✓ LoginForm shows error on auth failure (21ms)

Total: 4 passed, 0 failed
Coverage: 92%
```

#### Build Status
```
✓ TypeScript compilation successful
✓ ESLint: no errors, 2 warnings (unrelated)
✓ Bundle size: +2.3KB (within budget)
```

#### Requirement Mapping
| Requirement | Implementation | Verified By |
|------------|----------------|-------------|
| Email validation | Zod schema | LoginForm.test.tsx:12 |
| Password masking | input type="password" | Visual inspection |
| Error handling | try-catch + toast | LoginForm.test.tsx:45 |
| Accessibility | ARIA labels | axe-core audit |

### Remaining Risks
- ⚠️ No E2E test yet (planned in wave 3)
- ⚠️ i18n not implemented (out of scope for this task)
```

**为什么重要**:
- 🔍 **可追溯**: 知道每个决策的依据
- 🛡️ **防造假**: 不能只说"完成了",要有证据
- 📊 **可度量**: 可以统计完成率、质量指标
- 🔄 **可复盘**: 出问题时知道哪里出了问题

---

### 4. Evaluation Harness - 评估度量层

**问题**: 怎么知道 AI 的实现真的变好了?还是只是看起来不一样?

**核心思想**: **Metric-Driven Development** - 用数据说话

#### 关键指标:

```typescript
interface AgentMetrics {
  // 1. Quality metrics
  quality: {
    codeReviewScore: number;        // Code review 评分
    testCoverage: number;           // 测试覆盖率
    bugRate: number;                // Bug 率 (bugs per feature)
    revertRate: number;             // 代码回滚率
  };
  
  // 2. Efficiency metrics
  efficiency: {
    avgTaskCompletionTime: number;  // 平均任务完成时间
    iterationCount: number;         // 平均迭代次数
    tokenCost: number;              // Token 成本
    humanInterventionRate: number;  // 人工介入率
  };
  
  // 3. Knowledge reuse metrics
  knowledgeReuse: {
    solutionHitRate: number;        // 知识库命中率
    avgTimeSaved: number;           // 平均节省时间
    compoundGrowthRate: number;     // 知识库增长率
  };
  
  // 4. Developer experience metrics
  dx: {
    satisfactionScore: number;      // 开发者满意度
    contextSwitchCount: number;     // 上下文切换次数
    cognitiveLoadScore: number;     // 认知负荷评分
  };
}
```

**实践方法**:

```typescript
class MetricsCollector {
  // 每次任务完成后收集指标
  async collectTaskMetrics(task: Task, result: TaskResult) {
    const metrics = {
      taskId: task.id,
      timestamp: Date.now(),
      
      // 质量
      codeReviewFindings: result.reviewFindings.length,
      testCoverage: await calculateCoverage(result.files),
      
      // 效率
      completionTime: result.endTime - result.startTime,
      iterations: result.iterations,
      tokensUsed: result.tokenUsage,
      
      // 知识复用
      solutionsReferenced: result.referencedSolutions,
      timeSaved: this.estimateTimeSaved(result.referencedSolutions),
    };
    
    await this.saveMetrics(metrics);
    
    // 如果指标异常,触发告警
    if (metrics.iterations > 5) {
      alert('High iteration count, may need human intervention');
    }
  }
  
  // 定期生成报告
  generateWeeklyReport() {
    const metrics = this.getWeekMetrics();
    
    return {
      summary: `
        本周完成 ${metrics.taskCount} 个任务
        平均代码审查评分: ${metrics.avgReviewScore}/5
        测试覆盖率: ${metrics.avgCoverage}%
        Token 成本: $${metrics.totalTokenCost}
        知识库新增: ${metrics.newSolutions} 条
      `,
      
      trends: {
        qualityTrend: this.calculateTrend(metrics.qualityScores),
        efficiencyTrend: this.calculateTrend(metrics.completionTimes),
      },
      
      recommendations: this.generateRecommendations(metrics),
    };
  }
}
```

**可视化仪表盘**:
```
┌──────────────────────────────────────────────┐
│          AI Agent Performance Dashboard      │
├──────────────────────────────────────────────┤
│                                              │
│  Quality Score                               │
│  ████████████████████░░  8.5/10  ↑ 12%      │
│                                              │
│  Avg Completion Time                         │
│  ████████████░░░░░░░░░░  23min   ↓ 8%       │
│                                              │
│  Test Coverage                               │
│  █████████████████░░░░░  85%     ↑ 5%       │
│                                              │
│  Token Cost (this week)                      │
│  $45.20  (budget: $100)                      │
│                                              │
│  Knowledge Base                              │
│  127 solutions  (+12 this week)              │
│  Hit rate: 34%  ↑ 8%                         │
│                                              │
└──────────────────────────────────────────────┘
```

---

### 5. Governance Harness - 安全管控层

**问题**: AI 可能越权操作、访问敏感信息、做出不安全决策。

**核心思想**: **Boundary Enforcement** - 强制执行边界和安全策略

#### 关键机制:

**1. Source/Runtime Gate**
```typescript
class GovernanceGate {
  // 检查操作是否允许
  async validateAction(action: AgentAction): Promise<ValidationResult> {
    // 规则 1: 不允许修改 generated runtime
    if (action.target.startsWith('.claude/') || 
        action.target.startsWith('.codex/')) {
      return {
        allowed: false,
        reason: 'Cannot modify generated runtime files',
        suggestion: 'Modify source skills/ instead and re-init',
      };
    }
    
    // 规则 2: 敏感文件需要人工审批
    if (this.isSensitiveFile(action.target)) {
      return {
        allowed: false,
        requiresApproval: true,
        approvers: ['tech-lead', 'security-team'],
      };
    }
    
    // 规则 3: 批量操作限制
    if (action.type === 'bulk-modify' && action.fileCount > 10) {
      return {
        allowed: false,
        reason: 'Bulk modification limited to 10 files',
        suggestion: 'Split into smaller batches',
      };
    }
    
    return { allowed: true };
  }
}
```

**2. Provider Degraded Mode**
```typescript
class ProviderManager {
  async executeWithFallback(prompt: string): Promise<string> {
    try {
      // 优先使用 GPT-4
      return await callGPT4(prompt);
    } catch (error) {
      if (error.code === 'RATE_LIMIT') {
        // 降级到 GPT-3.5
        logger.warn('GPT-4 rate limited, falling back to GPT-3.5');
        return await callGPT35(prompt);
      } else if (error.code === 'SERVICE_DOWN') {
        // 所有 provider 都不可用,进入 degraded mode
        logger.error('All providers unavailable');
        return this.degradedModeResponse();
      }
    }
  }
  
  degradedModeResponse(): string {
    return `
      ⚠️ AI service temporarily unavailable
      
      I'm operating in degraded mode. I can still:
      - Execute pre-approved templates
      - Run automated tests
      - Generate code from existing patterns
      
      For novel requests, please retry later or contact human team.
    `;
  }
}
```

**3. Audit Trail**
```typescript
class AuditLogger {
  async logDecision(decision: AgentDecision) {
    await this.auditDB.insert({
      timestamp: Date.now(),
      agent: decision.agentId,
      action: decision.action,
      rationale: decision.rationale,
      evidence: decision.evidence,
      approval: decision.approval,
      outcome: decision.outcome,
    });
    
    // 合规性检查
    if (this.requiresComplianceCheck(decision)) {
      await this.notifyComplianceTeam(decision);
    }
  }
}
```

---

### 6. Knowledge Harness - 知识沉淀层

**问题**: 解决的问题没有沉淀,下次还要从头开始。

**核心思想**: **Compound Learning** - 让每次解决问题都成为团队的资产

#### 知识沉淀流程:

```typescript
class KnowledgeHarvester {
  // 任务完成后,自动提取可复用知识
  async harvestKnowledge(task: Task, result: TaskResult) {
    const learnings: Learning[] = [];
    
    // 1. 提取解决方案模式
    if (result.isNovelSolution) {
      learnings.push({
        type: 'solution-pattern',
        title: `${task.domain} - ${task.problem}`,
        content: this.extractPattern(result),
        tags: [task.domain, task.problemType],
        evidence: result.evidence,
      });
    }
    
    // 2. 记录踩坑经验
    if (result.pitfalls.length > 0) {
      learnings.push({
        type: 'pitfall',
        title: `Avoid: ${result.pitfalls[0].description}`,
        content: this.formatPitfall(result.pitfalls[0]),
        tags: ['gotcha', 'debugging'],
      });
    }
    
    // 3. 更新现有知识
    await this.updateExistingKnowledge(learnings);
    
    // 4. 存储到 docs/solutions/
    for (const learning of learnings) {
      await this.saveLearning(learning);
    }
  }
  
  // 知识检索
  async findRelevantKnowledge(task: Task): Promise<Learning[]> {
    const query = {
      domain: task.domain,
      problemType: task.problemType,
      technologies: task.technologies,
    };
    
    // 向量搜索 + 关键词匹配
    const candidates = await this.vectorSearch(query);
    
    // 按相关性排序
    return candidates.sort((a, b) => 
      this.calculateRelevance(a, query) - this.calculateRelevance(b, query)
    ).slice(0, 5);
  }
}
```

**知识复用示例**:

```markdown
# docs/solutions/authentication/jwt-stateless-auth.md

## Problem
Implement stateless JWT authentication without session storage.

## Solution Pattern
1. Issue JWT on login with appropriate claims
2. Store JWT in httpOnly cookie (not localStorage)
3. Verify JWT signature on each request
4. Use refresh tokens for rotation

## Implementation Files
- `src/auth/jwt.service.ts` - JWT issuance and verification
- `src/middleware/auth.middleware.ts` - Request authentication
- `src/auth/token-rotation.ts` - Refresh token handling

## Pitfalls to Avoid
❌ Don't store JWT in localStorage (XSS vulnerable)
❌ Don't use long-lived access tokens
✅ Do implement token rotation
✅ Do use short-lived access tokens + refresh tokens

## Related Learnings
- See `docs/solutions/security/xss-prevention.md`
- See `docs/solutions/state-management/client-side.md`

## Evidence
- Implemented in PR #1234
- Tests: `src/auth/__tests__/jwt.service.test.ts`
- Security audit passed: 2026-06-17
```

**自动检索**:
```typescript
// 新任务: "实现 OAuth 登录"
const task = {
  domain: 'authentication',
  problemType: 'third-party-login',
  technologies: ['OAuth2', 'React'],
};

// 自动检索相关知识
const relevantKnowledge = await knowledgeBase.findRelevant(task);

// 返回:
// 1. JWT stateless auth pattern (相关度 85%)
// 2. XSS prevention strategies (相关度 72%)
// 3. Cookie security best practices (相关度 68%)

// 提供给 AI 作为参考
await ai.generate({
  prompt: task.description,
  context: relevantKnowledge,
});
```

---

## 🎓 实战:从零搭建 Harness

### Step 1: 初始化项目结构

```bash
mkdir my-ai-project && cd my-ai-project
npm init -y

# 创建目录结构
mkdir -p src/{agents,prompts,tools,config}
mkdir -p docs/{brainstorms,plans,tasks,solutions}
mkdir -p tests
mkdir -p .spec-first/{config,workspace}

# 创建配置文件
touch AGENTS.md CLAUDE.md .env.example
```

### Step 2: 定义项目约定

```markdown
# AGENTS.md

# Project Agents Guide

## Tech Stack
- Node.js 20+
- TypeScript 5.x
- Express.js for API
- PostgreSQL for database

## Coding Standards
- Use functional components
- Prefer async/await over promises
- Write tests for all business logic
- Follow SOLID principles

## File Organization
- Agents: `src/agents/{domain}/`
- Prompts: `src/prompts/{agent-name}.prompt.md`
- Tests: Co-located with source (`*.test.ts`)

## When Working on Tasks
1. Read relevant docs first
2. Check existing solutions in `docs/solutions/`
3. Create plan before coding
4. Write tests alongside code
5. Update documentation when done
```

### Step 3: 实现基础 Harness

```typescript
// src/harness/index.ts
import { ContextHarness } from './context';
import { ExecutionHarness } from './execution';
import { EvidenceHarness } from './evidence';
import { MetricsHarness } from './metrics';
import { GovernanceHarness } from './governance';
import { KnowledgeHarness } from './knowledge';

export class AIHarness {
  context: ContextHarness;
  execution: ExecutionHarness;
  evidence: EvidenceHarness;
  metrics: MetricsHarness;
  governance: GovernanceHarness;
  knowledge: KnowledgeHarness;
  
  constructor(config: HarnessConfig) {
    this.context = new ContextHarness(config.context);
    this.execution = new ExecutionHarness(config.execution);
    this.evidence = new EvidenceHarness(config.evidence);
    this.metrics = new MetricsHarness(config.metrics);
    this.governance = new GovernanceHarness(config.governance);
    this.knowledge = new KnowledgeHarness(config.knowledge);
  }
  
  async executeTask(task: Task): Promise<TaskResult> {
    // 1. 加载相关知识
    const relevantKnowledge = await this.knowledge.findRelevant(task);
    
    // 2. 准备上下文
    const context = await this.context.prepare(task, relevantKnowledge);
    
    // 3. 安全检查
    await this.governance.validateTask(task);
    
    // 4. 执行任务
    const result = await this.execution.execute(task, context);
    
    // 5. 收集证据
    const evidence = await this.evidence.collect(result);
    
    // 6. 记录指标
    await this.metrics.record(task, result, evidence);
    
    // 7. 沉淀知识
    await this.knowledge.harvest(task, result);
    
    return { ...result, evidence };
  }
}
```

### Step 4: 集成到工作流

```typescript
// scripts/ai-task.ts
import { AIHarness } from '../src/harness';
import { loadTask } from '../src/task-loader';

async function main() {
  const harness = new AIHarness(loadConfig());
  
  const taskId = process.argv[2];
  const task = await loadTask(taskId);
  
  console.log(`Executing task: ${task.name}`);
  
  try {
    const result = await harness.executeTask(task);
    console.log('Task completed successfully!');
    console.log('Evidence:', result.evidence);
  } catch (error) {
    console.error('Task failed:', error);
    process.exit(1);
  }
}

main();
```

---

## 💡 关键洞察

### 1. Harness Engineering 的本质

> **不是让 AI 更聪明,而是让 AI 开发更可控。**

- Prompt Engineering → 改善单次交互
- Context Engineering → 改善信息获取
- **Harness Engineering → 改善工程闭环**

### 2. 六个 Harness 层的关系

```
Context ──→ 给正确的输入
   ↓
Execution ──→ 做正确的执行
   ↓
Evidence ──→ 证明确实做了
   ↓
Evaluation ──→ 量做得好不好
   ↓
Governance ──→ 确保不越界
   ↓
Knowledge ──→ 让下次更好
```

### 3. 适用场景

**适合引入 Harness Engineering**:
- ✅ 团队规模 > 3人
- ✅ AI 使用频率 > 每周3次
- ✅ 项目生命周期 > 3个月
- ✅ 对代码质量有要求
- ✅ 需要知识传承

**可能过度工程化**:
- ❌ 个人小项目
- ❌ 一次性脚本
- ❌ 快速原型验证
- ❌ 探索性实验

---

## 🔗 延伸阅读

- [Spec-First 核心思想](/ai-agent/spec-first/overview) - 了解 Spec-First 的完整理念
- [最佳实践](/ai-agent/harness-engineering/best-practices) - 通用 AI 工程实践
- [Qoder Agent 优化实践](/ai-agent/qoder/optimization) - Qoder 如何应用这些思想

---

## 💬 总结

Harness Engineering 是 AI Agent 开发的**操作系统**,它提供:

1. **结构化** - 清晰的层次和职责
2. **可追溯** - 每个决策都有依据
3. **可度量** - 用数据驱动改进
4. **可复用** - 知识自动沉淀
5. **可控** - 边界和安全有保障

记住:**Harness Engineering 不是银弹,而是一种权衡**。它通过前期的工程投入,换取后期的可维护性和团队协作效率。

**下一步**: 学习 [Qoder Agent 优化实践](/ai-agent/qoder/optimization),看看工业级 AI IDE 如何应用这些思想。

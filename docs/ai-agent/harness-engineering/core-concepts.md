# Harness Engineering 核心思想

::: tip 什么是 Harness Engineering?
Harness Engineering 是 AI Agent 开发的第三层工程化思维，超越 Prompt Engineering 和 Context Engineering，专注于构建可追溯、可复用、可验证的工程闭环系统。
:::

## 为什么需要 Harness Engineering?

### AI 开发的三层演进

```
┌─────────────────────────────────────────┐
│         Prompt Engineering              │  ← 2022-2023
│  "如何让单次回答质量更高?"               │
│  • Few-shot learning                    │
│  • Chain of Thought                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Context Engineering             │  ← 2023-2024
│  "如何给 AI 正确的上下文?"               │
│  • RAG (检索增强生成)                    │
│  • MCP servers                          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│        Harness Engineering              │  ← 2024-2026
│  "如何构建工程化闭环?"                   │
│  • 任务拆解与追踪                        │
│  • 完成证据收集                          │
│  • 知识沉淀与复用                        │
└─────────────────────────────────────────┘
```

### 现实痛点

**没有 Harness Engineering 时**：

```
开发者: "帮我实现一个用户登录功能"
AI:     "好的，这是代码..." (给出代码)
开发者: (复制代码，运行，报错)
开发者: "报错了: xxx"
AI:     "哦，需要修改这里..." (反复迭代)
开发者: (最终跑通了，但...)
         - 不知道为什么要这样设计
         - 下次遇到类似问题又要从头问
         - 团队其他人也不知道这个经验
```

**有了 Harness Engineering**：

```
开发者: /spec:brainstorm "用户登录功能"
系统:   → 记录需求背景、验收标准

开发者: /spec:plan
系统:   → 记录技术方案、文件清单、风险评估

开发者: /spec:work
系统:   → 实现代码 + 记录实现证据（读了哪些文件、测试结果）

开发者: /spec:code-review
系统:   → 结构化评审结果 + 沉淀为可复用知识

下次团队成员要做类似功能:
→ 自动检索到之前的解决方案
→ 直接复用，少走弯路
```

---

## Harness Engineering 六层模型

### 1. Context Harness - 上下文管理

**问题**：LLM 上下文窗口有限，给少了信息不足，给多了噪声大且成本高。

**核心思想**：**精确控制读取范围**

**实践方法**：

```markdown
# .claude/agents/frontend-dev.md
You are a frontend developer for this project.

## Project Context
- Framework: React 18 + TypeScript
- State Management: Zustand
- Styling: Tailwind CSS

## Reading Strategy
When implementing features:
1. Read `docs/architecture.md` for system overview
2. Read similar existing features in `src/features/`
3. NEVER read entire node_modules or dist/
```

**关键原则**：
- 基于任务类型确定读取边界（bug-fix 读 10 个文件，feature-add 读 20 个）
- 先读高层摘要，再按需深入
- 从 AGENTS.md 读取项目级约定

**进阶实践**（来自 dev-agent-harness）：

| 阶段 | 必读 | 精读 | Token 预算 |
|------|------|------|-----------|
| Designing | task.md, standards/ | 最多 5 个相关文件 | ~15K |
| Task Planning | task.md, design.md | - | ~8K |
| Implementing | task.md, design.md, task-plan.md | plan 中列出的文件 | ~30K |
| Testing | task.md, task-plan.md, changes.md | 变更文件 + 测试文件 | ~20K |
| Reviewing | design.md, changes.md, test-report.md | 所有变更文件 diff | ~25K |

---

### 2. Execution Harness - 执行控制

**问题**：AI 执行过程不透明，不知道进展，无法中断/恢复。

**核心思想**：**结构化任务拆解和分批执行**

**任务拆解示例**：

```yaml
# docs/tasks/user-auth.yaml
task:
  goal: "实现用户认证功能"
  
  waves:
    - wave: 1
      name: "基础结构"
      tasks:
        - id: 1.1
          description: "创建 AuthContext"
          files: [src/context/AuthContext.tsx]
          
        - id: 1.2
          description: "实现 login API client"
          files: [src/api/auth.ts]
      
    - wave: 2
      name: "UI 组件"
      tasks:
        - id: 2.1
          description: "LoginForm 组件"
          files: [src/components/LoginForm.tsx]
          dependencies: [1.1, 1.2]  # 依赖 wave 1
      
    - wave: 3
      name: "测试"
      tasks:
        - id: 3.1
          description: "单元测试"
          dependencies: [2.1]
```

**优势**：
- 清晰的进度跟踪
- 可以中断/恢复
- 失败时有明确的回滚点

**进阶实践**（来自 dev-agent-harness）：
- 状态检查点（checkpoint.json）：记录完整任务进度，支持断点恢复
- Gate 控制：关键阶段必须用户确认才能进入下一步
- 测试/审查失败时自动回退到上一阶段

---

### 3. Evidence Harness - 证据追踪

**问题**：AI 说"完成了"，但怎么证明？代码可能编译不过，测试可能没跑。

**核心思想**：**完成声明必须附带证据**

**证据类型**：

| 证据类型 | 说明 | 示例 |
|---------|------|------|
| Source Reads | 证明了什么被读过 | 读了 `src/api/auth.ts` 第 10-45 行 |
| Git Diff | 证明改了什么 | commit `abc1234`，+156 行 |
| Test Results | 证明测试通过 | 4 passed, 0 failed, 92% coverage |
| Build Output | 证明能编译 | TypeScript 编译成功，0 errors |
| Requirement Mapping | 证明满足需求 | Email validation → Zod schema → test:12 |

**完成报告示例**：

```markdown
## Task Completion Report

**Task**: Implement user login form
**Status**: ✅ Completed

### Evidence Summary

#### Changes Made
- Created `src/components/LoginForm.tsx` (+156 lines)
- Updated `src/routes/index.tsx` (+8 lines)
- Added `src/tests/LoginForm.test.tsx` (+89 lines)

Git commit: `abc1234`

#### Test Results
✓ LoginForm renders correctly (23ms)
✓ LoginForm validates email format (15ms)
✓ LoginForm calls onSubmit with credentials (18ms)

Total: 4 passed, 0 failed
Coverage: 92%

#### Requirement Mapping
| Requirement | Implementation | Verified By |
|------------|----------------|-------------|
| Email validation | Zod schema | LoginForm.test.tsx:12 |
| Error handling | try-catch + toast | LoginForm.test.tsx:45 |
```

**为什么重要**：
- 可追溯：知道每个决策的依据
- 防造假：不能只说"完成了"，要有证据
- 可复盘：出问题时知道哪里出了问题

**进阶实践**（来自 spec-first）：
- **Verification Profile**：声明验证检查的 identity 和命令映射
- **Honest Closeout**：对 unsupported 或仅自然语言声明的结论进行降级，不标记为 verified
- **反 Cherry-pick 规则**：测试报告必须列出全部用例的真实状态（PASS/FAIL/NOT-RUN），存在 NOT-RUN 时结论强制为"未完成"

---

### 4. Evaluation Harness - 评估度量

**问题**：怎么知道 AI 的实现真的变好了？还是只是看起来不一样？

**核心思想**：**用数据说话**

**关键指标**：

| 维度 | 指标 | 说明 |
|------|------|------|
| 质量 | 代码审查评分 | Code review 的平均分 |
| 质量 | 测试覆盖率 | 新增代码的覆盖率 |
| 质量 | Bug 率 | 每个功能的 bug 数量 |
| 效率 | 平均完成时间 | 从开始到完成的时间 |
| 效率 | 迭代次数 | 平均需要几次修改 |
| 效率 | Token 成本 | 每次任务的 API 花费 |
| 知识复用 | 知识库命中率 | 有多少任务复用了已有知识 |

**实践方法**：

```bash
# 每周生成报告
$ npm run harness:report

本周完成 12 个任务
平均代码审查评分: 4.2/5
测试覆盖率: 87%
Token 成本: $45.20
知识库新增: 5 条解决方案
```

**与 Evidence 的区别**：
- Evidence 是"这次任务完成了吗"的证据（微观）
- Evaluation 是"整体质量在变好吗"的度量（宏观）

---

### 5. Governance Harness - 安全管控

**问题**：AI 可能越权操作、访问敏感信息、做出不安全决策。

**核心思想**：**强制执行边界和安全策略**

**关键机制**：

| 机制 | 说明 | 示例 |
|------|------|------|
| 文件访问控制 | 限制可修改的文件 | 不允许修改 `.env`、`package.json` |
| 敏感操作审批 | 需要人工确认 | 删除数据库表需要审批 |
| 批量操作限制 | 防止大规模破坏 | 单次最多修改 10 个文件 |
| 降级模式 | 服务不可用时的备选 | GPT-4 挂了降级到 GPT-3.5 |
| 审计日志 | 记录所有决策 | 谁、什么时候、做了什么、为什么 |

**配置示例**：

```json
// .harness/governance.json
{
  "rules": [
    {
      "pattern": ".env*",
      "action": "deny",
      "reason": "Environment files require manual review"
    },
    {
      "pattern": "src/config/*",
      "action": "require-approval",
      "approvers": ["tech-lead"]
    },
    {
      "maxFilesPerBatch": 10,
      "action": "limit"
    }
  ]
}
```

**进阶实践**（来自 spec-first）：
- **Source/Runtime 边界**：永远不要手改 generated runtime，修改 source 后重新 init
- **Script/LLM 边界**：Scripts prepare facts（确定性工作），LLM decides（语义判断）
- **Provider/Source Truth 边界**：Provider evidence 只是候选，源码/测试/日志才是确认依据
- **Fresh-Source Eval**：Agent/skill 变更不能依赖当前会话已缓存的定义，必须用 fresh-source eval

---

### 6. Knowledge Harness - 知识沉淀

**问题**：解决的问题没有沉淀，下次还要从头开始。

**核心思想**：**让每次解决问题都成为团队的资产**

**知识沉淀流程**：

```
任务完成 → 提取解决方案模式 → 记录踩坑经验 → 存储到知识库
                                              ↓
新任务 → 检索相关知识 → 提供给 AI 参考 → 减少重复探索
```

**知识条目示例**：

```markdown
# docs/solutions/authentication/jwt-stateless-auth.md

## Problem
实现无状态 JWT 认证，不使用 session 存储。

## Solution Pattern
1. 登录时签发 JWT，包含必要的 claims
2. JWT 存储在 httpOnly cookie（不是 localStorage）
3. 每个请求验证 JWT 签名
4. 使用 refresh tokens 进行轮换

## Pitfalls to Avoid
❌ 不要把 JWT 存在 localStorage（XSS 风险）
❌ 不要使用长期有效的 access tokens
✅ 要实现 token 轮换
✅ 要使用短期 access tokens + refresh tokens

## Evidence
- 实现于 PR #1234
- 测试: `src/auth/__tests__/jwt.service.test.ts`
- 安全审计通过: 2026-06-17
```

**自动检索**：

```
新任务: "实现 OAuth 登录"
→ 自动检索相关知识
→ 返回:
   1. JWT stateless auth pattern (相关度 85%)
   2. XSS prevention strategies (相关度 72%)
   3. Cookie security best practices (相关度 68%)
→ 提供给 AI 作为参考
```

**进阶实践**（来自两个项目）：

| 实践 | dev-agent-harness | spec-first |
|------|------------------|------------|
| **知识格式** | frontmatter 元数据 | YAML frontmatter |
| **失效条件** | 90 天未用归档 | `invalidation_condition` 字段 |
| **回源检查** | source_refs 指向文件变更时触发 | source_refs 回源验证 |
| **淘汰规则** | 过期/低置信度/重复合并 | stale detection + refresh |
| **写入入口** | 只能通过特定 skill 写入 | verified learning 才能进入 |
| **晋升机制** | use_count >= 5 且 confidence >= 0.8 | candidate → review → promote |

---

## 六层模型的关系

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

**本质**：不是让 AI 更聪明，而是让 AI 开发更可控。

---

## 适用场景

**适合引入 Harness Engineering**：
- ✅ 团队规模 > 3人
- ✅ AI 使用频率 > 每周3次
- ✅ 项目生命周期 > 3个月
- ✅ 对代码质量有要求
- ✅ 需要知识传承

**可能过度工程化**：
- ❌ 个人小项目
- ❌ 一次性脚本
- ❌ 快速原型验证
- ❌ 探索性实验

---

## 两个实践项目对比

| 维度 | dev-agent-harness | spec-first |
|------|------------------|------------|
| **定位** | 轻量级 AI 工作流工具箱 | 工程化 AI 编程治理框架 |
| **复杂度** | 轻量，5 个 skill | 重量，37 个 skill |
| **依赖** | 零依赖，纯文件 | Node.js CLI，npm 包 |
| **宿主支持** | 通用（任何 AI 工具） | 双宿主（Claude/Codex） |
| **知识淘汰** | 三条件同时满足才归档：<br>1. 创建 > 90 天<br>2. use_count = 0<br>3. 无 source_refs<br><br>另有 confidence < 0.3 → 归档 | 失效条件 + 回源检查 |
| **验证体系** | 阶段产出文件 | verification profile + honest closeout |
| **适用场景** | 个人/小团队快速上手 | 大团队/企业级治理 |

**共同点**：
- 都强调确定性/判断分离
- 都有反合理化机制
- 都有知识沉淀闭环
- 都用 Summary-first 交接协议

---

## 延伸阅读

- [最佳实践](/ai-agent/harness-engineering/best-practices) - 通用 AI 工程实践
- [Spec-First 核心思想](/ai-agent/spec-first/overview) - Spec-First 如何实践这些思想

---

## 总结

Harness Engineering 是 AI Agent 开发的**操作系统**，它提供：

1. **结构化** - 清晰的层次和职责
2. **可追溯** - 每个决策都有依据
3. **可度量** - 用数据驱动改进
4. **可复用** - 知识自动沉淀
5. **可控** - 边界和安全有保障

**Harness Engineering 不是银弹，而是一种权衡**。它通过前期的工程投入，换取后期的可维护性和团队协作效率。

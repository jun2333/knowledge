# Spec-First 核心思想

::: tip 什么是 Spec-First?
Spec-First 是面向 AI Coding Agent（Claude Code/Codex）的工作流系统，核心理念是 **"Scripts prepare facts. LLM decides."**（脚本准备事实，LLM 做判断）。它将 AI coding 的关键中间态写回仓库，把一次性对话升级为工程化工作流。
:::

## 核心定位

### Spec-First 是什么?

**产品形态**: Node.js CLI + workflow asset package

**核心价值**: 
- 把需求、计划、任务、实现证据、review 结果和可复用经验都成为**项目资产**
- CLI 负责安装、生成和校验
- LLM 与人负责语义判断、工程取舍和最终质量

**不是什么**:
- ❌ 不是 prompt 模板库
- ❌ 不替代 Claude Code / Codex
- ❌ 不接管项目构建、测试或 CI
-  不让脚本替代工程判断
- ❌ 不依赖外部 SaaS（全部 repo-local）

---

## 核心设计哲学

### 1. AI Coding Harness 六层模型

Spec-First 将 AI 工程化分解为六个 Harness 层：

| Harness 层 | 关注点 | Spec-First 实践 |
|-----------|--------|----------------|
| **Context Harness** | 给 AI 正确上下文，不给无限上下文 | bounded direct reads、project guidance、summary-first handoff |
| **Execution Harness** | 把执行变成可跟踪流程 | spec-plan、task pack、spec-work |
| **Evidence Harness** | 结论必须能回到证据 | source refs、git diff、测试日志、review findings |
| **Evaluation Harness** | 记录有没有真的变好 | verification profile、honest closeout |
| **Governance Harness** | 权限、边界、降级和安全 | source/runtime gate、dispatch boundary、provider degraded mode |
| **Knowledge Harness** | 把经验沉淀给下一轮 | docs/solutions/、compound、compound-refresh |

### 2. 三层工程模型

```
┌─────────────────────────┐
│   Prompt Engineering    │  ← 改善单次回答
├─────────────────────────┤
│  Context Engineering    │  ← RAG/MCP servers
├─────────────────────────┤
│  Harness Engineering    │  ← Spec-First 所在层
│  (治理 workflow、       │     治理 artifact 和
│   artifact 和 review)   │     review loop
─────────────────────────┘
```

**关键洞察**: 
- Prompt Engineering 解决的是**单次交互质量**
- Context Engineering 解决的是**信息检索**
- **Harness Engineering** 解决的是**工程闭环** - 这才是企业级 AI 开发的核心

### 3. 关键边界原则

#### Source/Runtime 边界
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

**原则**: 永远不要手改 generated runtime，修改 source 后重新 init

#### Script/LLM 边界
```
Scripts 负责（确定性动作）:
- 文件发现、路径解析、git 状态读取
- schema 校验、hash 计算、dependency/tool readiness 检查
- runtime asset 同步与 source/runtime drift 检测

LLM 负责（语义判断）:
- 需求 framing
- 方案权衡
- 实现决策
- Review 判断
```

**原则**: Scripts prepare facts. LLM decides.

#### Provider/Source Truth 边界
```
Provider evidence (候选证据):
- Claude/Codex 返回的结果
- 需要验证

Source truth (确认依据):
- 源码读取
- 测试结果
- 运行日志
- Git diff
```

**原则**: Provider evidence 只是候选，源码/测试/日志才是确认依据

---

## 核心工作流

### 主链路（非强制线性状态机）

```
Codebase → Spec → Plan → Tasks → Code → Review → Knowledge
```

**详细流程**:

```
────────────────────────────────────────────────────────────┐
│ Codebase                                                    │
│ repo files / tests / package scripts                       │
│ AGENTS.md / CLAUDE.md / guidance                           │
└────────────────────────────────────────────────────────────┘
                          │
                          │ mcp-setup / provider evidence
                          │ project guidance
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Provider Evidence                                           │
│ optional provider pack                                      │
│ bounded direct reads                                        │
│ explicit limitations                                        │
└────────────────────────────────────────────────────────────┘
                          │
                          │ ideate / brainstorm / doc-review
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Spec                                                        │
│ problem frame / actors / flows                             │
│ requirements / acceptance examples                         │
└────────────────────────────────────────────────────────────┘
                          │
                          │ plan / doc-review
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Plan                                                        │
│ approach / boundaries / files                              │
│ risks / test scenarios / sequencing                        │
└────────────────────────────────────────────────────────────┘
                          │
                          │ write-tasks (when plan is large)
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Tasks                                                       │
│ task pack / dependencies / waves                           │
│ file ownership / stop_if / test_focus                      │
└────────────────────────────────────────────────────────────┘
                          │
                          │ work / debug / optimize / polish
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Code                                                        │
│ implementation diff / tests                                 │
│ build output / browser or CLI evidence                     │
└────────────────────────────────────────────────────────────┘
                          │
                          │ code-review / app-consistency-audit
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Review                                                      │
│ persona findings / safe fixes                              │
│ residual risks / release readiness                         │
└────────────────────────────────────────────────────────────┘
                          │
                          │ compound / compound-refresh
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Knowledge                                                   │
│ docs/solutions/                                             │
│ refreshed learnings                                         │
│ release notes / future context                             │
└────────────────────────────────────────────────────────────┘
```

### 入口治理（using-spec-first meta skill）

根据当前缺口智能路由：

| 当前状态 | 使用 Workflow | 目的 |
|---------|--------------|------|
| 环境/runtime/MCP 未就绪 | `spec-mcp-setup` | 搭建 harness runtime |
| 需求不清楚 | `spec-brainstorm` | 明确需求 brief |
| 存量系统增量需要 PRD | `spec-prd` | 生成 PRD-grade WHAT |
| 方向选择或想法生成 | `spec-ideate` | ranked ideation |
| HOW 不清楚 | `spec-plan` | 实现方案规划 |
| 计划很大，需要交接 | `spec-write-tasks` | 任务拆解 |
| 可执行工作 | `spec-work` / `spec-debug` | 执行/调试 |
| 需要质量评审 | `spec-code-review` | 结构化评审 |
| 已解决问题需沉淀 | `spec-compound` | 知识沉淀 |

---

## 产物目录结构

### Repo-Relative Artifact Roots

```
docs/
├── ideation/        # ranked idea candidates
├── brainstorms/     # requirements briefs
├── plans/           # implementation plans
├── tasks/           # derived task packs
└── solutions/       # reusable learnings ⭐

.spec-first/
── config/          # configuration (不提交)
├── workspace/       # workspace facts (不提交)
├── sessions/        # session history (不提交)
├── providers/       # provider cache (不提交)
└── app-audit/
    └── runs/        # audit reports
```

### Git 策略（三类记忆）

| 类型 | 路径 | 是否提交 | 生命周期 | 作用 |
|-----|------|---------|---------|------|
| **Durable 工程文档** | `docs/ideation/`<br>`docs/brainstorms/`<br>`docs/plans/`<br>`docs/tasks/`<br>`docs/solutions/` | ✅ 通常提交 | 跨会话<br>跨成员<br>跨版本 | 团队知识传承 |
| **Control-plane facts** | `.spec-first/config/`<br>`.spec-first/workspace/`<br>`.spec-first/sessions/` | ❌ 不提交<br>本机重建 | 当前机器<br>当前 ready 状态 | 本地运行时状态 |
| **Generated runtime** | `.claude/`<br>`.codex/`<br>`.agents/skills/` | ❌ 不提交<br>init 自动 ignore | 当前 spec-first<br>版本下的副本 | CLI 生成的入口 |

---

## 知识沉淀机制

### Compound Workflow 协同

```
新 PR 进入 code-review
  │
  ▼
spec-learnings-researcher
  │  检索 docs/solutions/ 里的
  │  根因、模式、过往坑
  ▼
把命中知识作为 reviewer 的证据输入
  │
  ▼
PR review 自动复用过往团队经验
```

### 典型场景

1. **刚解决一个非平凡 bug**
   ```bash
   /spec:compound
   # → docs/solutions/debugging/bug-X-2026-06-17.md
   ```

2. **找到一个值得复用的架构模式**
   ```bash
   /spec:compound
   # → docs/solutions/architecture/pattern-X.md
   ```

3. **旧 solution 因代码变化过期**
   ```bash
   /spec:compound-refresh
   # → 更新、合并、替换或删除条目
   ```

4. **接手别人或自己的旧任务**
   ```bash
   /spec:sessions
   # → 检索历史会话
   ```

### 核心价值

- ✅ 团队每次解决一个新问题，下次就少走一段弯路
- ✅ Learnings researcher 自动检索相关历史经验
- ✅ Compound-refresh 按证据淘汰编造内容，保证知识库质量

### 知识条目规范

每个 solution 必须包含：

```markdown
---
title: "JWT Stateless Auth Pattern"
domain: authentication
problem_type: stateless-session
technologies: [jwt, react, node]
invalidation_condition: "NextAuth 升级到 v6"
source_refs:
  - src/auth/jwt.service.ts
  - src/middleware/auth.middleware.ts
confidence: 0.9
use_count: 12
created: 2026-06-17
last_used: 2026-07-10
---

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

---

## 关键工程特性

### 1. Artifact Summary

每个产物携带：
- **来源**: 哪个 workflow 生成的
- **Freshness**: 创建时间、最后更新时间
- **限制**: 已知的问题和边界
- **验证证据**: 如何证明它是正确的

**示例**:
```markdown
---
generated_by: spec-plan
created_at: 2026-06-17T12:00:00Z
updated_at: 2026-06-17T12:30:00Z
verified_by:
  - source_reads: [src/agent.ts, src/tools.ts]
  - tests_passed: [unit-tests, integration-tests]
  - review_approved: true
limitations:
  - 仅适用于单 Agent 场景
  - 未考虑多租户隔离
---
```

### 2. Verification Profile

**防止 fake completion**: 完成声明应回到 source reads、diff、测试等证据

```typescript
// ❌ Bad: 只说"完成了"
console.log('Task completed');

// ✅ Good: 提供验证证据
{
  "status": "completed",
  "evidence": {
    "source_reads": ["src/handler.ts:45-89"],
    "git_diff": "abc123...def456",
    "tests_passed": ["test-handler.test.ts"],
    "build_success": true,
    "review_findings": []
  }
}
```

### 3. Honest Closeout

对 unsupported 或仅自然语言声明的结论进行降级，不标记为 verified。

**反 Cherry-pick 规则**：
- 测试报告必须列出全部用例的真实状态（PASS/FAIL/NOT-RUN）
- 存在 NOT-RUN 时结论强制为"未完成"（不是"部分通过"）
- 存在 FAIL 时结论为"未通过"

### 4. Review Finding

严重级别、证据、影响面、修复建议和剩余风险的结构化输出：

```markdown
## Review Findings

### 🔴 Critical
- **Issue**: 缺少错误处理
- **Evidence**: `src/handler.ts:67` 未捕获 async 异常
- **Impact**: 可能导致 unhandled rejection
- **Fix**: 添加 try-catch 包裹
- **Risk if not fixed**: 进程崩溃

### 🟡 Warning  
- **Issue**: Token 成本未监控
- **Evidence**: 无 metrics 记录
- **Impact**: 无法追踪 API 调用成本
- **Fix**: 添加 metrics.collect('llm_cost')
```

---

## 适用场景

### ✅ 适合引入 Spec-First

如果你的团队遇到以下任一问题：

- 同一类需求反复解释，跨会话上下文经常丢失
- PR review 只能看到改了什么，看不到为什么这样改
- 大任务需要多人或多个 agent 分工，但缺少清晰交接边界
- 解决过的工程问题没有沉淀，下次仍从头排查
- 希望 Claude Code 与 Codex 共享一套项目级 workflow 约定

### ❌ 不适合的场景

- 只想一次性问答，不需要在项目里留下产物
- 不能安装 Node.js 20+ 或不能写项目文件
- 不使用 Claude Code 或 Codex 这类宿主
- 希望工具全自动替代产品、架构、测试和 review 判断

---

## 与 dev-agent-harness 的对比

### 架构层面

| 维度 | dev-agent-harness | spec-first |
|------|------------------|------------|
| **定位** | 轻量级 AI 工作流工具箱 | 工程化 AI 编程治理框架 |
| **复杂度** | 轻量，5 个 skill | 重量，37 个 skill + 51 个 agent |
| **依赖** | 零依赖，纯文件 | Node.js CLI，npm 包 |
| **宿主支持** | 通用（任何 AI 工具） | 双宿主（Claude/Codex） |
| **知识淘汰** | 90 天未用归档 | 失效条件 + 回源检查 |
| **验证体系** | 阶段产出文件 | verification profile + honest closeout |
| **适用场景** | 个人/小团队快速上手 | 大团队/企业级治理 |

### 质量控制能力差异（基于 taskflow 实战分析）

通过对 [taskflow](https://github.com/tsuna2751/taskflow) 项目的实际使用分析，发现 dev-agent-harness 在以下方面存在不足：

#### 1. 缺少 Verification Profile 系统

**问题**: dev-agent-harness 无法声明"必须运行哪些命令才能算完成"

```yaml
# ❌ dev-agent-harness: 只能依赖 skill 自觉执行
testing:
  skill: knowledge/skills/testing/skill.md
  output: test-report.md
  # 没有强制要求运行具体测试命令

# ✅ spec-first: 明确验证配置
verification_profile:
  required_commands:
    - npm run test:unit
    - npm run build
    - npm run lint
  stop_if:
    - exit_code != 0
    - coverage < 80%
```

**影响**: AI 可能跳过关键验证步骤，声称"测试通过"但实际未运行

#### 2. 缺少 Honest Closeout 机制

**问题**: 无法防止 AI "假装完成"或选择性报告结果

```markdown
# ❌ dev-agent-harness: AI 可以这样写 test-report.md
所有测试通过！✅

# ✅ spec-first: 必须列出全部用例状态
## Test Results
| Test Case | Status | Evidence |
|-----------|--------|----------|
| login-success | PASS | test.log:45 |
| login-invalid-password | FAIL | test.log:67 |
| login-network-error | NOT-RUN | skipped due to timeout |

Conclusion: FAILED (1 failed, 1 not-run)
```

**反 Cherry-pick 规则**:
- 存在 NOT-RUN → 结论强制为"未完成"
- 存在 FAIL → 结论为"未通过"
- 不允许只汇报通过的用例

#### 3. 缺少 Audit Trail（审计轨迹）

**问题**: 决策过程没有记录时间戳、依据和替代方案

```markdown
# ❌ dev-agent-harness: design.md 只有最终方案
## Architecture Decision
使用 Redux 管理全局状态

# ✅ spec-first: 完整审计轨迹
## Decision Log
- **Timestamp**: 2026-07-15T10:30:00Z
- **Question**: 状态管理方案选择
- **Options Considered**: 
  - Redux (推荐): 生态成熟，调试工具完善
  - Zustand: 更轻量，但生态较小
  - Context API: 简单场景够用，复杂场景性能差
- **Chosen**: Redux
- **Rationale**: 项目规模预计超过 50 个组件，需要时间旅行调试
- **Deferred Reason**: Zustand 留作后续性能优化备选
- **Source Tag**: confirmed (基于 src/components/ 目录扫描，共 47 个组件)
```

**影响**: 无法追溯为什么做出某个决策，新人接手困难

#### 4. 缺少 Source/Runtime Gate 分离

**问题**: AI 可能修改生成的运行时文件而非源代码

```bash
# ❌ dev-agent-harness: 没有明确的 source/runtime 边界
# AI 可能直接修改 .claude/skills/generated.ts

# ✅ spec-first: 严格的 source/runtime 分离
Source truth (手动维护):
- skills/           # workflow 定义
- agents/           # agent 配置
- templates/        # 产物模板

Generated runtime (CLI 自动生成):
- .claude/          # Claude Code 入口
- .codex/           # Codex 入口
- .agents/skills/   # 运行时副本

原则: 永远不要手改 generated runtime，修改 source 后重新 init
```

**影响**: 直接修改运行时文件会导致下次 init 时被覆盖，造成工作丢失

#### 5. 缺少 Evaluation Harness（评估指标）

**问题**: 无法追踪项目质量趋势

```typescript
// ❌ dev-agent-harness: 没有指标收集
// 无法回答：代码质量是在变好还是变坏？

// ✅ spec-first: 持续追踪指标
{
  "metrics": {
    "test_coverage": { current: 82%, trend: "+5%" },
    "llm_cost_per_task": { current: 0.15, unit: "USD" },
    "review_findings_severity": { critical: 0, warning: 2 },
    "knowledge_reuse_count": { solutions_reused: 12 }
  }
}
```

**影响**: 无法量化 AI 引入后的真实收益

#### 6. Skill Contracts 较弱

**问题**: Skill 没有明确的 failure modes、fallbacks 和 degraded modes

```yaml
# ❌ dev-agent-harness: skill 只有基本描述
skills/testing/skill.md:
  description: 运行测试并生成报告

# ✅ spec-first: 完整的 skill contract
skills/testing/SKILL.md:
  name: testing
  description: 运行测试并生成结构化报告
  failure_modes:
    - no_test_framework: 降级为 smoke test
    - test_timeout: 记录 NOT-RUN 并继续
  fallbacks:
    - unit_tests_failed: 尝试 integration tests
    - browser_unavailable: 使用 headless mode
  degraded_mode:
    when: "coverage < 50%"
    action: "标记为 partial，建议补充测试"
  artifact_boundary:
    input: [src/**/*.ts, __tests__/**/*.test.ts]
    output: test-report.md
    evidence_paths: [test-results/, coverage/]
```

**影响**: Skill 失败时没有降级策略，整个 workflow 中断

#### 7. 缺少 Artifact Boundary Management

**问题**: 无法追溯证据链

```markdown
# ❌ dev-agent-harness: 产出物之间没有明确的引用关系
design.md → changes.md → test-report.md
# 不知道 test-report.md 验证的是哪些改动

# ✅ spec-first: 完整的证据链
artifact-summary.v1:
  changed_files:
    - src/auth/jwt.service.ts (diff: abc123)
    - src/middleware/auth.middleware.ts (diff: def456)
  verification_commands:
    - npm run test:auth (passed)
    - npm run build (passed)
  review_tier: full
  residual_status: none
  evidence_paths:
    - test-results/auth.test.log
    - coverage/auth-coverage.html
  limitations:
    - 未测试并发登录场景
  recommended_next_action: "部署到 staging 环境进行集成测试"
```

**影响**: Reviewer 无法快速定位需要审查的关键文件和验证证据

#### 8. Context Loading 较简单

**问题**: 缺少 summary-first handoff 和 cache-friendly layout

```markdown
# ❌ dev-agent-harness: 直接读取完整文件
# 可能导致 token 浪费或上下文溢出

# ✅ spec-first: 分层加载策略
Phase 1: 读取 artifact-summary.v1 (紧凑摘要)
Phase 2: 根据 full_read_triggers 决定是否读取完整文件
Phase 3: 维护 context ledger (记录已读路径、原因、阶段)

cache_friendly_layout:
  stable_prefix: 
    - workflow invariants
    - task-pack validation rules
  dynamic_suffix:
    - current plan/task excerpts
    - changed files summary
    - tool/test results
```

**影响**: 大型项目中容易超出 token 限制，或者遗漏关键上下文

### 实战案例：taskflow 项目暴露的问题

在 [taskflow](https://github.com/tsuna2751/taskflow) 项目中（一个使用 dev-agent-harness 的真实项目），观察到以下现象：

1. **Testing 阶段依赖 AI 自觉**: `testing` skill 没有强制要求运行具体的测试命令，AI 可能只是查看测试文件就声称"测试通过"

2. **Review 阶段缺乏结构化输出**: `reviewing` skill 生成的 `review-report.md` 格式自由，不同 AI 的输出质量差异很大

3. **经验草稿质量不稳定**: `reflecting` skill 生成的 `lessons-draft.md` 经常缺少失效条件和回源路径，导致后续难以验证经验是否仍然有效

4. **无法追踪决策过程**: `design.md` 中只有最终方案，没有记录为什么选择这个方案、考虑过哪些替代方案

5. **State checkpoint 过于简单**: 只保存进度，不保存决策依据和验证证据，resume 时 AI 需要重新理解上下文

### 总结

**dev-agent-harness 的优势**:
- ✅ 轻量级，易于上手
- ✅ 零依赖，不需要安装额外工具
- ✅ 通用性强，适用于任何 AI 工具
- ✅ 提供了基础的 workflow 框架和知识沉淀机制

**dev-agent-harness 的不足**（相比 spec-first）:
- ❌ 缺少严格的质量控制机制（verification profile、honest closeout）
- ❌ 缺少审计和追溯能力（audit trail、artifact boundary）
- ❌ 缺少度量体系（evaluation harness）
- ❌ Skill 契约不够严谨（无 failure modes/fallbacks）
- ❌ Context 管理较简单（无 summary-first、cache-friendly layout）

**适用建议**:
- **个人/小团队快速原型**: dev-agent-harness 足够，学习成本低
- **企业级/多人协作项目**: 建议使用 spec-first，虽然复杂但能提供更好的质量保障和知识传承

**共同点**：
- 都强调确定性/判断分离
- 都有反合理化机制
- 都有知识沉淀闭环
- 都用 Summary-first 交接协议

---

## 思想提炼：对前端开发的启示

虽然 Spec-First 是为 Claude Code/Codex 设计的，但其核心思想对所有 AI Agent 开发都有借鉴意义：

### 1. **工程闭环思维**

传统 AI 开发：
```
Prompt → Response → (结束，上下文丢失)
```

Harness Engineering：
```
Spec → Plan → Tasks → Code → Evidence → Review → Knowledge
      ↑                                              ↓
      └──────────── 知识沉淀，下次复用 ────────────────┘
```

**启示**: 把 AI 交互的中间态持久化，形成工程闭环

### 2. **证据驱动而非直觉驱动**

- 所有结论都要有证据支撑
- 代码改动要关联到需求和测试
- Review 要基于事实，不只是主观判断

**启示**: 建立 Verification Profile，防止"假完成"

### 3. **知识沉淀自动化**

- 解决问题的过程自动记录
- 经验自动检索和复用
- 过时知识自动淘汰

**启示**: 让团队每次解决问题都成为下次的基础

### 4. **清晰的边界治理**

- Source vs Runtime: 知道什么是手写的，什么是生成的
- Script vs LLM: 知道什么由脚本做，什么由 LLM 判断
- Provider vs Source Truth: 知道什么是候选证据，什么是确认依据

**启示**: 边界清晰才能可控演进

---

## 延伸阅读

- [Harness Engineering 核心思想](/ai-agent/harness-engineering/core-concepts) - 深入理解六层模型
- [Spec-First 工作流程](/ai-agent/spec-first/workflow) - 完整的 workflow 链路
- [最佳实践](/ai-agent/harness-engineering/best-practices) - 通用 AI 工程实践

---

## 总结

Spec-First 的本质不是某个具体工具，而是一种**工程化思维**：

> **把 AI coding 从临时对话升级为工程化工作流，让每一次交互都成为可追溯、可复用、可验证的项目资产。**

这种思维对所有 AI Agent 开发都有借鉴意义，无论你是否使用 Spec-First 这个具体工具。

**下一步**: 学习 [Spec-First 工作流程](/ai-agent/spec-first/workflow)，了解完整的 workflow 链路。

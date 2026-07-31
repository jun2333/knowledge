# Spec-First 指南

::: tip 什么是 Spec-First?
Spec-First 是面向 AI Coding Agent（Claude Code/Codex）的工作流系统，核心理念是 **"Scripts prepare facts. LLM decides."**（脚本准备事实，LLM 做判断）。它将 AI coding 的关键中间态写回仓库，把一次性对话升级为工程化工作流。
:::

## 核心定位

**产品形态**: Node.js CLI + workflow asset package

**核心价值**: 
- 把需求、计划、任务、实现证据、review 结果和可复用经验都成为**项目资产**
- CLI 负责安装、生成和校验
- LLM 与人负责语义判断、工程取舍和最终质量

**不是什么**:
- ❌ 不是 prompt 模板库
- ❌ 不替代 Claude Code / Codex
- ❌ 不接管项目构建、测试或 CI
- ❌ 不让脚本替代工程判断
- ❌ 不依赖外部 SaaS（全部 repo-local）

---

## 设计哲学

### 三层工程模型

```
┌─────────────────────────┐
│   Prompt Engineering    │  ← 改善单次回答
├─────────────────────────┤
│  Context Engineering    │  ← RAG/MCP servers
├─────────────────────────┤
│  Harness Engineering    │  ← Spec-First 所在层
│  (治理 workflow、       │     治理 artifact 和
│   artifact 和 review)   │     review loop
└─────────────────────────┘
```

**关键洞察**: Prompt Engineering 解决单次交互质量，Context Engineering 解决信息检索，**Harness Engineering** 解决工程闭环——这才是企业级 AI 开发的核心。

> 六层模型详解见 [Harness Engineering 核心思想](/ai-agent/harness-engineering/core-concepts)

### 关键边界原则

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

## 工作流概览

### 主链路（非强制线性状态机）

```
Codebase → Spec → Plan → Tasks → Code → Review → Knowledge
```

可以根据任务大小和复杂度跳过某些阶段。

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

## 1️⃣ Spec（需求定义）

### 目标
将模糊的业务需求转化为清晰的问题定义和验收标准。

### 何时使用
- 需求不清楚，需要明确范围
- 存量系统增量需要 PRD
- 方向选择或想法生成

### 可用 Workflow

| Workflow | 用途 | 产物 |
|---------|------|------|
| `spec:brainstorm` | 需求头脑风暴 | `docs/brainstorms/` |
| `spec:prd` | 生成 PRD 级需求文档 | PRD 文档 |
| `spec:ideate` | 方向选择和想法生成 | `docs/ideation/` |
| `spec:doc-review` | 文档评审 | findings + gaps |

### 实践示例

**使用 spec:brainstorm**：

```bash
/spec:brainstorm "实现用户登录功能"
```

**产物示例**（`docs/brainstorms/2026-06-17-login.md`）：

```markdown
# User Login Feature

## Problem Statement
用户需要安全、便捷的登录方式，支持邮箱和密码登录。

## User Stories
- 作为用户，我想用邮箱和密码登录，以便访问我的账户
- 作为用户，我想记住登录状态，以便不用每次重新登录
- 作为用户，我想在登录失败时得到清晰的错误提示

## Acceptance Criteria
- [ ] 邮箱格式验证
- [ ] 密码长度 >= 8 位
- [ ] 登录失败显示具体原因（用户不存在/密码错误）
- [ ] 登录成功后跳转到首页
- [ ] 支持"记住我"功能（7 天免登录）

## Out of Scope
- 第三方登录（Google/GitHub）
- 双因素认证
- 密码找回流程

## Risks
- JWT 存储安全性（httpOnly cookie vs localStorage）
- 暴力破解防护
```

### 关键要点

✅ **完整性**: 覆盖用户故事、验收标准、边界  
✅ **准确性**: 明确 in-scope 和 out-of-scope  
✅ **可验证**: 验收标准可测试  
✅ **风险识别**: 提前识别技术风险  

---

## 2️⃣ Plan（方案规划）

### 目标
将需求转化为技术实现方案，明确文件清单、风险评估和测试策略。

### 何时使用
- HOW 不清楚，需要技术方案
- 大任务需要明确实施路径

### 可用 Workflow

| Workflow | 用途 | 产物 |
|---------|------|------|
| `spec:plan` | 实现方案规划 | `docs/plans/` |

### 实践示例

**产物示例**（`docs/plans/2026-06-17-login-implementation.md`）：

```markdown
# Login Implementation Plan

## Approach
使用 JWT + httpOnly cookie 实现无状态认证。

## File Changes
- 新增 `src/context/AuthContext.tsx` - 认证状态管理
- 新增 `src/api/auth.ts` - 登录 API client
- 新增 `src/components/LoginForm.tsx` - 登录表单
- 新增 `src/components/ProtectedRoute.tsx` - 路由保护
- 修改 `src/routes/index.tsx` - 添加登录路由

## Dependencies
- `zod` - 表单验证
- `jose` - JWT 验证

## Risks
- JWT 过期处理需要 refresh token 机制
- httpOnly cookie 需要后端配合设置

## Test Strategy
- 单元测试：LoginForm 组件渲染和验证
- 集成测试：登录流程 E2E
- 安全测试：XSS、CSRF 防护验证

## Success Criteria
- 所有验收标准满足
- 测试覆盖率 > 80%
- 无安全漏洞
```

### 关键要点

✅ **文件清单**: 明确新增和修改的文件  
✅ **依赖识别**: 提前识别外部依赖  
✅ **风险评估**: 识别技术风险和缓解方案  
✅ **测试策略**: 明确测试类型和覆盖范围  

---

## 3️⃣ Tasks（任务拆解）

### 目标
将大计划拆解为可执行的任务包，明确依赖关系和执行顺序。

### 何时使用
- 计划很大，需要分步执行
- 多人/多 Agent 协作需要清晰交接

### 可用 Workflow

| Workflow | 用途 | 产物 |
|---------|------|------|
| `spec:write-tasks` | 任务拆解 | `docs/tasks/` |

### 实践示例

**产物示例**（`docs/tasks/2026-06-17-login-tasks.yaml`）：

```yaml
task_pack:
  id: login-implementation
  goal: "实现用户登录功能"
  
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

### 关键要点

✅ **Wave 分组**: 按依赖关系分批执行  
✅ **依赖明确**: 每个任务明确前置依赖  
✅ **文件归属**: 每个任务明确负责的文件  
✅ **验证标准**: 整体完成标准  

---

## 4️⃣ Code（代码实现）

### 目标
按照任务和计划实现代码，收集完成证据。

### 何时使用
- 可执行工作
- 调试问题

### 可用 Workflow

| Workflow | 用途 | 产物 |
|---------|------|------|
| `spec:work` | 执行任务 | 代码变更 + 验证证据 |
| `spec:debug` | 调试问题 | 根因 + 修复 + 验证证据 |
| `spec:optimize` | 性能优化 | 指标驱动实验 |

### 实践示例

**使用 spec:work**：

```bash
/spec:work
```

**执行过程**：

1. 读取任务包（`docs/tasks/`）
2. 按 wave 顺序执行任务
3. 每个任务完成后记录证据
4. 所有任务完成后生成完成报告

**完成报告示例**（`.spec-first/workflows/spec-work/evidence.json`）：

```json
{
  "task_id": "login-implementation",
  "status": "completed",
  "evidence": {
    "source_reads": [
      {"file": "src/api/auth.ts", "lines": "10-45", "purpose": "Existing login API"},
      {"file": "src/components/SignupForm.tsx", "lines": "1-120", "purpose": "Similar form pattern"}
    ],
    "git_diff": {
      "commit": "abc1234",
      "files_changed": 5,
      "additions": 256,
      "deletions": 12
    },
    "test_results": {
      "passed": 12,
      "failed": 0,
      "skipped": 0,
      "coverage": 92
    },
    "build_output": {
      "success": true,
      "warnings": 2,
      "errors": 0
    },
    "requirement_mapping": [
      {"requirement": "Email validation", "implementation": "Zod schema", "verified_by": "LoginForm.test.tsx:12"},
      {"requirement": "Password masking", "implementation": "input type=password", "verified_by": "Visual inspection"},
      {"requirement": "Error handling", "implementation": "try-catch + toast", "verified_by": "LoginForm.test.tsx:45"}
    ]
  }
}
```

### 关键要点

✅ **证据完整**: source reads、git diff、测试结果、构建输出  
✅ **需求映射**: 每个验收标准都有验证证据  
✅ **反 Cherry-pick**: 测试报告列出全部用例状态  
✅ **Honest Closeout**: 未验证的不标记为 verified  

---

## 5️⃣ Review（质量评审）

### 目标
对实现的代码进行结构化评审，识别问题和风险。

### 何时使用
- 需要质量评审
- PR 合并前检查

### 可用 Workflow

| Workflow | 用途 | 产物 |
|---------|------|------|
| `spec:code-review` | 代码评审 | 结构化 findings |
| `spec:doc-review` | 文档评审 | findings + gaps |

### 实践示例

**评审结果示例**：

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

### 🟢 Suggestion
- **Issue**: 可以提取自定义 hook
- **Evidence**: `useAuth` 逻辑可复用
- **Impact**: 代码重复
- **Fix**: 提取 `useAuth` hook
```

### 关键要点

✅ **结构化输出**: 严重级别、证据、影响面、修复建议  
✅ **证据支撑**: 每个 finding 都有代码位置  
✅ **风险评级**: 区分 Critical/Warning/Suggestion  
✅ **剩余风险**: 明确不修复的风险  

---

## 6️⃣ Knowledge（知识沉淀）

### 目标
将解决问题的经验沉淀为可复用知识，供后续任务参考。

### 何时使用
- 刚解决一个非平凡问题
- 找到一个值得复用的架构模式
- 旧 solution 因代码变化过期

### 可用 Workflow

| Workflow | 用途 | 产物 |
|---------|------|------|
| `spec:compound` | 知识沉淀 | `docs/solutions/` |
| `spec:compound-refresh` | 知识刷新 | 更新/合并/退役 |

### 实践示例

**产物示例**（`docs/solutions/authentication/jwt-stateless-auth.md`）：

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

### 知识淘汰机制

**spec:compound-refresh** 会检测并更新过时的 learning 文档：

| 淘汰规则 | 说明 |
|---------|------|
| 过期淘汰 | 90 天未引用且 use_count=0 → 归档 |
| 低置信度 | confidence < 0.3 → 归档 |
| 回源检查 | source_refs 指向的文件有变更 → 触发失效判断 |
| 重复合并 | 标签高度重合 → 合并 |
| 晋升机制 | use_count >= 5 且 confidence >= 0.8 → 提升为 pattern |

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

### 关键要点

✅ **元数据完整**: title、domain、technologies、confidence 等  
✅ **失效条件**: `invalidation_condition` 明确何时失效  
✅ **回源抓手**: `source_refs` 关联源码文件  
✅ **自动淘汰**: compound-refresh 自动检测过时内容  

---

## 任务分级治理

根据任务大小调整审查和验证强度：

| 任务类型 | 说明 | 验证强度 |
|---------|------|---------|
| **小任务** | 文案修正、注释、单文件局部修复 | 直接执行，窄验证 |
| **中型任务** | skill/agent/CLI 行为调整、文档结构调整 | 检查 source/runtime 边界、测试覆盖 |
| **大型任务** | 新增 skill 或 agent 体系、CLI 重构 | 明确 goals/non-goals、artifact contracts、failure modes |

**80/20 原则**：用最小 durable mechanism 解决高频、高价值、真实研发问题。

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
├── config/          # configuration (不提交)
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

## 关键工程特性

### 1. Artifact Summary

每个产物携带来源、Freshness、限制和验证证据：

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

---

## 完整案例：电商客服 Agent

### Week 1: 需求与规范

**Day 1-2: 需求调研**
```bash
/spec:brainstorm "电商客服 Agent"
# → docs/brainstorms/2026-06-17-ecommerce-support.md
```

**Day 3-4: 方案规划**
```bash
/spec:plan
# → docs/plans/2026-06-17-support-agent.md
```

**Day 5: 任务拆解**
```bash
/spec:write-tasks
# → docs/tasks/2026-06-17-support-tasks.yaml
```

### Week 2: 开发与测试

**Day 1-3: 代码实现**
```bash
/spec:work
# → 代码变更 + evidence.json
```

**Day 4: 代码评审**
```bash
/spec:code-review
# → review-findings.md
```

**Day 5: 知识沉淀**
```bash
/spec:compound
# → docs/solutions/ai-agent/customer-support-pattern.md
```

### Week 3: 部署与迭代

**Day 1: 部署到测试环境**
**Day 2-3: User Acceptance Testing**
**Day 4: 修复问题**
**Day 5: 生产环境发布**

---

## 适用场景

### ✅ 适合引入 Spec-First

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

## 最佳实践

### ✅ Do's

1. **从小处开始** - 先为核心功能定义 spec，逐步扩展
2. **保持 spec 简洁** - 避免过度设计，注重可读性
3. **证据驱动** - 完成声明必须附带证据，测试报告列出全部用例状态
4. **知识沉淀** - 解决问题后立即 compound，定期 compound-refresh 清理过时内容
5. **边界清晰** - Source vs Runtime 分离，Script vs LLM 职责明确

### ❌ Don'ts

1. **不要跳过 spec 阶段** - 即使小任务也要明确范围
2. **不要让 spec 与实际脱节** - 建立自动化验证
3. **不要过度依赖工具** - 保持灵活性，必要时手动调整
4. **不要手改 generated runtime** - 修改 source 后重新 init
5. **不要忽略知识沉淀** - 每次解决问题都是团队资产

---

## 思想提炼：对前端开发的启示

虽然 Spec-First 是为 Claude Code/Codex 设计的，但其核心思想对所有 AI Agent 开发都有借鉴意义：

### 1. 工程闭环思维

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

### 2. 证据驱动而非直觉驱动

- 所有结论都要有证据支撑
- 代码改动要关联到需求和测试
- Review 要基于事实，不只是主观判断

**启示**: 建立 Verification Profile，防止"假完成"

### 3. 知识沉淀自动化

- 解决问题的过程自动记录
- 经验自动检索和复用
- 过时知识自动淘汰

**启示**: 让团队每次解决问题都成为下次的基础

### 4. 清晰的边界治理

- Source vs Runtime: 知道什么是手写的，什么是生成的
- Script vs LLM: 知道什么由脚本做，什么由 LLM 判断
- Provider vs Source Truth: 知道什么是候选证据，什么是确认依据

**启示**: 边界清晰才能可控演进

---

## 延伸阅读

- [Harness Engineering 核心思想](/ai-agent/harness-engineering/core-concepts) - 六层模型详解
- [质量控制对比](/ai-agent/harness-engineering/quality-control) - dev-agent-harness vs spec-first
- [最佳实践](/ai-agent/harness-engineering/best-practices) - 通用 AI 工程实践

---

## 总结

Spec-First 的本质不是某个具体工具，而是一种**工程化思维**：

> **把 AI coding 从临时对话升级为工程化工作流，让每一次交互都成为可追溯、可复用、可验证的项目资产。**

核心保障：
1. **需求清晰** - Spec 阶段明确范围
2. **方案可行** - Plan 阶段识别风险
3. **执行可控** - Tasks 阶段分步执行
4. **证据完整** - Code 阶段收集验证
5. **质量保障** - Review 阶段结构化评审
6. **知识传承** - Knowledge 阶段沉淀经验

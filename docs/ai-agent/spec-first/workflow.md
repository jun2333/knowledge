# Spec-First 工作流程

::: tip 学习目标
本文详细介绍 Spec-First 的完整工作流程，从需求分析到知识沉淀的每个阶段，以及各阶段的产物和验证方式。
:::

## 工作流概览

Spec-First 的核心链路是：

```
Codebase → Spec → Plan → Tasks → Code → Review → Knowledge
```

**这不是强制线性状态机**，可以根据任务大小和复杂度跳过某些阶段。

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

## 2️ Plan（方案规划）

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

**使用 spec:plan**：

```bash
/spec:plan
```

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

## 4️ Code（代码实现）

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

**使用 spec:code-review**：

```bash
/spec:code-review
```

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

## 6️ Knowledge（知识沉淀）

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

**使用 spec:compound**：

```bash
/spec:compound
```

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
 不要把 JWT 存在 localStorage（XSS 风险）
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

## 最佳实践

### ✅ Do's

1. **从小处开始**
   - 先为核心功能定义 spec
   - 逐步扩展到其他功能

2. **保持 spec 简洁**
   - 避免过度设计
   - 注重可读性

3. **证据驱动**
   - 完成声明必须附带证据
   - 测试报告列出全部用例状态

4. **知识沉淀**
   - 解决问题后立即 compound
   - 定期 compound-refresh 清理过时内容

5. **边界清晰**
   - Source vs Runtime 分离
   - Script vs LLM 职责明确

### ❌ Don'ts

1. **不要跳过 spec 阶段**
   - 即使小任务也要明确范围

2. **不要让 spec 与实际脱节**
   - 建立自动化验证

3. **不要过度依赖工具**
   - 保持灵活性
   - 必要时手动调整

4. **不要手改 generated runtime**
   - 修改 source 后重新 init

5. **不要忽略知识沉淀**
   - 每次解决问题都是团队资产

---

## 延伸阅读

- [Spec-First 概述](/ai-agent/spec-first/overview) - 理论基础
- [Harness Engineering 核心思想](/ai-agent/harness-engineering/core-concepts) - 六层模型
- [最佳实践](/ai-agent/harness-engineering/best-practices) - 工程实践

---

## 总结

Spec-First 工作流的核心是：**先思考，再编码**。通过规范化的流程，确保：

1. **需求清晰** - Spec 阶段明确范围
2. **方案可行** - Plan 阶段识别风险
3. **执行可控** - Tasks 阶段分步执行
4. **证据完整** - Code 阶段收集验证
5. **质量保障** - Review 阶段结构化评审
6. **知识传承** - Knowledge 阶段沉淀经验

**下一步**: 学习 [Harness Engineering 核心思想](/ai-agent/harness-engineering/core-concepts)，深入理解六层模型。

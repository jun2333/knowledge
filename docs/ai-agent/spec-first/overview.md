# Spec-First 核心思想

::: tip 什么是 Spec-First?
Spec-First 是面向 AI Coding Agent(Claude Code/Codex)的工作流系统,核心理念是 **"Scripts prepare facts. LLM decides."**(脚本准备事实,LLM做判断)。它将 AI coding 的关键中间态写回仓库,把一次性对话升级为工程化工作流。
:::

## 🎯 核心定位

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
- ❌ 不让脚本替代工程判断
- ❌ 不依赖外部 SaaS(全部 repo-local)

---

## 💡 核心设计哲学

### 1. AI Coding Harness 六层模型

Spec-First 将 AI 工程化分解为六个 Harness 层:

| Harness 层 | 关注点 | Spec-First 实践 |
|-----------|--------|----------------|
| **Context Harness** | 给 AI 正确上下文,不给无限上下文 | bounded direct reads、project guidance、summary-first handoff |
| **Execution Harness** | 把执行变成可跟踪流程 | spec-plan、task pack、spec-work |
| **Evidence Harness** | 结论必须能回到证据 | source refs、git diff、测试日志、review findings |
| **Evaluation Harness** | 记录有没有真的变好 | verification profile、content audit、release gates |
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
└─────────────────────────┘
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

Generated runtime (CLI 自动生成):
- .claude/          # Claude Code 入口
- .codex/           # Codex 入口
- .agents/skills/   # 运行时副本
```

**原则**: 永远不要手改 generated runtime,修改 source 后重新 init

#### Script/LLM 边界
```
CLI 负责(确定性动作):
- doctor/init/clean     # 环境管理
- hash/validate         # 完整性校验
- generate              # 代码/文档生成

LLM 负责(语义判断):
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

**原则**: Provider evidence 只是候选,源码/测试/日志才是确认依据

---

## 🔄 核心工作流

### 主链路(非强制线性状态机)

```
Codebase → Spec → Plan → Tasks → Code → Review → Knowledge
```

**详细流程**:

```
┌────────────────────────────────────────────────────────────┐
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

### 入口治理(using-spec-first meta skill)

根据当前缺口智能路由:

| 当前状态 | 使用 Workflow | 目的 |
|---------|--------------|------|
| 环境/runtime/MCP 未就绪 | `spec-mcp-setup` | 搭建 harness runtime |
| 需求不清楚 | `spec-brainstorm` | 明确需求 brief |
| 存量系统增量需要 PRD | `spec-prd` | 生成 PRD-grade WHAT |
| 方向选择或想法生成 | `spec-ideate` | ranked ideation |
| HOW 不清楚 | `spec-plan` | 实现方案规划 |
| 计划很大,需要交接 | `spec-write-tasks` | 任务拆解 |
| 可执行工作 | `spec-work` / `spec-debug` | 执行/调试 |
| 需要质量评审 | `spec-code-review` | 结构化评审 |
| 已解决问题需沉淀 | `spec-compound` | 知识沉淀 |

---

## 📁 产物目录结构

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

### Git 策略(三类记忆)

| 类型 | 路径 | 是否提交 | 生命周期 | 作用 |
|-----|------|---------|---------|------|
| **Durable 工程文档** | `docs/ideation/`<br>`docs/brainstorms/`<br>`docs/plans/`<br>`docs/tasks/`<br>`docs/solutions/` | ✅ 通常提交 | 跨会话<br>跨成员<br>跨版本 | 团队知识传承 |
| **Control-plane facts** | `.spec-first/config/`<br>`.spec-first/workspace/`<br>`.spec-first/sessions/` | ❌ 不提交<br>本机重建 | 当前机器<br>当前 ready 状态 | 本地运行时状态 |
| **Generated runtime** | `.claude/`<br>`.codex/`<br>`.agents/skills/` | ❌ 不提交<br>init 自动 ignore | 当前 spec-first<br>版本下的副本 | CLI 生成的入口 |

---

## 🧠 知识沉淀机制

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

- ✅ 团队每次解决一个新问题,下次就少走一段弯路
- ✅ Learnings researcher 自动检索相关历史经验
- ✅ Compound-refresh 按证据淘汰编造内容,保证知识库质量

---

## 🔑 关键工程特性

### 1. Artifact Summary

每个产物携带:
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

### 3. Review Finding

严重级别、证据、影响面、修复建议和剩余风险的结构化输出:

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

## 🎓 适用场景

### ✅ 适合引入 Spec-First

如果你的团队遇到以下任一问题:

- 同一类需求反复解释,跨会话上下文经常丢失
- PR review 只能看到改了什么,看不到为什么这样改
- 大任务需要多人或多个 agent 分工,但缺少清晰交接边界
- 解决过的工程问题没有沉淀,下次仍从头排查
- 希望 Claude Code 与 Codex 共享一套项目级 workflow 约定

### ❌ 不适合的场景

- 只想一次性问答,不需要在项目里留下产物
- 不能安装 Node.js 20+ 或不能写项目文件
- 不使用 Claude Code 或 Codex 这类宿主
- 希望工具全自动替代产品、架构、测试和 review 判断

---

## 💡 思想提炼:对前端开发的启示

虽然 Spec-First 是为 Claude Code/Codex 设计的,但其核心思想对所有 AI Agent 开发都有借鉴意义:

### 1. **工程闭环思维**

传统 AI 开发:
```
Prompt → Response → (结束,上下文丢失)
```

Harness Engineering:
```
Spec → Plan → Tasks → Code → Evidence → Review → Knowledge
      ↑                                              ↓
      └──────────── 知识沉淀,下次复用 ────────────────┘
```

**启示**: 把 AI 交互的中间态持久化,形成工程闭环

### 2. **证据驱动而非直觉驱动**

- 所有结论都要有证据支撑
- 代码改动要关联到需求和测试
- Review 要基于事实,不只是主观判断

**启示**: 建立 Verification Profile,防止"假完成"

### 3. **知识沉淀自动化**

- 解决问题的过程自动记录
- 经验自动检索和复用
- 过时知识自动淘汰

**启示**: 让团队每次解决问题都成为下次的基础

### 4. **清晰的边界治理**

- Source vs Runtime: 知道什么是手写的,什么是生成的
- Script vs LLM: 知道什么由脚本做,什么由 LLM 判断
- Provider vs Source Truth: 知道什么是候选证据,什么是确认依据

**启示**: 边界清晰才能可控演进

---

## 🔗 延伸阅读

- [Harness Engineering 核心思想](/ai-agent/harness-engineering/core-concepts) - 深入理解六层模型
- [Qoder Agent 优化实践](/ai-agent/qoder/optimization) - Qoder 如何实践这些思想
- [最佳实践](/ai-agent/harness-engineering/best-practices) - 通用 AI 工程实践

---

## 💬 总结

Spec-First 的本质不是某个具体工具,而是一种**工程化思维**:

> **把 AI coding 从临时对话升级为工程化工作流,让每一次交互都成为可追溯、可复用、可验证的项目资产。**

这种思维对所有 AI Agent 开发都有借鉴意义,无论你是否使用 Spec-First 这个具体工具。

**下一步**: 学习 [Harness Engineering 核心思想](/ai-agent/harness-engineering/core-concepts),深入理解如何将这些理念应用到你的项目中。

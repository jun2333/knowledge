# dev-agent-harness：面向 AI 辅助开发的工程化框架

::: tip 项目定位
dev-agent-harness 是一个面向软件开发的通用 AI 工作流工具箱，通过 YAML 工作流定义、Markdown Skill 文件和轻量脚本，约束 AI Agent 按标准化流程执行开发任务，解决"AI 偷懒、跳步、幻觉"等可靠性问题。
:::

::: info 与现有文章的关系
- [核心思想](/ai-agent/harness-engineering/core-concepts) 从理论层面介绍了 Harness Engineering 六层模型
- [质量控制对比](/ai-agent/harness-engineering/quality-control) 对比了 dev-agent-harness 与 spec-first 的质量控制机制
- 本文从**项目实践**角度，完整介绍 dev-agent-harness 的设计理念、架构和核心机制
:::

---

## 项目起源

在使用 AI 辅助开发的过程中，我们反复遇到这些问题：

| 问题 | 表现 | 根因 |
|------|------|------|
| AI 偷懒 | 声称"测试通过"但实际没跑命令 | 缺乏验证机制 |
| AI 跳步 | 跳过设计阶段直接写代码 | 缺乏流程约束 |
| AI 幻觉 | 编造不存在的 API 或文件路径 | 缺乏确定性事实校验 |
| 经验丢失 | 解决的问题没有沉淀，下次从头来 | 缺乏知识闭环 |
| 上下文爆炸 | 一次性读取过多文件，Token 浪费严重 | 缺乏上下文管理 |

这些问题的共同根源是：**AI 有"智能"但没有"纪律"**。dev-agent-harness 的核心目标就是给 AI 建立一套可执行的工程纪律。

---

## 核心公式

```
可靠性 = 流程约束 + 精准上下文 + 阶段产出 + 经验闭环
```

这四个要素缺一不可：

- **流程约束**：AI 必须按阶段执行，不能跳步
- **精准上下文**：每个阶段只加载必要的文件，控制 Token 消耗
- **阶段产出**：每个阶段必须输出结构化文档，作为下游的输入
- **经验闭环**：完成任务后收集经验，下次复用，减少重复探索

---

## 两层架构

dev-agent-harness 采用"通用层 + 项目层"的分层设计：

```
┌─────────────────────────────────────────────────┐
│              项目层（knowledge/）                  │
│                                                   │
│  业务 Skill    领域知识    项目规范    经验教训     │
│  (SDK 接入)   (业务文档)  (代码风格)  (踩坑记录)   │
└──────────────────────┬──────────────────────────┘
                       │ 继承 & 扩展
┌──────────────────────┴──────────────────────────┐
│            通用层（dev-agent-harness）             │
│                                                   │
│  Workflows    Skills    Templates    Context Rules │
│  (流程定义)  (通用技能)  (产出模板)   (加载策略)    │
└─────────────────────────────────────────────────┘
```

**通用层**（harness 仓库）提供框架级的流程定义和通用技能，通过 git submodule 嵌入目标项目。**项目层**（knowledge/）存放业务相关的 Skill、领域知识和经验教训。

这种分层的好处：
- 通用层可跨项目复用，升级框架不影响项目配置
- 项目层只关心业务逻辑，不需要了解框架内部机制
- 两层独立演进，互不干扰

---

## 项目结构

```
dev-agent-harness/
├── harness.md                  # Agent 入口 prompt（必读）
├── skill-interface.md          # Skill 接口规范
│
├── workflows/                  # 工作流定义
│   ├── feature.yaml            # 新功能开发
│   ├── bugfix.yaml             # Bug 修复
│   ├── refactor.yaml           # 重构
│   ├── project-init.yaml       # 项目初始化
│   └── skill-creation.yaml     # 技能创建
│
├── skills/                     # 通用技能
│   ├── framework/              # 框架层（自动触发）
│   │   ├── reflecting/         # 复盘 + 经验收集
│   │   └── state-checkpoint/   # 断点恢复
│   ├── skill-creation/         # 技能创建流程
│   │   ├── skill-design/       # 技能设计
│   │   ├── skill-implement/    # 技能编写
│   │   ├── skill-test/         # 技能验证
│   │   └── skill-evolution/    # 技能自进化
│   ├── tools/                  # 工具类技能
│   │   ├── project-init/       # 项目初始化
│   │   ├── tech-audit/         # 技术资产审计
│   │   └── knowledge-init/     # 知识库初始化
│   └── domain-templates/       # 阶段标准模板
│       ├── designing.md
│       ├── task-planning.md
│       ├── implementing.md
│       ├── testing.md
│       └── reviewing.md
│
├── context-rules/              # 上下文管理
│   ├── file-discovery.md       # 文件发现策略
│   └── loading-strategy.md     # 分阶段加载规则
│
├── templates/                  # 产出物模板
│   ├── task-input.md
│   ├── design-output.md
│   ├── task-plan-output.md
│   ├── test-report-output.md
│   ├── review-report-output.md
│   └── context-ledger.md
│
└── tools/                      # 工具脚本
    ├── verify.js               # 验证工具（强制执行命令）
    └── skill-log.js            # 技能执行记录
```

---

## 工作流引擎

### YAML 工作流定义

每个工作流由多个阶段（stage）组成，每个阶段指定使用的 Skill、输入/输出文件和失败回退策略。以 feature 工作流为例：

```yaml
# workflows/feature.yaml
name: feature
description: 新功能开发流程

pre_task:
  - skill: state-checkpoint
    action: init

stages:
  - name: designing
    skill: designing
    input: [task-input.md]
    output: design-output.md
    post_stage:
      - skill: state-checkpoint
        action: save
      - skill: skill-log
        action: complete

  - name: task-planning
    skill: task-planning
    input: [design-output.md]
    output: task-plan-output.md
    post_stage:
      - skill: state-checkpoint
        action: save

  - name: implementing
    skill: implementing
    input: [task-plan-output.md]
    output: changes.md
    post_stage:
      - skill: state-checkpoint
        action: save

  - name: testing
    skill: testing
    input: [task-plan-output.md, changes.md]
    output: test-report.md
    on_fail: implementing          # 测试失败回退到实施阶段
    post_stage:
      - skill: state-checkpoint
        action: save

  - name: reviewing
    skill: reviewing
    input: [design-output.md, changes.md, test-report.md]
    output: review-report.md
    on_fail: implementing          # 审查失败也回退到实施阶段
    post_stage:
      - skill: state-checkpoint
        action: save

  - name: reflecting
    skill: reflecting
    trigger: manual                # 手动触发，不自动执行
```

### 五种工作流

| 工作流 | 阶段 | 特点 |
|--------|------|------|
| **feature** | designing → task-planning → implementing → testing → reviewing → reflecting | 完整流程，含设计阶段 |
| **bugfix** | task-planning → implementing → testing → reviewing → reflecting | 跳过 designing，直接进入计划 |
| **refactor** | designing → task-planning → implementing → testing → reviewing → reflecting | 与 feature 相同，但关注内部质量 |
| **project-init** | project-init → reflecting | 技术选型 + 脚手架生成 |
| **skill-creation** | designing → implementing → testing → reflecting | 专用技能创建流程 |

### 阶段间的交接协议

每个阶段的产出物头部统一包含 **Summary for downstream** 区块：

```markdown
## Summary for downstream

- **Goal**: 实现用户登录功能
- **Key Decisions**: 使用 httpOnly cookie 存储 JWT
- **Scope**: LoginForm 组件 + AuthContext + API client
- **Known Risks**: 未实现 i18n
- **Downstream Files**: src/components/LoginForm.tsx, src/context/AuthContext.tsx
```

下游阶段只需读取 Summary 区块即可了解上游结论，不需要全文塞入 context，大幅节省 Token。

---

## 核心机制

### 1. 反合理化红旗表

这是 dev-agent-harness 最独特的设计之一。在 `harness.md` 中定义了 AI 常见的"偷懒念头"及纠正动作：

| 偷懒念头 | 纠正动作 |
|---------|---------|
| "测试应该能过，先声明完成吧" | 实际运行验证命令，读取真实 exit code |
| "这个改动很明显，不用读上游设计文档" | 先读上游产出物的 Summary 区块 |
| "claim 说测试通过就够了" | 测试报告必须列出全部用例的实际状态 |
| "文件太多了，读几个代表性的就行" | 按 context-ledger 检查是否遗漏关键文件 |
| "用户应该不会在意这个细节" | 所有验收标准必须逐项验证 |
| "上次这么做没问题，这次也跳过吧" | 每次任务独立执行，不依赖历史经验跳过步骤 |

**为什么有效**：这不是靠 AI "自觉"遵守的规则，而是在 AI 每次执行时都会读取的入口 prompt 中明确列出的"红线"。当 AI 产生偷懒念头时，这些规则会被上下文匹配到，从而触发纠正。

### 2. Context Ledger（上下文账本）

追踪 AI 在每个任务中读取了哪些文件，防止重复读取和遗漏关键文件：

```markdown
<!-- workspace/{task-id}/context-ledger.md -->

# Context Ledger

| File | Reason | Phase | Timestamp |
|------|--------|-------|-----------|
| task-input.md | 任务输入 | designing | 2026-07-15T10:00:00Z |
| standards/auth.md | 认证规范参考 | designing | 2026-07-15T10:05:00Z |
| src/api/user.ts | 现有 API 结构 | implementing | 2026-07-15T11:30:00Z |

## Summary
- Total files read: 3
- Key patterns observed: RESTful API 风格，统一错误处理
```

**使用规则**：
- 每个 Skill 执行前检查 context-ledger，已读过的文件不重复读
- 新读取的文件追加记录
- 阶段结束时检查是否有遗漏的关键文件

### 3. 确定性事实与语义判断分离

dev-agent-harness 严格区分两类信息：

| 类型 | 来源 | 验证方式 | 示例 |
|------|------|---------|------|
| **确定性事实** | 从实际状态读取 | 工具验证（verify.js） | 文件列表、git hash、exit code |
| **语义判断** | 基于事实推断 | 人工审核 | 架构选型、需求理解、风险评估 |

**规则**：
- 确定性事实必须标注来源（文件路径 + 行号 / 命令 + 输出）
- 语义判断必须标注依据（基于哪些确定性事实推断）
- 不允许把语义判断伪装成确定性事实
- 不允许把确定性工作交给 LLM 判断（用脚本代替）

配合 `verify.js` 工具强制执行验证命令：

```bash
# verify.js 实际运行命令并捕获真实结果
node verify.js run \
  --commands="npm run test:unit,npm run build" \
  --output-dir=workspace/task-123/verify/ \
  --report=workspace/task-123/test-report.md
```

### 4. 反 Cherry-Pick 声明

测试和审查阶段的产出物必须包含反 Cherry-Pick 声明，防止"报喜不报忧"：

```markdown
## Anti-Cherry-Pick Declaration

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 单元测试 - login success | PASS | unit-test.log:45 |
| 单元测试 - invalid password | PASS | unit-test.log:67 |
| 单元测试 - network error | NOT-RUN | 超时跳过 |
| 构建检查 | PASS | build.log:12 |

⚠️ 存在 NOT-RUN 项，整体结论为 INCOMPLETE
```

**判定规则**：
- 存在 NOT-RUN → 结论为 INCOMPLETE
- 存在 FAIL → 结论为 FAILED
- 全部 PASS → 结论为 PASSED

### 5. 状态检查点与断点恢复

`state-checkpoint` Skill 在每个阶段结束后自动保存检查点：

```json
// workspace/{task-id}/checkpoint.json
{
  "task_id": "task-123",
  "workflow": "feature",
  "current_stage": "testing",
  "completed_stages": ["designing", "task-planning", "implementing"],
  "stage_outputs": {
    "designing": "workspace/task-123/design-output.md",
    "task-planning": "workspace/task-123/task-plan-output.md",
    "implementing": "workspace/task-123/changes.md"
  },
  "last_updated": "2026-07-15T14:30:00Z",
  "git_commit_before_task": "abc1234"
}
```

当对话中断或跨会话时，AI 读取 checkpoint.json 即可从上次断点恢复，不需要从头开始。

### 6. 知识生命周期

知识不是"上传就完事"的静态文档，而是有完整生命周期的"活知识"：

```
创建（草稿）→ 审核（reflecting 收集）→ 活跃（被引用）→ 淘汰 / 晋升
```

每条知识带有结构化元数据：

```yaml
---
tags: [authentication, jwt]
confidence: 0.85          # 置信度，低于 0.5 触发淘汰
created: 2026-07-15
last_used: 2026-08-01
use_count: 7              # 引用次数，>= 5 且 confidence >= 0.8 可晋升
source_task: task-123     # 来源任务，可追溯
status: active            # draft / active / archived / invalidated
invalidation_condition: "JWT 库升级到 v3 时失效"
source_refs:
  - src/auth/jwt.service.ts
---
```

**淘汰规则**：
- 90 天未使用 → 归档
- confidence < 0.5 → 标记待审核
- source_refs 指向的文件发生重大变更 → 触发回源检查
- 重复合并 → use_count 合并到更通用的条目

**晋升机制**：
- use_count >= 5 且 confidence >= 0.8 → 从 lessons 晋升为 patterns
- 被 3 个以上项目引用 → 从项目层晋升为通用层

### 7. Skill 自进化

`skill-evolution` 是 dev-agent-harness 的"知识飞轮"——通过聚合 skill-logs 自动发现 Skill 的改进点：

```
skill-log 记录每次执行 → skill-evolution review 汇总分析 → apply 修改 SKILL.md
```

**review 阶段**：汇总某个 Skill 的所有执行记录，分析：
- 哪些步骤经常失败或需要人工干预
- 哪些输入文件经常被遗漏
- 哪些输出格式需要调整

**apply 阶段**：根据 review 结论修改 SKILL.md，并记录变更原因。

这样 Skill 会随着使用次数增加而自动优化，而不是依赖人工定期 Review。

---

## 框架标准模板继承

dev-agent-harness 定义了 5 个阶段标准模板（domain-templates），所有业务 Skill 可以继承这些模板：

| 模板 | 对应阶段 | 核心约束 |
|------|---------|---------|
| `designing.md` | 设计阶段 | 必须包含 Decision Log + Summary for downstream |
| `task-planning.md` | 任务计划 | 必须列出文件清单 + 依赖关系 |
| `implementing.md` | 实施阶段 | 必须输出 Summary for downstream |
| `testing.md` | 测试阶段 | 必须集成 verify.js + Anti-Cherry-Pick 声明 |
| `reviewing.md` | 审查阶段 | 必须包含 Anti-Cherry-Pick Declaration |

**继承规则**：
- 业务 Skill 只需定义业务逻辑部分，格式约束从模板继承
- 模板更新时，所有继承它的 Skill 自动获得改进
- 业务 Skill 可以覆盖模板的特定 section，但不能删除

---

## 使用方式

### Git Submodule（推荐）

```bash
# 在目标项目中引入
git submodule add https://github.com/your-org/dev-agent-harness.git .harness

# 项目层配置
mkdir -p knowledge/skills knowledge/lessons knowledge/standards
```

### 与 AI 工具集成

dev-agent-harness 是工具无关的，可以与任何支持自定义 prompt 的 AI 工具配合使用：

| 工具 | 集成方式 |
|------|---------|
| Claude Code | 在 `CLAUDE.md` 中引用 `.harness/harness.md` |
| Cursor | 在 `.cursor/rules/` 中引用工作流定义 |
| QoderCLI | 在 `AGENTS.md` 中引用 harness 入口 |
| CodeBuddy | 在 `.codebuddy/rules/` 中引用 |

### 日常工作流程

```
1. 接到需求 → 选择工作流（feature / bugfix / refactor）
2. AI 读取 harness.md → 加载工作流定义
3. 按阶段执行：
   designing → [人工确认] → task-planning → implementing → testing → reviewing
4. 每个阶段自动保存 checkpoint + skill-log
5. 完成后手动触发 reflecting，收集经验
6. 经验进入 knowledge/lessons/，等待审核和晋升
```

---

## 与腾讯 Harness Engineering 方案的对比

腾讯在 2026 年发布了一套面向团队的 Harness Engineering 落地规范（基于 CodeBuddy + Knot 平台），与 dev-agent-harness 形成了有趣的互补：

| 维度 | dev-agent-harness | 腾讯方案 |
|------|-------------------|---------|
| **目标用户** | 个人/小团队 | 团队管理者 |
| **核心问题** | AI 执行可靠性 | 团队使用标准统一 |
| **依赖** | 零依赖，纯文件 | 绑定 CodeBuddy + Knot |
| **知识管理** | 生命周期 + 淘汰机制 | 上传文档 + AI 引用 |
| **质量保障** | 反合理化 + verify.js | 人工 Review + audit Skill |
| **团队管理** | 不涉及 | Rules 分层 + 审计评分 |

**各自优势**：
- dev-agent-harness 在 AI 执行可靠性上更深入（反合理化、Context Ledger、断点恢复、Skill 自进化）
- 腾讯方案在团队规模化管理上更成熟（harness-audit 审计、SOP 操作手册、成熟度模型）

详细的对比分析见项目 changelog。

---

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 工作流格式 | YAML | 人类可读，AI 可解析，比 JSON 更适合配置 |
| Skill 格式 | Markdown | 降低编写门槛，AI 天然理解 |
| 工具依赖 | 零依赖（纯文件） | 不绑定特定 AI 工具，git submodule 即可引入 |
| 知识存储 | 文件系统 | 可版本管理，不依赖外部数据库 |
| 验证方式 | 轻量脚本（verify.js） | 比 CLI 框架简单，比纯文本约束强 |
| 阶段交接 | Summary 区块 | 节省 Token，下游不需要读全文 |

---

## 总结

dev-agent-harness 的核心价值可以用一句话概括：

> **不是让 AI 更聪明，而是让 AI 更有纪律。**

它不解决"AI 能不能写出好代码"的问题（那是模型能力的事），而是解决"AI 写代码的过程是否可控、可追溯、可复用"的问题。

通过流程约束防止跳步，通过 Context Ledger 防止上下文爆炸，通过 verify.js 防止假完成，通过知识生命周期防止经验丢失，通过 Skill 自进化实现持续改进。

这套机制的投入是前期的工程化建设（定义工作流、编写 Skill、设计模板），回报是后期 AI 执行质量的稳定提升和团队经验的自动沉淀。

---

## 延伸阅读

- [Harness Engineering 核心思想](/ai-agent/harness-engineering/core-concepts) - 六层模型理论框架
- [最佳实践](/ai-agent/harness-engineering/best-practices) - 通用 AI 工程实践
- [质量控制对比](/ai-agent/harness-engineering/quality-control) - dev-agent-harness vs spec-first
- [Spec-First 指南](/ai-agent/spec-first/guide) - 另一个 Harness Engineering 实践项目

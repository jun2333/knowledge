# 质量控制机制对比：dev-agent-harness vs spec-first

本文详细对比两个框架如何解决"AI 偷懒说谎"问题，以及如何确保所有行为都有证据和记录。

---

## 核心问题定义

AI Agent 在开发过程中可能出现的"偷懒"行为：

1. **假装完成**: 声称测试通过但实际未运行
2. **选择性报告**: 只汇报通过的用例，隐藏失败的
3. **跳过验证**: 不运行构建/lint 就声称代码正确
4. **无依据决策**: 直接给出方案，不说明为什么选择它
5. **缺乏追溯**: 几周后无法理解当时的决策依据
6. **修改运行时文件**: 直接改生成的文件而非源代码

---

## 1. Verification Profile（验证配置）

### 问题场景

```yaml
# taskflow workflow.yaml
testing:
  skill: knowledge/skills/testing/skill.md
  output: test-report.md
  gate: user_approval
```

**风险**: AI 可以只是查看测试文件存在，就生成 `test-report.md` 说"测试通过"，而不实际运行 `npm test`。

---

### dev-agent-harness 简单版本

**实现方式**: 纯文本约定 + skill 模板约束

```yaml
# workflows/feature.yaml (增强版)
testing:
  skill: knowledge/skills/testing/skill.md
  input: [task.md, task-plan.md, changes.md]
  output: test-report.md
  verification_commands:  # ← 新增：声明必须运行的命令
    - npm run test:unit
    - npm run build
  gate: user_approval
  on_fail: implementing
```

**Skill 模板要求** (`knowledge/skills/testing/SKILL.md`):

```markdown
## 执行步骤

1. **运行验证命令**（必须实际执行，不能跳过）:
   ```bash
   npm run test:unit
   npm run build
   ```

2. **读取真实输出**:
   - 捕获 exit code
   - 保存测试日志到 `workspace/{task-id}/test-results/unit-test.log`
   - 保存构建日志到 `workspace/{task-id}/build-output.log`

3. **生成结构化报告**:
   ```markdown
   ## Test Results
   
   ### Unit Tests
   - Command: `npm run test:unit`
   - Exit Code: 0
   - Log: workspace/{task-id}/test-results/unit-test.log
   - Status: ✅ PASSED
   
   ### Build
   - Command: `npm run build`
   - Exit Code: 0
   - Log: workspace/{task-id}/build-output.log
   - Status: ✅ PASSED
   
   ## Conclusion
   所有验证命令执行成功。
   ```

4. **反 Cherry-pick 规则**:
   - ❌ 不允许只说"测试通过"
   - ✅ 必须列出每个命令的 exit code
   - ✅ 必须提供日志文件路径作为证据
```

**Harness Agent 检查** (`.harness/harness.md`):

```markdown
## 反合理化红旗

| 偷懒念头 | 纠正动作 |
|---------|---------|
| "测试应该能过，先声明完成吧" | **实际运行验证命令**，读取真实 exit code 和日志 |
| "claim 说测试通过就够了" | 测试报告必须列出**全部命令的实际状态**（exit code + 日志路径） |
```

**优点**:
- ✅ 零依赖，纯文本约定
- ✅ 易于理解和实现
- ✅ 保持轻量级特性

**缺点**:
- ❌ 依赖 AI 自觉遵守规则
- ❌ 无法强制验证命令真的运行了
- ❌ 用户需要人工检查日志文件是否存在

---

### spec-first 完整版本

**实现方式**: CLI 工具 + JSON Schema + 结构化验证

#### Step 1: 定义 Verification Profile

```json
// spec-first.verification.json (项目根目录)
{
  "default_profile": "standard",
  "profiles": {
    "standard": {
      "services": ["main-app"],
      "checks": ["typecheck", "test:unit", "lint", "build"]
    }
  },
  "services": {
    "main-app": {
      "path": ".",
      "stack_id": "node-typescript",
      "required": true
    }
  },
  "stacks": {
    "node-typescript": {
      "detect": {
        "files": ["package.json", "tsconfig.json"]
      },
      "commands": {
        "typecheck": "tsc --noEmit",
        "test:unit": "jest --coverage",
        "lint": "eslint src/",
        "build": "npm run build"
      },
      "runner_kind": {
        "typecheck": "shell",
        "test:unit": "shell",
        "lint": "shell",
        "build": "shell"
      },
      "required_tools": {
        "typecheck": ["node", "typescript"],
        "test:unit": ["node", "jest"],
        "lint": ["node", "eslint"],
        "build": ["node"]
      }
    }
  }
}
```

#### Step 2: Workflow 调用验证助手

```javascript
// spec-work SKILL.md 中的伪代码
Phase 3: Implementation & Verification

1. 实现代码改动

2. 加载 verification profile:
   ```bash
   spec-first verification-profile load --target-repo .
   ```
   
   返回:
   ```json
   {
     "status": "configured",
     "profile": {
       "name": "standard",
       "checks": [
         {"id": "typecheck", "command": "tsc --noEmit"},
         {"id": "test:unit", "command": "jest --coverage"},
         {"id": "lint", "command": "eslint src/"},
         {"id": "build", "command": "npm run build"}
       ]
     }
   }
   ```

3. 运行验证并记录结果:
   ```bash
   # 对每个 check 执行并捕获结果
   for check in typecheck test:unit lint build; do
     # 实际运行命令
     $COMMAND > /tmp/$check.log 2>&1
     EXIT_CODE=$?
     
     # 调用 capture helper 记录结果
     spec-first verification-run-summary record \
       --target-repo . \
       --check-id $check \
       --exit-code $EXIT_CODE \
       --log-path logs/$check.log
   done
   ```

4. Honest Closeout 验证:
   ```bash
   # 生成 closeout payload
   cat > /tmp/closeout-payload.json <<EOF
   {
     "run_summary_ref": ".spec-first/workflows/spec-work/my-task/run.json",
     "claims": [
       {
         "claim_type": "validation",
         "asserted_status": "passed",
         "evidence_refs": [
           "verification-run-summary:typecheck",
           "verification-run-summary:test:unit",
           "verification-run-summary:lint",
           "verification-run-summary:build"
         ]
       }
     ]
   }
   EOF
   
   # 验证 claims 是否与 evidence 一致
   spec-first honest-closeout validate \
     --input /tmp/closeout-payload.json \
     --target-repo .
   ```
   
   返回:
   ```json
   {
     "schema_version": "honest-closeout.v1",
     "overall": "verified",  // 或 "degraded" / "unsupported"
     "overall_reason_code": "all-claims-consistent",
     "claims": [
       {
         "claim_type": "validation",
         "asserted_status": "passed",
         "evidence_refs": [...],
         "verdict": "consistent",
         "reason_code": "validation-evidence-consistent"
       }
     ]
   }
   ```

5. 只有 `overall === "verified"` 才能声明完成
```

#### Step 3: Verification Run Summary Schema

```json
// .spec-first/workflows/spec-work/{run-id}/run.json
{
  "schema_version": "verification-run-summary.v1",
  "generated_at": "2026-07-15T10:30:00Z",
  "profile": {
    "source": "explicit",
    "name": "standard",
    "path": "spec-first.verification.json"
  },
  "checks": [
    {
      "id": "typecheck",
      "service": "main-app",
      "command": "tsc --noEmit",
      "status": "passed",
      "exit_code": 0,
      "ran": true,
      "required_tools": ["node", "typescript"],
      "missing_tools": [],
      "log_path": ".spec-first/logs/typecheck-abc123.log",
      "reason_code": null,
      "redaction_status": "clean"
    },
    {
      "id": "test:unit",
      "service": "main-app",
      "command": "jest --coverage",
      "status": "failed",
      "exit_code": 1,
      "ran": true,
      "required_tools": ["node", "jest"],
      "missing_tools": [],
      "log_path": ".spec-first/logs/test-unit-def456.log",
      "reason_code": null,
      "redaction_status": "clean"
    },
    {
      "id": "lint",
      "service": "main-app",
      "command": "eslint src/",
      "status": "not-run",
      "exit_code": null,
      "ran": false,
      "required_tools": ["node", "eslint"],
      "missing_tools": ["eslint"],
      "log_path": null,
      "reason_code": "missing_dependency",
      "redaction_status": null
    },
    {
      "id": "build",
      "service": "main-app",
      "command": "npm run build",
      "status": "not-run",
      "exit_code": null,
      "ran": false,
      "required_tools": ["node"],
      "missing_tools": [],
      "log_path": null,
      "reason_code": "schedulable",
      "redaction_status": null
    }
  ]
}
```

#### Step 4: Honest Closeout Validator 逻辑

```javascript
// src/cli/helpers/honest-closeout.js 核心逻辑

function evaluateValidationClaim(claim, context) {
  // 1. 必须有 evidence refs
  if (claim.evidence_refs.length === 0) {
    return { verdict: 'unsupported', reason_code: 'missing-evidence-ref' };
  }
  
  // 2. refs 必须指向 verification-run-summary
  const refs = claim.evidence_refs
    .filter(ref => ref.startsWith('verification-run-summary:'))
    .map(ref => ref.slice('verification-run-summary:'.length));
  
  if (refs.length === 0) {
    return { verdict: 'unsupported', reason_code: 'missing-run-summary-check-ref' };
  }
  
  // 3. 从 run summary 中查找对应的 checks
  const checksById = new Map(
    context.runSummary.checks.map(check => [check.id, check])
  );
  
  const checks = refs.map(ref => checksById.get(ref));
  
  // 4. 检查是否有 missing check
  if (checks.some(check => !check)) {
    return { verdict: 'unsupported', reason_code: 'run-summary-check-not-found' };
  }
  
  // 5. ⭐ 防 Cherry-pick: passed 断言必须反映全量聚合真相
  if (claim.asserted_status === 'passed') {
    // 复用 run-summary owner 的全量聚合逻辑
    const aggregate = aggregateRunSummaryStatus(context.runSummary);
    
    // 如果有 not-run 或 failed 的 check，整体不能是 passed
    if (aggregate !== 'passed') {
      return { 
        verdict: 'degraded', 
        reason_code: 'run-summary-checks-uncovered' 
      };
    }
    
    // 所有引用的 checks 都必须是 passed
    if (checks.every(check => 
      check.status === 'passed' && 
      check.ran === true && 
      check.exit_code === 0
    )) {
      return { 
        verdict: 'consistent', 
        reason_code: 'validation-evidence-consistent' 
      };
    }
    
    return { 
      verdict: 'unsupported', 
      reason_code: 'evidence-status-mismatch' 
    };
  }
  
  // 6. 如果 asserted_status 不是 passed，降级处理
  return { 
    verdict: 'degraded', 
    reason_code: 'validation-not-verified' 
  };
}

function overallFromClaims(claims) {
  // 只要有一个 claim 是 unsupported，整体就是 unsupported
  if (claims.some(claim => claim.verdict === 'unsupported')) {
    return 'unsupported';
  }
  
  // 只要有一个 claim 是 degraded，整体就是 degraded
  if (claims.some(claim => claim.verdict === 'degraded')) {
    return 'degraded';
  }
  
  // 所有 claim 都是 consistent，整体才是 verified
  return 'verified';
}
```

**关键保障机制**:

1. **CLI 强制执行**: `verification-run-summary record` 必须传入真实的 exit code
2. **Schema 校验**: JSON Schema 确保字段完整性和类型正确
3. **防 Cherry-pick**: `aggregateRunSummaryStatus` 检查全量 checks，不能只引用通过的子集
4. **证据链追溯**: 每个 claim 必须指向具体的 check id，validator 会验证一致性
5. **Missing tools 检测**: 自动检测依赖是否安装，未安装的标记为 `not-run`
6. **Redaction 扫描**: 自动扫描日志中的敏感信息（如 API keys），发现则拒绝记录

**优点**:
- ✅ 强制性强，AI 无法绕过 CLI 工具
- ✅ 结构化数据，可机器验证
- ✅ 完整的证据链追溯
- ✅ 自动检测 missing dependencies
- ✅ 防 cherry-pick 机制完善

**缺点**:
- ❌ 需要 Node.js CLI 工具支持
- ❌ 学习曲线陡峭
- ❌ 配置文件复杂（JSON Schema）
- ❌ 不适合小项目快速上手

---

### 对比总结

| 维度 | dev-agent-harness 简单版 | spec-first 完整版 |
|------|------------------------|------------------|
| **实现成本** | 低（纯文本约定） | 高（CLI + Schema） |
| **强制力** | 弱（依赖 AI 自觉） | 强（CLI 强制执行） |
| **验证粒度** | 命令级别 | Check ID 级别 |
| **防 Cherry-pick** | 靠模板约束 | 靠聚合逻辑自动检测 |
| **Missing tools 检测** | ❌ 无 | ✅ 自动检测 |
| **证据链追溯** | 日志文件路径 | 结构化 check refs |
| **Schema 校验** | ❌ 无 | ✅ JSON Schema |
| **适用场景** | 个人/小团队 | 企业级治理 |

---

## 2. Honest Closeout（诚实收尾）

### 问题场景

AI 完成任务后，如何防止它"假装完成"？

---

### dev-agent-harness 简单版本

**实现方式**: Skill 模板 + 反合理化规则

```markdown
# knowledge/skills/testing/SKILL.md

## 输出格式要求

test-report.md 必须包含以下结构：

```markdown
## Summary for downstream
- **Goal**: 验证登录功能
- **Verification Commands**: 
  - `npm run test:unit` (exit code: 0)
  - `npm run build` (exit code: 0)
- **Known Risks**: 未测试并发登录

## Test Execution Details

### Unit Tests
- **Command**: `npm run test:unit`
- **Exit Code**: 0
- **Log File**: workspace/task-123/test-results/unit-test.log
- **Test Cases**:
  | Case | Status | Evidence |
  |------|--------|----------|
  | login-success | PASS | unit-test.log:45 |
  | login-invalid-password | PASS | unit-test.log:67 |
  | login-network-error | NOT-RUN | skipped due to timeout |

### Build
- **Command**: `npm run build`
- **Exit Code**: 0
- **Log File**: workspace/task-123/build-output.log

## Anti-Cherry-Pick Declaration

⚠️ **重要声明**:
- 本报告列出了**全部**执行的测试用例
- 存在 NOT-RUN 用例时，结论为"未完成"
- 存在 FAIL 用例时，结论为"未通过"

## Conclusion

基于以上证据：
- 单元测试: ⚠️ PARTIAL (1 not-run)
- 构建: ✅ PASSED
- 整体状态: ⚠️ INCOMPLETE (存在未运行用例)
```

## 反合理化规则

生成报告时，如果出现以下念头，立即纠正：

| 偷懒念头 | 纠正动作 |
|---------|---------|
| "这个用例没跑，但不影响整体" | **必须标记为 NOT-RUN**，结论降级为 INCOMPLETE |
| "只有一个用例失败，就说通过吧" | **必须如实报告 FAIL**，结论为 FAILED |
| "日志太长，只写结论就行" | **必须提供日志文件路径**作为证据 |
```

**Harness Agent 检查清单**:

```markdown
在 testing 阶段结束时，检查：

- [ ] test-report.md 是否存在
- [ ] 是否列出了 verification_commands 中的所有命令
- [ ] 每个命令是否有 exit code
- [ ] 每个命令是否有日志文件路径
- [ ] 测试用例是否列出了全部状态（PASS/FAIL/NOT-RUN）
- [ ] Conclusion 是否符合 Anti-Cherry-Pick 规则

如果任何一项缺失，要求 AI 重新生成报告。
```

**优点**:
- ✅ 简单易理解
- ✅ 不需要额外工具
- ✅ 通过模板约束输出格式

**缺点**:
- ❌ 依赖 Harness Agent 人工检查
- ❌ 无法机器验证日志文件是否真实存在
- ❌ AI 可能伪造 exit code（虽然概率低）

---

### spec-first 完整版本

**实现方式**: Structured Claims + Validator

#### Step 1: AI 生成 Closeout Payload

```json
// AI 必须生成这个 JSON 结构
{
  "run_summary_ref": ".spec-first/workflows/spec-work/task-123/run.json",
  "claims": [
    {
      "claim_type": "validation",
      "asserted_status": "passed",
      "evidence_refs": [
        "verification-run-summary:typecheck",
        "verification-run-summary:test:unit",
        "verification-run-summary:lint",
        "verification-run-summary:build"
      ]
    },
    {
      "claim_type": "impact_surface",
      "asserted_status": "documented",
      "evidence_refs": [
        "src/auth/jwt.service.ts",
        "src/middleware/auth.middleware.ts"
      ]
    },
    {
      "claim_type": "review",
      "asserted_status": "completed",
      "evidence_refs": [
        ".spec-first/reviews/task-123-review.md"
      ]
    }
  ]
}
```

#### Step 2: Validator 自动验证

```bash
spec-first honest-closeout validate \
  --input /tmp/closeout-payload.json \
  --target-repo .
```

**Validator 执行流程**:

```javascript
// 1. 验证 run_summary_ref 是否可读
const runSummary = readVerificationRunSummary({
  targetRepo: '.',
  runSummaryRef: '.spec-first/workflows/spec-work/task-123/run.json'
});

if (!runSummary.ok) {
  return {
    overall: 'unsupported',
    overall_reason_code: 'run-summary-not-readable',
    claims: []
  };
}

// 2. 验证 claims 数组非空
if (payload.claims.length === 0) {
  return {
    overall: 'degraded',
    overall_reason_code: 'missing-structured-claims',
    claims: []
  };
}

// 3. 逐个验证 claims
const validatedClaims = payload.claims.map(claim => {
  if (claim.claim_type === 'validation') {
    return evaluateValidationClaim(claim, { runSummary });
  }
  if (claim.claim_type === 'impact_surface') {
    return evaluateRepoPathClaim(claim, { targetRepoRoot: '.' });
  }
  if (claim.claim_type === 'review') {
    return evaluateRepoPathClaim(claim, { targetRepoRoot: '.' });
  }
});

// 4. 聚合整体 verdict
const overall = overallFromClaims(validatedClaims);

return {
  schema_version: 'honest-closeout.v1',
  generated_at: new Date().toISOString(),
  overall: overall,  // 'verified' | 'degraded' | 'unsupported'
  overall_reason_code: overallReasonFromClaims(validatedClaims),
  claims: validatedClaims
};
```

#### Step 3: 防 Cherry-pick 机制

```javascript
// 关键逻辑：aggregateRunSummaryStatus

function aggregateRunSummaryStatus(runSummary) {
  const checks = runSummary.checks;
  
  // 1. 如果有任何 check 是 failed，整体就是 failed
  if (checks.some(check => check.status === 'failed')) {
    return 'failed';
  }
  
  // 2. 如果有任何 check 是 not-run，整体就是 not-run
  if (checks.some(check => check.status === 'not-run')) {
    return 'not-run';
  }
  
  // 3. 如果有任何 check 是 degraded，整体就是 degraded
  if (checks.some(check => check.status === 'degraded')) {
    return 'degraded';
  }
  
  // 4. 所有 checks 都是 passed，整体才是 passed
  if (checks.every(check => check.status === 'passed')) {
    return 'passed';
  }
  
  return 'unknown';
}

// 在 evaluateValidationClaim 中使用
if (claim.asserted_status === 'passed') {
  const aggregate = aggregateRunSummaryStatus(context.runSummary);
  
  // ⭐ 关键：即使 AI 只引用了 passed 的 checks，
  // aggregate 也会检查全量 checks
  if (aggregate !== 'passed') {
    return {
      verdict: 'degraded',
      reason_code: 'run-summary-checks-uncovered'
    };
  }
}
```

**示例场景**:

假设 run.json 中有 4 个 checks：
- typecheck: passed
- test:unit: passed
- lint: **not-run** (missing eslint)
- build: passed

**AI 尝试作弊**:
```json
{
  "claims": [
    {
      "claim_type": "validation",
      "asserted_status": "passed",
      "evidence_refs": [
        "verification-run-summary:typecheck",
        "verification-run-summary:test:unit",
        "verification-run-summary:build"
        // ⚠️ 故意省略 lint
      ]
    }
  ]
}
```

**Validator 响应**:
```json
{
  "overall": "degraded",
  "overall_reason_code": "run-summary-checks-uncovered",
  "claims": [
    {
      "claim_type": "validation",
      "asserted_status": "passed",
      "evidence_refs": [...],
      "verdict": "degraded",
      "reason_code": "run-summary-checks-uncovered"
    }
  ]
}
```

**结果**: AI 无法声明 "verified"，必须修复 lint 问题或明确说明为什么跳过。

**优点**:
- ✅ 完全自动化验证
- ✅ 防 cherry-pick 机制严密
- ✅ 结构化数据，可机器消费
- ✅ 支持多种 claim 类型（validation, impact, review, knowledge）

**缺点**:
- ❌ 需要 CLI 工具支持
- ❌ AI 必须生成复杂的 JSON payload
- ❌ 学习成本高

---

### 对比总结

| 维度 | dev-agent-harness 简单版 | spec-first 完整版 |
|------|------------------------|------------------|
| **验证方式** | Harness Agent 人工检查 | CLI Validator 自动验证 |
| **防 Cherry-pick** | 靠模板声明 | 靠聚合逻辑自动检测 |
| **证据类型** | 日志文件路径 | 结构化 check refs |
| **Claim 类型** | 单一（测试报告） | 多种（validation/impact/review/knowledge） |
| **机器可读性** | 弱（Markdown） | 强（JSON） |
| **自动化程度** | 低 | 高 |
| **实现复杂度** | 低 | 高 |

---

## 3. Audit Trail（审计轨迹）

### 问题场景

几周后回看代码，不知道当时为什么选择某个方案。

---

### dev-agent-harness 简单版本

**实现方式**: 强制 Decision Log 区块

```markdown
# design.md 模板

## Decision Log

### Decision 1: 状态管理方案

- **Timestamp**: 2026-07-15T10:30:00Z
- **Question**: 如何选择全局状态管理方案？
- **Context**: 
  - 项目规模：预计 50+ 组件
  - 团队熟悉度：Redux 3人，Zustand 1人
  - 性能要求：中等（无实时数据流）
- **Options Considered**:
  
  #### Option A: Redux Toolkit
  - ✅ 优点：生态成熟，调试工具完善（Redux DevTools），团队熟悉度高
  - ❌ 缺点：样板代码较多，学习曲线陡
  - 📊 评估：适合中大型项目
  
  #### Option B: Zustand
  - ✅ 优点：轻量（~1KB），API 简洁，无需 Provider 包裹
  - ❌ 缺点：生态较小，调试工具不如 Redux
  - 📊 评估：适合小型项目
  
  #### Option C: React Context + useReducer
  - ✅ 优点：无需额外依赖，React 内置
  - ❌ 缺点：性能差（频繁重渲染），不适合复杂状态
  - 📊 评估：仅适合简单场景

- **Chosen**: Redux Toolkit
- **Rationale**: 
  1. 项目规模预计超过 50 个组件，需要完善的调试工具
  2. 团队 3/4 成员熟悉 Redux，降低协作成本
  3. Redux Toolkit 简化了样板代码，抵消了传统 Redux 的部分缺点
- **Deferred Reason**: Zustand 留作后续性能优化备选，如果 Redux 成为瓶颈可考虑迁移
- **Source Tag**: confirmed（基于 `src/components/` 目录扫描，当前 47 个组件，预计增长到 50+）
- **Reviewers**: @tech-lead（已确认）

### Decision 2: API 客户端选择

- **Timestamp**: 2026-07-15T11:00:00Z
- **Question**: 使用 axios 还是 fetch？
- ...
```

**Harness Agent 检查**:

```markdown
在 designing 阶段，检查 design.md 是否包含：

- [ ] Decision Log 区块
- [ ] 每个决策有 Timestamp
- [ ] 列出了至少 2 个备选方案
- [ ] 说明了选择理由（Rationale）
- [ ] 标注了 Source Tag（confirmed/advisory/user）

如果缺失任何一项，要求 AI 补充。
```

**优点**:
- ✅ 简单直接
- ✅ 人类可读性好
- ✅ 不需要额外工具

**缺点**:
- ❌ 依赖 AI 自觉填写
- ❌ 无法机器验证决策质量
- ❌ 格式不统一（不同 AI 可能写出不同格式）

---

### spec-first 完整版本

**实现方式**: Decision Ledger + Structured Metadata

```markdown
# docs/plans/2026-07-15-auth-plan.md

---
generated_by: spec-plan
created_at: 2026-07-15T10:30:00Z
updated_at: 2026-07-15T11:00:00Z
decision_ledger:
  - id: DEC-001
    timestamp: 2026-07-15T10:30:00Z
    question: "状态管理方案选择"
    options:
      - id: opt-redux
        name: "Redux Toolkit"
        pros: ["生态成熟", "调试工具完善", "团队熟悉度高"]
        cons: ["样板代码较多"]
        evaluation_score: 8.5
      - id: opt-zustand
        name: "Zustand"
        pros: ["轻量", "API简洁"]
        cons: ["生态较小", "调试工具弱"]
        evaluation_score: 7.0
      - id: opt-context
        name: "React Context"
        pros: ["无需依赖"]
        cons: ["性能差", "不适合复杂状态"]
        evaluation_score: 5.0
    chosen_option: opt-redux
    rationale: |
      1. 项目规模预计超过 50 个组件
      2. 团队 3/4 成员熟悉 Redux
      3. Redux Toolkit 简化了样板代码
    deferred_options:
      - opt-zustand
      defer_reason: "留作性能优化备选"
    source_tag: confirmed
    source_refs:
      - src/components/
    reviewers:
      - "@tech-lead"
    status: approved
  - id: DEC-002
    timestamp: 2026-07-15T11:00:00Z
    question: "API 客户端选择"
    ...
verified_by:
  - source_reads: [src/agent.ts, src/tools.ts]
  - tests_passed: [unit-tests]
  - review_approved: true
limitations:
  - 仅适用于单 Agent 场景
  - 未考虑多租户隔离
---

# Plan Content

...
```

**CLI 辅助生成**:

```bash
# spec-plan 自动生成 decision ledger
spec-first plan create \
  --question "状态管理方案选择" \
  --options "Redux Toolkit,Zustand,React Context" \
  --chosen "Redux Toolkit" \
  --rationale "项目规模大，团队熟悉" \
  --output docs/plans/2026-07-15-auth-plan.md
```

**Decision Ledger Schema**:

```json
{
  "decision_ledger_entry": {
    "id": "DEC-001",
    "timestamp": "ISO8601",
    "question": "string",
    "options": [
      {
        "id": "string",
        "name": "string",
        "pros": ["string"],
        "cons": ["string"],
        "evaluation_score": "number (0-10)"
      }
    ],
    "chosen_option": "string (option id)",
    "rationale": "string",
    "deferred_options": ["string"],
    "source_tag": "confirmed | advisory | user",
    "source_refs": ["string"],
    "reviewers": ["string"],
    "status": "draft | approved | rejected"
  }
}
```

**优点**:
- ✅ 结构化数据，可机器查询
- ✅ 支持决策评分和对比
- ✅ 可追溯 reviewers 和审批状态
- ✅ CLI 辅助生成，减少 AI 负担

**缺点**:
- ❌ 需要 CLI 工具支持
- ❌ YAML frontmatter 复杂
- ❌ 对小项目来说过于重量级

---

### 对比总结

| 维度 | dev-agent-harness 简单版 | spec-first 完整版 |
|------|------------------------|------------------|
| **格式** | Markdown 自由文本 | YAML frontmatter + JSON Schema |
| **结构化程度** | 低 | 高 |
| **机器可读性** | 弱 | 强 |
| **CLI 辅助** | ❌ 无 | ✅ 有 |
| **决策评分** | ❌ 无 | ✅ 支持 |
| **Reviewer 追踪** | 手动提及 | 结构化字段 |
| **适用场景** | 个人/小团队 | 企业级治理 |

---

## 4. Source/Runtime Gate（源码/运行时分离）

### 问题场景

AI 直接修改 `.claude/skills/generated.ts` 而不是源代码，下次 init 时被覆盖。

---

### dev-agent-harness 简单版本

**实现方式**: 目录约定 + Harness Agent 提醒

```markdown
# .harness/harness.md

## Source/Runtime 边界

```
Source truth (手动维护):
- skills/           # workflow 定义
- knowledge/        # 知识库
- templates/        # 产物模板

Generated runtime (不要手改):
- workspace/        # 任务工作区（每次任务自动生成）
- .harness/cache/   # 缓存文件
```

**原则**: 
- ✅ 修改 source 目录下的文件
- ❌ 不要直接修改 workspace/ 下的文件（会被覆盖）
- ❌ 不要直接修改 .harness/cache/ 下的文件

**如果发现 AI 修改了运行时文件**:
1. 立即警告 AI
2. 要求 AI 撤销改动
3. 引导 AI 修改正确的 source 文件
```

**优点**:
- ✅ 简单明了
- ✅ 不需要额外工具

**缺点**:
- ❌ 依赖 AI 自觉遵守
- ❌ 没有技术强制手段
- ❌ 容易出错

---

### spec-first 完整版本

**实现方式**: CLI 检测 + .gitignore 自动配置

```bash
# spec-first init 时自动生成
cat >> .gitignore <<EOF

# Generated runtime (do not edit manually)
.claude/
.codex/
.agents/skills/
.spec-first/workspace/
.spec-first/sessions/
.spec-first/providers/
EOF

# spec-first doctor 检测 drift
spec-first doctor

# 输出:
# ✅ Source/runtime boundary: OK
# ✅ .gitignore configured: OK
# ⚠️  Warning: Found manual edits in .claude/skills/generated.ts
#    → Please edit skills/generated.ts instead and run `spec-first init`
```

**CLI 实现**:

```javascript
// src/cli/doctor.js
function checkSourceRuntimeBoundary() {
  const runtimeDirs = ['.claude/', '.codex/', '.agents/skills/'];
  const warnings = [];
  
  for (const dir of runtimeDirs) {
    if (fs.existsSync(dir)) {
      // 检查是否有 git 追踪的改动
      const { stdout } = execSync(`git status --porcelain ${dir}`);
      if (stdout.trim()) {
        warnings.push({
          path: dir,
          message: `Found manual edits in ${dir}`,
          suggestion: `Edit source files and run \`spec-first init\``
        });
      }
    }
  }
  
  return {
    status: warnings.length === 0 ? 'OK' : 'WARNING',
    warnings
  };
}
```

**优点**:
- ✅ 自动检测 drift
- ✅ .gitignore 自动配置，防止提交运行时文件
- ✅ 提供修复建议

**缺点**:
- ❌ 需要 CLI 工具支持
- ❌ 只能检测，不能完全阻止

---

### 对比总结

| 维度 | dev-agent-harness 简单版 | spec-first 完整版 |
|------|------------------------|------------------|
| **强制手段** | 无（纯约定） | .gitignore + CLI 检测 |
| **Drift 检测** | ❌ 无 | ✅ `spec-first doctor` |
| **自动配置** | ❌ 无 | ✅ `.gitignore` 自动生成 |
| **修复建议** | 手动引导 | CLI 自动提示 |

---

## 总体对比与建议

### 核心差异

| 维度 | dev-agent-harness | spec-first |
|------|------------------|------------|
| **设计哲学** | 轻量、零依赖、纯文本 | 严谨、CLI 驱动、结构化 |
| **质量控制** | 靠模板约束 + Harness Agent 检查 | 靠 CLI 工具 + Schema 验证 |
| **防作弊机制** | 弱（依赖 AI 自觉） | 强（自动化验证） |
| **学习成本** | 低（1-2 小时上手） | 高（1-2 天学习） |
| **适用团队** | 个人/小团队（<10人） | 中大型团队（>10人） |
| **维护成本** | 低 | 高 |

### 改进建议

对于 dev-agent-harness，建议**优先引入以下 3 个轻量机制**：

1. **Honest Closeout 简化版** (P0)
   - 在 skill 模板中强制要求列出全部测试用例状态
   - 添加 Anti-Cherry-Pick 声明区块
   - Harness Agent 检查 exit code 和日志路径是否存在

2. **Audit Trail 简化版** (P1)
   - 在 design.md/task-plan.md 模板中强制添加 Decision Log 区块
   - 要求列出至少 2 个备选方案和选择理由
   - 标注 Source Tag（confirmed/advisory/user）

3. **Artifact Summary** (P2)
   - 所有产出物头部统一添加 "Summary for downstream" 区块
   - 包含：Goal, Key Decisions, Known Risks, Downstream Files
   - 纯文本约定，零技术成本

**不建议引入的**（保持轻量）:
- ❌ Verification Profile CLI（太复杂）
- ❌ JSON Schema 验证（学习成本高）
- ❌ Evaluation Harness（早期项目不需要）
- ❌ 完整的 Decision Ledger（Markdown 足够）

**核心原则**:
> 每次改进都要问：**这个机制能否用纯文本约定实现？是否需要引入新工具？**

保持 dev-agent-harness 的"零依赖、纯文件"特性，这是它相比 spec-first 的最大优势。

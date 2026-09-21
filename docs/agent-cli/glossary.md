# 术语与编号体系

> 本项目文档 / 代码注释里大量出现 `FR-x` `AC-x` `V-x` `D-x` `lesson NN` 这类编号。
> 新人最常见的困惑是"这些编号去哪查、是不是全局唯一"。

## 1. 编号体系一览

| 前缀 | 含义 | 定义在哪 | 作用域 |
|---|---|---|---|
| **FR-x** | Functional Requirement（功能需求） | 各任务的 `task.md` / 需求文档 | **按任务隔离**（006 的 FR-1 ≠ 007 的 FR-1） |
| **AC-x** | Acceptance Criterion（验收标准） | 同上，`task.md` 的 AC 章节 | **按任务隔离** |
| **V-x** | 用户裁决（design 复核时用户拍板的修订） | 各任务 `design.md` 的「设计复核裁决」 | **按任务隔离**，且**口径优先于 design 正文** |
| **D-x** | Design Decision（设计决策） | 需求 / 设计文档的 Decision Log | 按文档隔离（005 的 D1–D38、007 的 D1–D23） |
| **lesson NN** | 经验教训（跨任务沉淀） | `knowledge/lessons/` | **全局唯一**，永久 |
| **S/C/W/I/N-x** | 审查发现编号（Security-Critical / Critical / Warning / Info / New） | `.harness/workspace/<task>/review-report.md` | 按审查轮次 |

⚠️ **引用编号时务必带任务号**（如"007 的 V-5"）—— 不同任务的 V-1 含义完全不同。

## 2. 高频引用的约束与裁决（按含义速查）

| 含义 | 常见引用 | 一句话 |
|---|---|---|
| **前缀稳定性** | `D23`（005 需求）、008 的 AC-59 | Ollama 前缀 KV 缓存 44×，system prompt 前部不可改写；易变内容只作消息追加 |
| **浮层高度恒定** | 006 的 `V-5`、lesson 022 | 浮层高度生命周期内冻结；变了就整区重建（最脆弱路径） |
| **布局双量模型** | 008 的 `V-7` | `contentRowsFor` / `reservedRowsFor` 是行数唯一公式，禁止内联算术 |
| **`--yes` 不覆盖 forced** | 008 的 `V-1` | 危险命令必须人工确认，自动接受只管普通询问 |
| **后台任务不计 busy** | 008 的 `V-4` | `Ctrl+C` 的语义不被后台任务干扰 |
| **交互唯一分派路径** | 008 的 `AC-27` | UI 审批与 LLM `ask_user` 同一套交互原语 |
| **definitions 基线** | 008 的 `AC-41` | 工具 schema 与重构前快照比对（防破坏前缀缓存） |
| **tick 预算** | 006 的 `AC-65` | 单 tick 重绘 ≤3 行、无清屏、无 DECSTBM 重建 |
| **forced 先于授权** | 008 设计不变式 `I-3` | `ask && forced` 在一切授权前短路 |
| **非交互拒绝后台任务** | 008 的 `V-8` | 单轮模式起后台任务 = 留孤儿 |

## 3. Lessons 速查（`knowledge/lessons/`）

| # | 一句话 |
|---|---|
| 001 | 索引化记忆 + 按需加载（别把记忆全量塞 system prompt） |
| 002 | 对话式完成工作流阶段后，需补编排层状态 |
| 003 | 任务目录命名规范（`workspace/{task-id}`） |
| 004 | 用户输入 → 文件名的安全映射（防路径穿越） |
| 005 | verify 捕获的日志需禁用 ANSI 颜色 |
| 006 | 工作流 sections 校验是精确标题匹配 |
| 007 | e2e 的"输入建模"必须与生产输入逐字段一致 |
| 008 | 修复引入新代码时，安全边界必须复用既有校验函数 |
| 009 | 循环必须把"结束了但没产出"当成一等事件上报 |
| 010 | 长诊断文本必须折行渲染；断言屏幕文本按"整屏拼接"匹配 |
| 011 | 注入式 mock 会掩盖集成缺陷；真实环境测试不可省 |
| 012 | 阈值与计数类逻辑要统一单位，行数统计必须认所有行尾 |
| 013 | 平台能力"能不能调整"必须实测，不能按文档假设 |
| 014 | 独立审查能抓到实现者与测试者结构性看不见的缺陷 |
| 015 | 需求阶段先实测本地推理引擎的隐式能力，再设计缓存方案 |
| 016 | 参考云端 CLI 时，显式区分「可迁移机制」与「平台特有约束」 |
| 017 | 测试"全绿"不等于真实路径可用（断言锁了格式却没锁行为） |
| 018 | 子进程用 `close` 结算会让超时形同虚设；"退出 ≠ 资源已释放" |
| 019 | 对抗性 / 边界性声明没有实测证据就不许写 |
| 020 | 修一个路径的缺陷时，必须同时检查同族路径；返工后派定点复审 |
| 021 | 写 AC 要区分「机制可验」与「端到端可验」，否则造出假 NOT-RUN |
| 022 | 动态布局的固有代价 —— 缓解规则是"浮层高度生命周期恒定" |
| 023 | 把"按推荐拟定的默认项"显式列出交用户复核，是高产的需求采集动作 |
| 024 | 参考主流 CLI 必须取官方文档口径（二手总结会漏关键细节） |

## 4. 技术缩写

| 缩写 | 全称 / 含义 |
|---|---|
| **DECSTBM** | `ESC[top;bottom r`，设置终端滚动区域（"Mechanism" 的缩写名） |
| **CSI / SGR / OSC** | ANSI 转义序列三类：`ESC[` 控制序列 / `ESC[…m` 样式 / `ESC]` 操作系统命令（如 OSC 52 写剪贴板） |
| **Alt Screen** | 备用屏（`ESC?1049h/l`）：TUI 退出后原样恢复用户终端 |
| **wrap-pending** | 写到行末最后一列后终端进入的"待换行"状态（下次写才真正换行/滚动） |
| **pgid** | 进程组 id。`detached: true` 使 `sh` 成组长（pgid === pid），`kill(-pgid)` 整组回收 |
| **KV cache（前缀缓存）** | Ollama 对相同前缀的 prompt 复用 KV 计算（实测 44×），是前缀稳定性约束的动机 |
| **TUI / TermSim** | Terminal UI / 本项目自研的 ANSI 终端模拟器（[`testing/term-sim.ts`） |
| **workspace-id** | cwd 的 sha256 前 16 位，会话按它隔离目录 |
| **harness** | [`DevAgent Harness`](https://github.com/jun2333/dev-agent-harness) 工作流引擎，经 git submodule（`.harness/`）接入；阶段 = precondition → designing → task-planning → implementing → testing → reviewing → reflecting → git-operations |
| **verify 通道** | `.harness/tools/verify.js`：按 `knowledge/verify.config.json` 执行 build+test 并落盘证据，阶段 gate 只认它 |

import{_ as i,o as a,c as n,a8 as l}from"./chunks/framework.CAT8sTE0.js";const E=JSON.parse('{"title":"DevAgent Harness — 设计文档","description":"","frontmatter":{},"headers":[],"relativePath":"dev-agent-harness/DESIGN.md","filePath":"dev-agent-harness/DESIGN.md"}'),t={name:"dev-agent-harness/DESIGN.md"};function p(e,s,h,k,d,r){return a(),n("div",null,[...s[0]||(s[0]=[l(`<h1 id="devagent-harness-—-设计文档" tabindex="-1">DevAgent Harness — 设计文档 <a class="header-anchor" href="#devagent-harness-—-设计文档" aria-label="Permalink to &quot;DevAgent Harness — 设计文档&quot;">​</a></h1><h2 id="定位" tabindex="-1">定位 <a class="header-anchor" href="#定位" aria-label="Permalink to &quot;定位&quot;">​</a></h2><p>一套面向<strong>软件开发</strong>的通用 AI 工作流工具箱。不限定语言、不限定领域——前端、后端、基础设施，任何开发任务都能用。</p><p>本质是一组精心设计的 <strong>skills（技能提示词）+ workflows（工作流）+ knowledge（经验知识）</strong> 文件集合，让 AI 按照靠谱的流程完成开发任务。</p><p>不依赖数据库，不依赖复杂框架——核心产物就是<strong>文件</strong>。</p><hr><h2 id="核心理念" tabindex="-1">核心理念 <a class="header-anchor" href="#核心理念" aria-label="Permalink to &quot;核心理念&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>可靠性 = 流程约束 + 精准上下文 + 阶段产出 + 经验闭环</span></span></code></pre></div><table tabindex="0"><thead><tr><th>理念</th><th>含义</th></tr></thead><tbody><tr><td>流程约束</td><td>工作流定义好阶段顺序，AI 不能跳步</td></tr><tr><td>精准上下文</td><td>每个阶段只加载需要的 skill + 相关文件，不浪费 token</td></tr><tr><td>阶段产出</td><td>每步输出一个 markdown 文件，既是证据也是下游输入</td></tr><tr><td>经验闭环</td><td>踩坑记录沉淀为 knowledge，下次同类任务自动带上</td></tr></tbody></table><hr><h2 id="skill-分层架构" tabindex="-1">Skill 分层架构 <a class="header-anchor" href="#skill-分层架构" aria-label="Permalink to &quot;Skill 分层架构&quot;">​</a></h2><p>采用<strong>通用层 + 项目层</strong>的两层结构，类似工作流体系：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>┌─────────────────────────────────────────────────────────────┐</span></span>
<span class="line"><span>│                    Harness 仓库（通用层）                     │</span></span>
<span class="line"><span>│                                                             │</span></span>
<span class="line"><span>│  ├── workflows/             # 工作流（模板：阶段顺序、gate、sections、verify）│</span></span>
<span class="line"><span>│  ├── workflow-schema.json   # 工作流 schema（格式校验）       │</span></span>
<span class="line"><span>│  ├── context-rules/         # 上下文加载策略                  │</span></span>
<span class="line"><span>│  ├── skill-interface.md     # Skill 接口规范（目录结构、格式）│</span></span>
<span class="line"><span>│  ├── tools/                 # 运行时工具：verify / workflow-lib / workflow-init / lessons-apply / knowledge-index │</span></span>
<span class="line"><span>│  ├── hooks/                 # 门禁：gate-check（按工作流定义校验）│</span></span>
<span class="line"><span>│  └── skills/                # 通用层技能（五组）               │</span></span>
<span class="line"><span>│      ├── framework/         # 框架层：reflecting/state-checkpoint/hook-init │</span></span>
<span class="line"><span>│      ├── skill-creation/    # 技能自举：skill-design/evolution/implement/test │</span></span>
<span class="line"><span>│      ├── workflow-creation/ # 工作流自举：workflow-design/implement/test      │</span></span>
<span class="line"><span>│      ├── tools/             # 工具类：knowledge-init/project-init/tech-audit │</span></span>
<span class="line"><span>│      └── domain-templates/  # 框架模板：designing/.../reviewing            │</span></span>
<span class="line"><span>│                                                             │</span></span>
<span class="line"><span>│  ▲ 定义 workflow 模板 + skill 接口规范 + 门禁/验证工具        │</span></span>
<span class="line"><span>│  ▲ 不含任何领域特定的业务 skill                               │</span></span>
<span class="line"><span>└──────────────────────────┬──────────────────────────────────┘</span></span>
<span class="line"><span>                           │</span></span>
<span class="line"><span>                     通过 submodule</span></span>
<span class="line"><span>                     嵌入到项目</span></span>
<span class="line"><span>                           │</span></span>
<span class="line"><span>┌──────────────────────────▼──────────────────────────────────┐</span></span>
<span class="line"><span>│                    目标项目（项目层）                          │</span></span>
<span class="line"><span>│                                                             │</span></span>
<span class="line"><span>│  knowledge/skills/                                 │</span></span>
<span class="line"><span>│  ├── designing/           ← 项目实现的 designing skill       │</span></span>
<span class="line"><span>│  │   ├── skill.md           （skill 入口 prompt）            │</span></span>
<span class="line"><span>│  │   ├── templates/         （该技能的产出模板）              │</span></span>
<span class="line"><span>│  │   │   └── design-output.md                                │</span></span>
<span class="line"><span>│  │   └── scripts/           （可选，该技能需要的脚本）        │</span></span>
<span class="line"><span>│  ├── task-planning/                                         │</span></span>
<span class="line"><span>│  ├── implementing/                                          │</span></span>
<span class="line"><span>│  ├── testing/                                               │</span></span>
<span class="line"><span>│  ├── reviewing/                                             │</span></span>
<span class="line"><span>│  ├── git-operations/                                        │</span></span>
<span class="line"><span>│  └── project-init/                                          │</span></span>
<span class="line"><span>│                                                             │</span></span>
<span class="line"><span>│  knowledge/workflow/                                 │</span></span>
<span class="line"><span>│  └── {name}/               ← 项目定制的工作流（workflow-init 实例化）│</span></span>
<span class="line"><span>│      └── workflow.yaml                                       │</span></span>
<span class="line"><span>│                                                             │</span></span>
<span class="line"><span>│  knowledge/                                        │</span></span>
<span class="line"><span>│  ├── standards/           ← 项目编码规范、测试规范            │</span></span>
<span class="line"><span>│  ├── patterns/            ← 项目最佳实践、代码模式            │</span></span>
<span class="line"><span>│  ├── lessons/             ← 项目经验教训                      │</span></span>
<span class="line"><span>│  ├── archive/             ← 归档知识                          │</span></span>
<span class="line"><span>│  └── _index.md                                              │</span></span>
<span class="line"><span>│                                                             │</span></span>
<span class="line"><span>│  ▲ 项目特定的 skill 实现 + 工作流实例 + 知识 + 规范        │</span></span>
<span class="line"><span>└─────────────────────────────────────────────────────────────┘</span></span></code></pre></div><h3 id="分层职责" tabindex="-1">分层职责 <a class="header-anchor" href="#分层职责" aria-label="Permalink to &quot;分层职责&quot;">​</a></h3><table tabindex="0"><thead><tr><th>层级</th><th>位置</th><th>内容</th><th>维护者</th></tr></thead><tbody><tr><td>通用层</td><td>harness 仓库</td><td>工作流模板 + skill 接口规范 + 通用层技能（framework / skill-creation / workflow-creation / tools / domain-templates 五组）+ 门禁/验证工具</td><td>harness 维护者</td></tr><tr><td>项目层</td><td><code>knowledge/</code></td><td>项目特定 skill 实现（含 git-operations）+ <strong>工作流实例（workflow/）</strong> + 项目规范/经验/模板</td><td>项目团队 + Agent（knowledge-init）</td></tr></tbody></table><h3 id="skill-接口规范" tabindex="-1">Skill 接口规范 <a class="header-anchor" href="#skill-接口规范" aria-label="Permalink to &quot;Skill 接口规范&quot;">​</a></h3><p>每个项目 skill 目录必须包含：</p><table tabindex="0"><thead><tr><th>文件/目录</th><th>必需</th><th>说明</th></tr></thead><tbody><tr><td><code>skill.md</code></td><td>是</td><td>技能入口，包含角色定义、输入要求、执行步骤、输出规范、上下文指令</td></tr><tr><td><code>templates/</code></td><td>否</td><td>该技能的产出模板，如 <code>design-output.md</code></td></tr><tr><td><code>scripts/</code></td><td>否</td><td>该技能需要的辅助脚本（如测试执行脚本、lint 脚本等）</td></tr></tbody></table><p><code>skill.md</code> 必须包含以下 section：</p><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># [Skill Name] Skill</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 角色</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[这个阶段 AI 扮演什么角色]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 输入</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">需要什么输入</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 上下文加载指令</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">如何加载相关上下文</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 执行步骤</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">具体做什么</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 输出</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">生成 workspace/{task-id}/xxx.md，格式见 templates/xxx.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 约束</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">约束条件</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span></code></pre></div><h3 id="运行时加载优先级" tabindex="-1">运行时加载优先级 <a class="header-anchor" href="#运行时加载优先级" aria-label="Permalink to &quot;运行时加载优先级&quot;">​</a></h3><p>当项目层和通用层存在同名内容时：</p><ol><li><strong>Skill 实现</strong>：<code>knowledge/skills/{name}/skill.md</code> 覆盖 harness 默认（如有）</li><li><strong>报告模板</strong>：<code>knowledge/skills/{name}/templates/</code> &gt; harness 仓库 <code>templates/</code></li><li><strong>项目规范</strong>：<code>knowledge/standards/</code> 由 skill 的上下文加载指令主动读取</li><li><strong>最佳实践</strong>：<code>knowledge/patterns/</code> 通过 <code>_index.md</code> 语义匹配加载</li></ol><h3 id="知识库维护入口" tabindex="-1">知识库维护入口 <a class="header-anchor" href="#知识库维护入口" aria-label="Permalink to &quot;知识库维护入口&quot;">​</a></h3><p>知识库的写入/修改<strong>只能通过以下 skill</strong>，避免随意污染：</p><table tabindex="0"><thead><tr><th>Skill</th><th>子命令</th><th>操作</th></tr></thead><tbody><tr><td>knowledge-init</td><td>scan</td><td>扫描项目生成 standards / patterns 初版</td></tr><tr><td>knowledge-init</td><td>skills</td><td>生成业务 skill 目录和默认模板</td></tr><tr><td>knowledge-init</td><td>workflow-init</td><td>工作流模板实例化：把通用工作流复制到 knowledge/workflow/ 并增强（init/sync/list，绑定项目命令池）</td></tr><tr><td>knowledge-init</td><td>optimize</td><td>整理索引、合并重复、归档过期条目</td></tr><tr><td>reflecting</td><td>阶段一</td><td>生成经验草稿（lessons-draft.md），不直接写入知识库</td></tr><tr><td>reflecting</td><td>阶段二</td><td>收集用户审核通过的经验，写入 lessons/</td></tr></tbody></table><hr><h2 id="项目结构" tabindex="-1">项目结构 <a class="header-anchor" href="#项目结构" aria-label="Permalink to &quot;项目结构&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>dev-agent-harness/</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├├── workflows/                     # 工作流（5 个，目录式：workflow.yaml + check/）</span></span>
<span class="line"><span>│   ├── feature/                   # 新功能开发流程（含 verify.checks: [unit, lint]；代码重构也走此流程）</span></span>
<span class="line"><span>│   ├── bugfix/                    # Bug 修复流程</span></span>
<span class="line"><span>│   ├── project-init/              # 从零开始的项目初始化流程</span></span>
<span class="line"><span>│   ├── skill-creation/            # 技能创建/重构流程（含 check/skill-check.js）</span></span>
<span class="line"><span>│   └── workflow-creation/         # 工作流创建流程（含 check/workflow-check.js）</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├── workflow-schema.json           # 工作流 schema（格式校验）</span></span>
<span class="line"><span>├── context-rules/                 # 上下文加载策略</span></span>
<span class="line"><span>│   ├── file-discovery.md          # 如何定位相关文件</span></span>
<span class="line"><span>│   └── loading-strategy.md        # 各阶段的上下文加载规则</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├── skills/                        # 通用层技能（五组，按职责分层）</span></span>
<span class="line"><span>│   ├── framework/                 # 框架层：reflecting / state-checkpoint / hook-init</span></span>
<span class="line"><span>│   ├── skill-creation/            # 技能自举：skill-design / skill-evolution / skill-implement / skill-test</span></span>
<span class="line"><span>│   ├── workflow-creation/         # 工作流自举：workflow-design / workflow-implement / workflow-test</span></span>
<span class="line"><span>│   ├── tools/                     # 工具类：knowledge-init / project-init / tech-audit</span></span>
<span class="line"><span>│   └── domain-templates/          # 框架模板：designing / task-planning / implementing / testing / reviewing</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├── skill-interface.md             # Skill 接口规范</span></span>
<span class="line"><span>├── docs/                          # 设计文档（DESIGN.md + workflow-spec.md）</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├── templates/                     # 默认产出模板（可被项目层覆盖）</span></span>
<span class="line"><span>│</span></span>
<span class="line"><span>├── tools/                         # 运行时工具：verify.js / workflow-lib.js / workflow-init.js / skill-log.js / review-brief.js / simple-yaml.js / lessons-apply.js / knowledge-index.js</span></span>
<span class="line"><span>├── hooks/                         # 门禁脚本：gate-check.js / check-verify.js / post-tool-log.js / lib.js / install.js</span></span>
<span class="line"><span>├── changelog/                     # 版本演进记录</span></span>
<span class="line"><span>└── workspace/                     # 任务执行空间（产物目录）</span></span>
<span class="line"><span>    └── {task-id}/</span></span>
<span class="line"><span>        ├── task.md                # 任务描述（用户输入）</span></span>
<span class="line"><span>        ├── design.md              # 技术设计产出</span></span>
<span class="line"><span>        ├── task-plan.md           # 任务计划产出</span></span>
<span class="line"><span>        ├── changes.md             # 变更清单</span></span>
<span class="line"><span>        ├── test-report.md         # 测试报告</span></span>
<span class="line"><span>        ├── review-report.md       # 审查报告</span></span>
<span class="line"><span>        ├── lessons-draft.md       # 经验草稿（待用户审核）</span></span>
<span class="line"><span>        ├── checkpoint.json        # 状态检查点（断点恢复用）</span></span>
<span class="line"><span>        └── verify/verification-result.json  # 验证证据（他证）</span></span></code></pre></div><hr><h2 id="各模块设计" tabindex="-1">各模块设计 <a class="header-anchor" href="#各模块设计" aria-label="Permalink to &quot;各模块设计&quot;">​</a></h2><h3 id="_1-harness-md-—-主入口" tabindex="-1">1. harness.md — 主入口 <a class="header-anchor" href="#_1-harness-md-—-主入口" aria-label="Permalink to &quot;1. harness.md — 主入口&quot;">​</a></h3><p>这是用户启动 harness 时加载的第一个 prompt。它负责：</p><ul><li>理解用户意图，选择合适的工作流</li><li>按工作流定义的阶段顺序推进</li><li>在每个阶段加载对应的 skill</li><li>管理阶段间的上下文传递</li></ul><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># DevAgent Harness Agent</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">你是一个软件开发 Harness Agent。你的工作方式是：</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">先计划，再实现，再验证，再审查。每个阶段有明确的输入和输出。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 工作流程</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">当用户给你一个开发任务时：</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取 workflows/ 目录，选择匹配的工作流</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 按工作流定义的阶段顺序执行</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 每个阶段：</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">   -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 加载对应的 skill 文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">   -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 按 context-rules 加载相关上下文</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">   -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 执行任务，输出结构化产物到 workspace/</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">   -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 等待用户确认后再进入下一阶段</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 任务完成后，执行 reflecting skill 阶段一沉淀经验</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 用户审核草稿后，通过&quot;收集经验&quot;或&quot;reflecting collect {task-id}&quot;触发阶段二</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 关键原则</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 不要跳步，每个阶段都必须有产出</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 上下文按需加载，不要一次性读取所有文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 遇到问题主动询问，不要猜测</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 任务结束后提示用户审核经验草稿并收集</span></span></code></pre></div><hr><h3 id="_2-skills-—-技能定义" tabindex="-1">2. Skills — 技能定义 <a class="header-anchor" href="#_2-skills-—-技能定义" aria-label="Permalink to &quot;2. Skills — 技能定义&quot;">​</a></h3><p>Skill 分为两类（仓库根的 <code>skills/</code> 按职责分五组：<code>framework/</code>、<code>skill-creation/</code>、<code>workflow-creation/</code>、<code>tools/</code>、<code>domain-templates/</code>）：</p><ul><li><strong>通用/框架 skill</strong>（harness 仓库提供，所有项目共用）：<code>framework/</code>（reflecting、state-checkpoint、hook-init）、<code>skill-creation/</code>（skill-design、skill-evolution、skill-implement、skill-test）、<code>tools/</code>（knowledge-init、project-init、tech-audit）</li><li><strong>业务 skill</strong>（项目层实现）：designing、task-planning、implementing、testing、reviewing、git-operations，由项目通过 <code>knowledge-init skills</code> 基于 <code>domain-templates/</code> 的框架模板继承生成或人工编写</li></ul><h4 id="通用-skill-示例-reflecting-md" tabindex="-1">通用 Skill 示例：reflecting.md <a class="header-anchor" href="#通用-skill-示例-reflecting-md" aria-label="Permalink to &quot;通用 Skill 示例：reflecting.md&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># Reflecting Skill</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 角色</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">你是一位善于总结复盘的技术专家，擅长从实践经验中提炼可复用的知识。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 阶段一：自动复盘（workflow 最后阶段自动调用）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 输入</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 任务描述（task.md）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 技术设计（design.md）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 任务计划（task-plan.md）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 测试报告（test-report.md）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 审查报告（review-report.md）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 执行步骤</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 回顾任务执行全过程</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 对比计划与实际执行的差异</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 提炼可复用的经验教训</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生成经验草稿到 workspace/{task-id}/lessons-draft.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 回溯每个 skill 的执行情况，评估是否存在不足（来源：agent 自检 + 用户反馈）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">6.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 如发现技能不足，生成 workspace/{task-id}/skill-improvements-draft.md；如无不足则跳过</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 输出</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> workspace/{task-id}/lessons-draft.md（项目经验草稿，等待用户审核）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> workspace/{task-id}/skill-improvements-draft.md（技能改进建议草稿，有待审核；如无不足则不生成）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 约束</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 经验教训必须基于实际执行过程，不臆造</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 每条教训必须有明确的场景、问题和解决方案</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 初始置信度设为 0.5，后续根据引用情况调整</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 不直接写入知识库，只生成草稿供用户审核</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 技能改进建议必须指向具体的 skill 文件和修改点，不泛泛而谈</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 阶段二：手动收集（用户通过编号选择后调用）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 输入</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> workspace/{task-id}/lessons-draft.md（项目经验草稿）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> workspace/{task-id}/skill-improvements-draft.md（技能改进建议草稿，如存在）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 用户指定的编号（如&quot;收集第 1、3 条&quot;）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 执行步骤</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取 lessons-draft.md 和 skill-improvements-draft.md（如存在）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 根据用户指定的编号，将对应条目标题加上 </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">\`✅\`</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 标记</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 筛选带 </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">\`✅\`</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 的经验，生成 frontmatter（tags, confidence, created, use_count, source_task, status）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 写入 knowledge/lessons/ 目录</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 更新 knowledge/_index.md（如需要）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">6.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 筛选带 </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">\`✅\`</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 的技能改进建议，按建议修改对应的 skill 文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">7.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 清理已收集的草稿</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 输出</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> knowledge/lessons/{id}-{title}.md（新增的经验文件）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 约束</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 只收集用户勾选的经验</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生成的文件必须符合 frontmatter 格式规范</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 文件名使用 {id}-{title}.md 格式</span></span></code></pre></div><h4 id="通用-skill-示例-state-checkpoint-md" tabindex="-1">通用 Skill 示例：state-checkpoint.md <a class="header-anchor" href="#通用-skill-示例-state-checkpoint-md" aria-label="Permalink to &quot;通用 Skill 示例：state-checkpoint.md&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># State Checkpoint Skill</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 角色</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">你是一位任务状态管理器，负责记录任务执行进度和提供断点恢复能力。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 使用场景</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;"> **记录检查点**</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">：每完成一个 stage 后调用，记录当前进度</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;"> **恢复任务**</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">：启动时检查是否有未完成的 checkpoint，提示用户是否恢复</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 记录检查点</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取当前任务状态（workspace/{task-id}/checkpoint.json）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 更新当前 stage、完成时间、产出文件列表</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 写回 checkpoint.json</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 恢复任务</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 扫描 workspace/ 目录，查找有 checkpoint.json 的任务</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 展示未完成的任务列表和当前进度</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 用户选择要恢复的任务</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 加载 checkpoint 中记录的 stage 和上下文，从断点继续</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## checkpoint.json 格式</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">\`\`\`json</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  &quot;task_id&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;task-001&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  &quot;workflow&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;feature&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  &quot;current_stage&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;implementing&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  &quot;completed_stages&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;designing&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;task-planning&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">],</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  &quot;stage_outputs&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: {</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">    &quot;designing&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;design.md&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">    &quot;task-planning&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;task-plan.md&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  },</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  &quot;last_updated&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;2026-06-24T10:30:00Z&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  &quot;git_commit_before_task&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;abc123&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><h2 id="约束" tabindex="-1">约束 <a class="header-anchor" href="#约束" aria-label="Permalink to &quot;约束&quot;">​</a></h2><ul><li>每个 stage 完成后必须调用此 skill 记录检查点</li><li>恢复时必须向用户确认</li><li>记录任务开始前的 git commit hash，用于回滚</li></ul><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span></span></span>
<span class="line"><span>#### 通用 Skill 示例：knowledge-init.md</span></span>
<span class="line"><span></span></span>
<span class="line"><span>\`\`\`markdown</span></span>
<span class="line"><span># Knowledge Init Skill</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 角色</span></span>
<span class="line"><span>你是一位知识库管理员，负责通过阅读项目代码自动生成和维护知识库。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 子命令</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### knowledge-init scan</span></span>
<span class="line"><span>扫描项目，生成 knowledge 初版。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>1. 读取项目配置文件，识别技术栈和框架</span></span>
<span class="line"><span>2. 扫描项目目录结构，理解模块划分</span></span>
<span class="line"><span>3. 分析代码风格（命名规范、文件组织、import 风格等）</span></span>
<span class="line"><span>4. 分析测试策略（测试框架、测试组织方式、覆盖率配置等）</span></span>
<span class="line"><span>5. 生成 knowledge/standards/code-style.md</span></span>
<span class="line"><span>6. 生成 knowledge/standards/testing-rules.md</span></span>
<span class="line"><span>7. 提取项目中的常见模式到 knowledge/patterns/</span></span>
<span class="line"><span>8. 生成 knowledge/_index.md 推荐列表</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### knowledge-init skills</span></span>
<span class="line"><span>生成业务 skill 目录和默认模板。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>1. 读取 skill-interface.md 获取接口规范</span></span>
<span class="line"><span>2. 为每个业务 skill 创建目录（knowledge/skills/{name}/）</span></span>
<span class="line"><span>3. 为每个 skill 生成默认 skill.md（基于接口规范）</span></span>
<span class="line"><span>4. 为每个 skill 的 templates/ 生成默认报告模板</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### knowledge-init optimize</span></span>
<span class="line"><span>整理索引、合并重复、归档过期条目。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>1. 扫描 knowledge/lessons/ 和 knowledge/patterns/</span></span>
<span class="line"><span>2. 识别标签高度重合的条目，建议合并</span></span>
<span class="line"><span>3. 检查过期条目（90 天未引用），标记 status: archived</span></span>
<span class="line"><span>4. 更新 _index.md 推荐列表</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 约束</span></span>
<span class="line"><span>- 生成的规范必须基于项目实际代码，不臆造</span></span>
<span class="line"><span>- 生成的 skill 必须符合 skill-interface.md 定义的接口规范</span></span>
<span class="line"><span>- 生成的报告模板作为默认模板，项目可覆盖</span></span>
<span class="line"><span>- optimize 操作需向用户确认后再执行</span></span>
<span class="line"><span>- 这是知识库的写入入口之一</span></span></code></pre></div><h4 id="业务-skill-示例-项目层实现" tabindex="-1">业务 Skill 示例（项目层实现） <a class="header-anchor" href="#业务-skill-示例-项目层实现" aria-label="Permalink to &quot;业务 Skill 示例（项目层实现）&quot;">​</a></h4><p>以下为 knowledge-init 生成的默认 skill 示例，项目可根据需要修改：</p><h5 id="knowledge-skills-designing-skill-md" tabindex="-1">knowledge/skills/designing/skill.md <a class="header-anchor" href="#knowledge-skills-designing-skill-md" aria-label="Permalink to &quot;knowledge/skills/designing/skill.md&quot;">​</a></h5><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># Designing Skill</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 角色</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">你是一位资深软件架构师，擅长需求分析、技术选型和架构设计。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 输入</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 用户的任务描述（task.md）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 项目上下文（通过 context-rules 加载）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 上下文加载指令</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取 knowledge/_index.md 查找相关经验</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 如有相关经验，加载对应的 knowledge 文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 根据任务关键词，定位项目中的相关目录和文件：</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">   -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取项目配置文件（如 package.json / go.mod / Cargo.toml / pyproject.toml）了解技术栈</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">   -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 扫描相关目录的文件列表（不读内容，只看结构）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">   -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 只深入读取与任务直接相关的文件（不超过 5 个）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取 knowledge/standards/ 下的项目规范</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 执行步骤</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 分析任务需求，提取关键功能点</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 评估影响范围（哪些文件需要改/新增）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 技术方案设计（架构选型、接口设计、数据模型等）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 识别风险点和技术决策</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 如有多个方案，给出对比分析并推荐</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 输出</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">生成 workspace/{task-id}/design.md，格式见 knowledge/skills/designing/templates/design-output.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 约束</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 方案必须贴合项目现有技术栈，不引入不必要的新技术</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 必须列出所有受影响的文件和模块</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 如果任务范围过大，建议拆分为多个子任务</span></span></code></pre></div><h5 id="knowledge-skills-git-operations-skill-md" tabindex="-1">knowledge/skills/git-operations/skill.md <a class="header-anchor" href="#knowledge-skills-git-operations-skill-md" aria-label="Permalink to &quot;knowledge/skills/git-operations/skill.md&quot;">​</a></h5><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># Git Operations Skill</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 角色</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">你是一位 Git 版本控制专家，负责代码提交和回滚操作。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 子命令</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### git-operations commit</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">提交本次任务的代码变更。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取 workspace/{task-id}/changes.md 了解变更内容</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取 review-report.md 了解审查结果</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 执行 git status / git diff 检查实际变更</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 根据项目提交规范生成 commit message（如 Conventional Commits）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 执行 git add 和 git commit</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">6.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 如用户要求，执行 git push</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### git-operations rollback</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">回滚代码或任务状态。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取 checkpoint.json 获取 git_commit_before_task</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 向用户确认回滚目标（代码回滚 / 阶段回滚）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 代码回滚：执行 git checkout {commit} -- .（不修改 git 历史）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 阶段回滚：删除目标 stage 之后的产出文件，更新 checkpoint.json</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 保留 workspace 中的日志文件，不删除执行记录</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 约束</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 提交前必须向用户确认 commit message</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 回滚前必须向用户确认目标</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 遵循宿主项目的提交规范（如 commit message 格式、分支策略等）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 代码回滚使用 git checkout，不修改 git 历史</span></span></code></pre></div><h5 id="knowledge-skills-project-init-skill-md" tabindex="-1">knowledge/skills/project-init/skill.md <a class="header-anchor" href="#knowledge-skills-project-init-skill-md" aria-label="Permalink to &quot;knowledge/skills/project-init/skill.md&quot;">​</a></h5><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># Project Init Skill</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 角色</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">你是一位资深技术顾问，擅长技术选型、项目架构设计和工程化搭建。你通过交互式对话引导用户完成从 0 到 1 的项目初始化。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 输入</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 用户的项目需求描述（口头或 task.md）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 用户的技术偏好和约束（如有）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 执行步骤</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 阶段一：需求分析</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 与用户对话，明确项目类型（Web/CLI/库/微服务等）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 了解核心功能和非功能需求（性能、并发、部署环境等）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 确认团队技术背景和偏好</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 确认约束条件（预算、时间、合规要求等）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 阶段二：技术选型</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 基于需求分析，提出 2-3 套技术方案</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 每套方案包含：语言/框架、数据库、部署方案、关键依赖</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 对比各方案的优缺点、学习成本、社区生态</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 给出推荐方案并说明理由</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 等待用户确认或调整</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 阶段三：标准定制</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 基于选定的技术栈，生成 coding standards（命名规范、文件组织、import 风格等）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 定义测试策略（测试框架、目录结构、覆盖率要求）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 定义 Git 工作流（分支策略、commit 规范、PR 流程）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 定义 CI/CD 方案（如需要）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 等待用户确认或调整</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 阶段四：项目脚手架</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生成项目目录结构</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生成配置文件（package.json / go.mod / pyproject.toml 等）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生成 .gitignore、README.md、LICENSE</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生成 CI/CD 配置文件（如需要）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生成初始代码骨架（如 main 入口、基础目录结构）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">6.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 等待用户确认</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 输出</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> workspace/{task-id}/tech-selection.md（技术选型文档）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> workspace/{task-id}/project-standards.md（项目规范文档）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 项目脚手架文件（直接生成到项目目录）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 约束</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 技术选型必须基于用户需求，不推荐用户不熟悉的复杂方案</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 每套方案必须有明确的适用场景和限制</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 项目脚手架必须可运行（至少能启动/编译通过）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 所有决策必须经用户确认</span></span></code></pre></div><hr><h3 id="_3-workflows-—-工作流定义" tabindex="-1">3. Workflows — 工作流定义 <a class="header-anchor" href="#_3-workflows-—-工作流定义" aria-label="Permalink to &quot;3. Workflows — 工作流定义&quot;">​</a></h3><p>YAML 文件定义阶段序列和阶段间的依赖关系。</p><h4 id="示例-workflows-feature-workflow-yaml-工作流结构示意" tabindex="-1">示例：workflows/feature/workflow.yaml（工作流结构示意） <a class="header-anchor" href="#示例-workflows-feature-workflow-yaml-工作流结构示意" aria-label="Permalink to &quot;示例：workflows/feature/workflow.yaml（工作流结构示意）&quot;">​</a></h4><div class="language-yaml vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">feature</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">description</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">新功能开发与代码重构流程</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 任务开始前</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">pre_task</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/state-checkpoint.md</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    # 记录任务开始前的 git commit</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    action</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">init</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">stages</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">precondition</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">.harness/skills/framework/precondition/SKILL.md</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   # 确认验收标准来源（需求文档引用或简要需求文档），无则不进入设计</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    input</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    output</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    gate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user_approval</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">designing</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">knowledge/skills/designing/skill.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    input</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    output</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">design.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    gate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user_approval</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    post_stage</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/state-checkpoint.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        action</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">save</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">                     # 记录检查点</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task-planning</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">knowledge/skills/task-planning/skill.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    input</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">design.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    output</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task-plan.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    gate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user_approval</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    post_stage</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/state-checkpoint.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        action</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">save</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">implementing</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">knowledge/skills/implementing/skill.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    input</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">design.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task-plan.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    output</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">changes.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    gate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">none</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    post_stage</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/state-checkpoint.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        action</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">save</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">testing</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">knowledge/skills/testing/skill.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    input</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task-plan.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">changes.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    output</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">test-report.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    gate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user_approval</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    on_fail</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">implementing</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    post_stage</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/state-checkpoint.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        action</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">save</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">reviewing</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">knowledge/skills/reviewing/skill.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    input</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">design.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">changes.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">test-report.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    output</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">review-report.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    gate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user_approval</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    on_fail</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">implementing</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    post_stage</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/state-checkpoint.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        action</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">save</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">reflecting</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/reflecting.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    sub_command</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">reflect</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">                  # 阶段一：自动复盘</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    input</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">design.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task-plan.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">test-report.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">review-report.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    output</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">lessons-draft.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skill-improvements-draft.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    post_stage</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/state-checkpoint.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        action</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">save</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">git-operations</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">knowledge/skills/git-operations/skill.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    sub_command</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">commit</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    input</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">changes.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">review-report.md</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    output</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">changes.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    gate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user_approval</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    optional</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    post_stage</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">      - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/state-checkpoint.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        action</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">complete</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">                 # 标记任务完成</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 任务结束后（可选）</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 用户审核草稿后，通过以下方式调用阶段二：</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">#   - 对话中说&quot;收集经验&quot;或&quot;reflecting collect&quot;</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">#   - 执行 reflecting collect {task-id}</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">post_task</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">skill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">skills/reflecting.md</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    sub_command</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">collect</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">                  # 阶段二：手动收集</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    trigger</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">manual</span></span></code></pre></div><hr><h3 id="_3-5-工作流机制-2026-08-演进" tabindex="-1">3.5 工作流机制（2026-08 演进） <a class="header-anchor" href="#_3-5-工作流机制-2026-08-演进" aria-label="Permalink to &quot;3.5 工作流机制（2026-08 演进）&quot;">​</a></h3><p>工作流从&quot;单 YAML 定义&quot;演进为<strong>自包含工作流</strong>，分两批落地：</p><h4 id="第一批-工作流-运行时数据驱动" tabindex="-1">第一批：工作流 + 运行时数据驱动 <a class="header-anchor" href="#第一批-工作流-运行时数据驱动" aria-label="Permalink to &quot;第一批：工作流 + 运行时数据驱动&quot;">​</a></h4><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>workflows/{name}/workflow.yaml     # 步骤定义（stages）+ 产出物要求（sections）+ 测试手段（verify.checks）</span></span>
<span class="line"><span>workflows/{name}/check/            # 工作流专属校验脚本（可选）</span></span></code></pre></div><ul><li><strong>单一真相源</strong>：产出物必含区块（sections/require_verify）从 gate-check 硬编码迁入 workflow.yaml——新工作流免改 harness 代码</li><li><strong>gate 数据驱动</strong>：<code>gate-check.js</code> 按 <code>checkpoint.workflow</code> 加载工作流定义校验产出物；WorkBuddy 用 PreToolUse exit 2 硬阻断，Claude 等宿主用 PostToolUse（脚本双事件兼容）</li><li><strong>verify 手段两层</strong>：工作流 <code>check/</code> 脚本（可编程校验）+ 项目命令池 key（<code>knowledge/verify.config.json</code> 的 commands 对象）——他证原则：命令来源只能是工作流声明 + 项目配置，LLM 不能自选</li><li><strong>文档/技能任务验证对象正确</strong>：skill-creation 只跑 skill-check、workflow-creation 只跑 workflow-check，不再跑项目 vitest/lint</li><li><strong>创建工作流的流程</strong>：workflow-creation 工作流 + workflow-design/implement/test 技能（与 skill-creation 对称，自身闭环）</li></ul><h4 id="第二批-模板语义-项目实例化" tabindex="-1">第二批：模板语义 + 项目实例化 <a class="header-anchor" href="#第二批-模板语义-项目实例化" aria-label="Permalink to &quot;第二批：模板语义 + 项目实例化&quot;">​</a></h4><ul><li><strong>通用工作流 = 模板</strong>：骨架（步骤/产出要求）通用，但测试命令、通过标准必须项目定制（&quot;改代码用什么测试命令、怎么测算通过&quot;由项目决定）</li><li><strong>项目层 <code>knowledge/workflow/</code></strong>（git 跟踪，与 skills/standards 同属项目层）：项目定制工作流</li><li><strong>解析顺序</strong>：<code>knowledge/workflow/{name}/</code>（项目优先）→ <code>.harness/workflows/{name}/</code>（通用兜底）；同名项目版覆盖</li><li><strong>workflow-init</strong>（knowledge-init 子命令）：<code>init</code>（模板实例化 + 命令池强校验 + <code>--as</code> 改名 + 溯源注释）/ <code>sync</code>（只补齐未定制部分，定制保留报告）/ <code>list</code></li><li><strong>check 脚本回归工作流</strong>：校验脚本随工作流自包含（非通用脚本不放 tools/），新增 check 零 harness 代码改动</li></ul><p>详细规范见 <code>docs/workflow-spec.md</code>。</p><h3 id="_3-6-宿主执行差异-cli-workbuddy-vs-dsh" tabindex="-1">3.6 宿主执行差异（CLI/WorkBuddy vs DSH） <a class="header-anchor" href="#_3-6-宿主执行差异-cli-workbuddy-vs-dsh" aria-label="Permalink to &quot;3.6 宿主执行差异（CLI/WorkBuddy vs DSH）&quot;">​</a></h3><p>同一套通用层机制（工作流 / gate 数据驱动 / verify 他证），在不同宿主环境下<strong>执行方式不同</strong>——机制不变，载体变：</p><table tabindex="0"><thead><tr><th>维度</th><th>CLI / WorkBuddy（hook 驱动）</th><th>DSH（编排器驱动）</th></tr></thead><tbody><tr><td>流程执行</td><td>LLM 自读 workflow.yaml 按阶段推进（提示词约定）</td><td>编排器（orchestrator）逐阶段驱动干净子代理，失败程序化回退（on_fail）</td></tr><tr><td>产出物门禁</td><td>gate-check.js：PreToolUse exit 2 硬阻断（WorkBuddy）/ PostToolUse（Claude）</td><td>数据级：子代理返回 JSON 摘要 + schema 校验（sections_ok/verify_evidence）</td></tr><tr><td>人工门禁</td><td>提示词约定停等 + Stop 收尾提醒</td><td>流程级：ask_user_question（gate: user_approval 程序化）</td></tr><tr><td>危险操作</td><td>提示词约定</td><td>工具级：沙箱权限 + 审批（justification，permission/tools 字段驱动）</td></tr><tr><td>验证证据</td><td>verify.js 手动执行落盘 verification-result.json</td><td>同一配置 + 编排器校验 verify_evidence 字段</td></tr><tr><td>确定性兜底</td><td>gate-check（产出物+证据对账）</td><td>复用 gate-check.js（bash 直调）</td></tr><tr><td>上下文</td><td>单会话加载 context-rules</td><td>每阶段干净子代理 + 输入白名单（账本消失）</td></tr></tbody></table><p><strong>单一真相源</strong>：两种宿主都从工作流 <code>workflow.yaml</code> 读定义（sections/permission/tools/verify）——<code>dsh/stage-schema.json</code> 已删除，不再有第二份阶段定义。</p><hr><h3 id="_4-context-rules-—-上下文加载策略" tabindex="-1">4. Context Rules — 上下文加载策略 <a class="header-anchor" href="#_4-context-rules-—-上下文加载策略" aria-label="Permalink to &quot;4. Context Rules — 上下文加载策略&quot;">​</a></h3><p>这是让 AI 精准控制上下文的关键。</p><h4 id="context-rules-loading-strategy-md" tabindex="-1">context-rules/loading-strategy.md <a class="header-anchor" href="#context-rules-loading-strategy-md" aria-label="Permalink to &quot;context-rules/loading-strategy.md&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 上下文加载策略</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 总原则</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 先概览后细节：先读目录结构，再读文件列表，最后才读文件内容</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 按需加载：只加载当前阶段需要的文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 知识库优先：先查 knowledge/，用已有经验指导行动</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 各阶段加载规则</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### Designing 阶段</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">必读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] task.md, knowledge/_index.md, knowledge/standards/</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">扫描</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] 项目目录结构（ls 级别，不读文件内容）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">精读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] 与任务直接相关的文件（最多 5 个）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">选读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] 相关 experience 文件（通过 _index.md 匹配）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Token 预算：~15K tokens</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### Task Planning 阶段</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">必读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] task.md, design.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">参考</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] knowledge/patterns/ 中相关模式</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Token 预算：~8K tokens</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### Implementing 阶段</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">必读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] task.md, design.md, task-plan.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">精读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] task-plan.md 中列出的需要修改的文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">参考</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] knowledge/patterns/ 中相关模式</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Token 预算：~30K tokens</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### Testing 阶段</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">必读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] task.md, task-plan.md, changes.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">精读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] 变更的文件 + 对应的测试文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">参考</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] knowledge/standards/testing-rules.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Token 预算：~20K tokens</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### Reviewing 阶段</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">必读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] design.md, changes.md, test-report.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">精读</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] 所有变更文件（完整 diff）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">参考</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">] knowledge/standards/code-style.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Token 预算：~25K tokens</span></span></code></pre></div><h4 id="context-rules-file-discovery-md" tabindex="-1">context-rules/file-discovery.md <a class="header-anchor" href="#context-rules-file-discovery-md" aria-label="Permalink to &quot;context-rules/file-discovery.md&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 文件发现策略</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">当需要定位与任务相关的文件时，按以下顺序：</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读项目配置文件（package.json / go.mod / Cargo.toml / pyproject.toml 等）→ 确定技术栈和项目结构</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 扫描源码目录 → 获取模块划分概览</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 根据任务关键词匹配模块目录</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">4.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 在匹配目录中扫描文件名 → 定位具体文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">5.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 只深入读取匹配到的文件</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">不要：</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 一次性读取所有源代码文件</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取依赖目录（node_modules / vendor / .venv 等）、构建产物（dist / build / target 等）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 读取与任务无关的模块代码</span></span></code></pre></div><hr><h3 id="_5-knowledge-—-知识库" tabindex="-1">5. Knowledge — 知识库 <a class="header-anchor" href="#_5-knowledge-—-知识库" aria-label="Permalink to &quot;5. Knowledge — 知识库&quot;">​</a></h3><h4 id="knowledge-index-md-推荐列表" tabindex="-1">knowledge/_index.md（推荐列表） <a class="header-anchor" href="#knowledge-index-md-推荐列表" aria-label="Permalink to &quot;knowledge/_index.md（推荐列表）&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 知识推荐</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 高频经验（按使用频率排序）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> lessons/001-xxx.md - 并发请求竞态问题</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> lessons/003-yyy.md - 异步加载竞态</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 项目规范</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> standards/code-style.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> standards/testing-rules.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 最佳实践</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> patterns/error-handling.md - 分层错误处理策略</span></span></code></pre></div><p>经验文件的格式：</p><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">---</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">tags</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">concurrency</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">race-condition</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">confidence</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.8</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">created</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2026-06-20</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">last_used</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2026-06-24</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">use_count</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">3</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">source_task</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task-xxx</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">status</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">active</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">---</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 并发请求竞态问题</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 场景</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">什么时候会遇到这个问题</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 问题</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">具体是什么问题</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 解决方案</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">怎么解决的</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 代码示例</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">（如适用）</span></span></code></pre></div><hr><h3 id="_6-templates-—-产出模板" tabindex="-1">6. Templates — 产出模板 <a class="header-anchor" href="#_6-templates-—-产出模板" aria-label="Permalink to &quot;6. Templates — 产出模板&quot;">​</a></h3><p>模板现在属于各 skill 目录的一部分（<code>knowledge/skills/{name}/templates/</code>）。</p><p>harness 仓库的 <code>templates/</code> 目录存放默认模板，knowledge-init 初始化时会基于这些默认模板生成项目层的模板。项目可覆盖或自定义。</p><h4 id="默认模板示例-task-input-md" tabindex="-1">默认模板示例：task-input.md <a class="header-anchor" href="#默认模板示例-task-input-md" aria-label="Permalink to &quot;默认模板示例：task-input.md&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 任务：[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">标题</span><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 描述</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">要做什么</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 验收标准</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [ ] 标准 1</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [ ] 标准 2</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 约束</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 技术栈限制：</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 兼容性要求：</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 相关文件（可选）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> path/to/related/files</span></span></code></pre></div><h4 id="默认模板示例-design-output-md" tabindex="-1">默认模板示例：design-output.md <a class="header-anchor" href="#默认模板示例-design-output-md" aria-label="Permalink to &quot;默认模板示例：design-output.md&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 技术设计：[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">任务标题</span><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 需求分析</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">对任务的理解</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 影响范围</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">| 文件/模块 | 操作 | 说明 |</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">|-----------|------|------|</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">| path/to/file | 修改 | 添加 xxx 功能 |</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 技术方案</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 架构设计</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">整体方案描述</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 接口/数据模型设计</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">（如适用）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 方案对比（如有多个方案）</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">| 方案 | 优点 | 缺点 | 推荐 |</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">|------|------|------|------|</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 风险与决策</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">| 风险 | 影响 | 缓解措施 |</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">|------|------|---------|</span></span></code></pre></div><h4 id="默认模板示例-task-plan-output-md" tabindex="-1">默认模板示例：task-plan-output.md <a class="header-anchor" href="#默认模板示例-task-plan-output-md" aria-label="Permalink to &quot;默认模板示例：task-plan-output.md&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 任务计划：[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">任务标题</span><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 基于设计文档</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">design.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 实施步骤</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### Step 1: [</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">步骤名</span><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">]</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 输入：</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 操作：</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 产出：</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 验证方式：</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 预估工作量：</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### Step 2: ...</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 步骤依赖关系</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">步骤间的依赖说明</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 总工作量估算</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">预估</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span></code></pre></div><hr><h2 id="执行流程示意" tabindex="-1">执行流程示意 <a class="header-anchor" href="#执行流程示意" aria-label="Permalink to &quot;执行流程示意&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>用户: &quot;实现一个用户注册功能&quot;</span></span>
<span class="line"><span>  │</span></span>
<span class="line"><span>  ▼</span></span>
<span class="line"><span>[加载 harness.md] → 识别为 feature 类型 → 加载 workflows/feature/workflow.yaml（工作流）</span></span>
<span class="line"><span>  │</span></span>
<span class="line"><span>  ▼</span></span>
<span class="line"><span>┌─ Stage 1: Designing ─────────────────────────────┐</span></span>
<span class="line"><span>│  加载: knowledge/skills/designing/       │</span></span>
<span class="line"><span>│         skill.md                                  │</span></span>
<span class="line"><span>│  上下文:                                          │</span></span>
<span class="line"><span>│    - knowledge/_index.md → 匹配到认证相关经验      │</span></span>
<span class="line"><span>│    - 项目配置 → 发现技术栈                         │</span></span>
<span class="line"><span>│    - 目录扫描 → 定位相关模块                       │</span></span>
<span class="line"><span>│  产出: workspace/task-001/design.md               │</span></span>
<span class="line"><span>│  Gate: 用户确认 ✅                                 │</span></span>
<span class="line"><span>└──────────────────────────────────────────────────┘</span></span>
<span class="line"><span>  │</span></span>
<span class="line"><span>  ▼</span></span>
<span class="line"><span>┌─ Stage 2: Task Planning ─────────────────────────┐</span></span>
<span class="line"><span>│  加载: knowledge/skills/task-planning/   │</span></span>
<span class="line"><span>│         skill.md                                  │</span></span>
<span class="line"><span>│  上下文:                                          │</span></span>
<span class="line"><span>│    - design.md（技术方案作为输入）                  │</span></span>
<span class="line"><span>│  产出: workspace/task-001/task-plan.md            │</span></span>
<span class="line"><span>│  Gate: 用户确认 ✅                                 │</span></span>
<span class="line"><span>└──────────────────────────────────────────────────┘</span></span>
<span class="line"><span>  │</span></span>
<span class="line"><span>  ▼</span></span>
<span class="line"><span>┌─ Stage 3: Implementing ──────────────────────────┐</span></span>
<span class="line"><span>│  加载: knowledge/skills/implementing/    │</span></span>
<span class="line"><span>│         skill.md + task-plan.md                   │</span></span>
<span class="line"><span>│  上下文:                                          │</span></span>
<span class="line"><span>│    - task-plan.md 中列出的文件（精读）              │</span></span>
<span class="line"><span>│    - knowledge/patterns/ 中的相关模式              │</span></span>
<span class="line"><span>│  执行: 按 task-plan 的步骤逐个实现                 │</span></span>
<span class="line"><span>│  产出: workspace/task-001/changes.md              │</span></span>
<span class="line"><span>└──────────────────────────────────────────────────┘</span></span>
<span class="line"><span>  │</span></span>
<span class="line"><span>  ▼</span></span>
<span class="line"><span>┌─ Stage 4: Testing ───────────────────────────────┐</span></span>
<span class="line"><span>│  加载: knowledge/skills/testing/         │</span></span>
<span class="line"><span>│         skill.md                                  │</span></span>
<span class="line"><span>│  上下文:                                          │</span></span>
<span class="line"><span>│    - changes.md（知道改了什么）                     │</span></span>
<span class="line"><span>│    - 变更文件 + 对应测试文件                        │</span></span>
<span class="line"><span>│  执行: 运行测试、检查覆盖率、验证验收标准           │</span></span>
<span class="line"><span>│  产出: workspace/task-001/test-report.md          │</span></span>
<span class="line"><span>│  Gate: 用户确认 ✅                                 │</span></span>
<span class="line"><span>└──────────────────────────────────────────────────┘</span></span>
<span class="line"><span>  │</span></span>
<span class="line"><span>  ▼</span></span>
<span class="line"><span>┌─ Stage 5: Reviewing ─────────────────────────────┐</span></span>
<span class="line"><span>│  加载: knowledge/skills/reviewing/       │</span></span>
<span class="line"><span>│         skill.md                                  │</span></span>
<span class="line"><span>│  上下文: diff + 项目规范                           │</span></span>
<span class="line"><span>│  执行: 按 checklist 审查                           │</span></span>
<span class="line"><span>│  产出: workspace/task-001/review-report.md        │</span></span>
<span class="line"><span>│  Gate: 用户确认 ✅                                 │</span></span>
<span class="line"><span>└──────────────────────────────────────────────────┘</span></span>
<span class="line"><span>  │</span></span>
<span class="line"><span>  ▼</span></span>
<span class="line"><span>┌─ Stage 6: Reflecting（阶段一：自动复盘）──────</span></span>
<span class="line"><span>│  加载: skills/reflecting.md（通用 skill）          │</span></span>
<span class="line"><span>│  执行: 复盘本次任务                                │</span></span>
<span class="line"><span>│  产出:                                            │</span></span>
<span class="line"><span>│    - workspace/task-001/lessons-draft.md          │</span></span>
<span class="line"><span>│    - workspace/task-001/skill-improvements-draft.md│</span></span>
<span class="line"><span>│      （如有技能不足；如无则不生成）                  │</span></span>
<span class="line"><span>│  提示: 请用户审核草稿后调用&quot;收集经验&quot;              │</span></span>
<span class="line"><span>└──────────────────────────────────────────────────┘</span></span>
<span class="line"><span>  │</span></span>
<span class="line"><span>  ▼</span></span>
<span class="line"><span>┌─ 用户审核经验草稿 ───────────────────────────────┐</span></span>
<span class="line"><span>│  用户对话中说&quot;收集第 1、3 条&quot;                      │</span></span>
<span class="line"><span>│  AI 标记 ✅ 后执行 reflecting collect task-001：   │</span></span>
<span class="line"><span>│    - 勾选的项目经验 → 写入 knowledge/lessons/      │</span></span>
<span class="line"><span>│    - 勾选的技能改进 → 修改对应 skill 文件          │</span></span>
<span class="line"><span>└──────────────────────────────────────────────────┘</span></span></code></pre></div><hr><h2 id="关键设计决策" tabindex="-1">关键设计决策 <a class="header-anchor" href="#关键设计决策" aria-label="Permalink to &quot;关键设计决策&quot;">​</a></h2><table tabindex="0"><thead><tr><th>决策</th><th>选择</th><th>理由</th></tr></thead><tbody><tr><td>存储</td><td>文件系统 (markdown/yaml)</td><td>零依赖，可读性好，Git 友好</td></tr><tr><td>技能定义</td><td>Markdown + 目录结构</td><td>LLM 天然擅长理解 markdown，目录结构支持模板/脚本</td></tr><tr><td>工作流</td><td>YAML</td><td>结构清晰，易于编辑和版本管理</td></tr><tr><td>上下文控制</td><td>规则文件 + 阶段隔离</td><td>简单直接，不需要向量数据库</td></tr><tr><td>知识检索</td><td>frontmatter + 推荐列表</td><td>文件自带元数据，AI 可直接扫描，无需维护完整索引</td></tr><tr><td>经验沉淀</td><td>草稿审核 + 手动收集</td><td>用户把关质量，避免无关经验污染知识库</td></tr><tr><td>状态管理</td><td>checkpoint.json</td><td>支持断点恢复和回滚，轻量可靠</td></tr><tr><td>阶段门禁</td><td>用户确认</td><td>关键节点人工把关，最可靠的质检</td></tr><tr><td>产出格式</td><td>Markdown 模板</td><td>结构化、可追溯、可归档</td></tr><tr><td>工作流形态</td><td>自包含工作流（workflow.yaml + check/）</td><td>步骤/产出要求/测试手段内聚；新工作流免改 gate/verify 代码</td></tr><tr><td>工作流分层</td><td>通用模板（.harness/workflows/）+ 项目实例（knowledge/workflow/）</td><td>父类纯净、项目可定制（测试命令/通过标准项目决定）</td></tr><tr><td>校验脚本归属</td><td>随工作流 check/</td><td>工作流专属校验自包含，新增 check 零 harness 代码改动</td></tr><tr><td>验证他证</td><td>verify.js 执行 + verification-result.json 证据</td><td>命令只能来自工作流声明 + 项目命令池，LLM 不能自选；gate 对账</td></tr></tbody></table><hr><h2 id="知识生命周期" tabindex="-1">知识生命周期 <a class="header-anchor" href="#知识生命周期" aria-label="Permalink to &quot;知识生命周期&quot;">​</a></h2><p>知识库需要一套机制避免无限膨胀，保持高质量。</p><h3 id="知识文件格式" tabindex="-1">知识文件格式 <a class="header-anchor" href="#知识文件格式" aria-label="Permalink to &quot;知识文件格式&quot;">​</a></h3><p>每个知识文件使用 <strong>frontmatter</strong> 携带元数据，便于 AI 直接扫描判断相关性：</p><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">---</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">tags</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">concurrency</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">race-condition</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">confidence</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.8</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">created</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2026-06-20</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">last_used</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2026-06-24</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">use_count</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">3</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">source_task</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">task-xxx</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">status</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">active</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">          # active / archived</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">---</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 并发请求竞态问题</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 场景</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">什么时候会遇到这个问题</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 问题</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">具体是什么问题</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 解决方案</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">怎么解决的</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 代码示例</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">（如适用）</span></span></code></pre></div><h3 id="知识索引机制" tabindex="-1">知识索引机制 <a class="header-anchor" href="#知识索引机制" aria-label="Permalink to &quot;知识索引机制&quot;">​</a></h3><p><code>_index.md</code> 降级为<strong>推荐列表</strong>，只列出高频/高价值知识，不是完整索引：</p><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 知识推荐</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 高频经验（按使用频率排序）</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> lessons/001-xxx.md - 并发请求竞态问题</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> lessons/003-yyy.md - 异步加载竞态</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 项目规范</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> standards/code-style.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> standards/testing-rules.md</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 最佳实践</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> patterns/error-handling.md - 分层错误处理策略</span></span></code></pre></div><p>AI 在需要时可以：</p><ol><li>先读 <code>_index.md</code> 获取推荐知识</li><li>直接 <code>ls knowledge/lessons/</code> 扫描目录</li><li>读取文件头部 frontmatter 判断相关性</li></ol><h3 id="经验审核机制" tabindex="-1">经验审核机制 <a class="header-anchor" href="#经验审核机制" aria-label="Permalink to &quot;经验审核机制&quot;">​</a></h3><p>reflecting 阶段一产出的经验<strong>不直接写入知识库</strong>，而是先写草稿：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>workspace/{task-id}/lessons-draft.md            ← 项目经验草稿</span></span>
<span class="line"><span>workspace/{task-id}/skill-improvements-draft.md  ← 技能改进建议草稿（如有不足）</span></span></code></pre></div><h4 id="项目经验草稿格式" tabindex="-1">项目经验草稿格式 <a class="header-anchor" href="#项目经验草稿格式" aria-label="Permalink to &quot;项目经验草稿格式&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 经验草稿</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 待审核经验</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 经验 1: 并发请求竞态问题</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 标签: concurrency, race-condition</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 置信度: 0.7</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 场景: 多个异步操作共享状态时</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 问题: 后发起的请求覆盖了先发起请求的结果</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 解决方案: 使用 AbortController 或请求队列</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 经验 2: 异步加载竞态</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 标签: async, loading</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">...</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 操作指引</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请说出需要收集的经验编号（如&quot;收集第 1、3 条&quot;），然后执行 </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">\`reflecting collect\`</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">。</span></span></code></pre></div><h4 id="技能改进建议草稿格式" tabindex="-1">技能改进建议草稿格式 <a class="header-anchor" href="#技能改进建议草稿格式" aria-label="Permalink to &quot;技能改进建议草稿格式&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 技能改进建议</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 待审核改进</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 改进 1: designing skill — 缺少数据库迁移文件扫描</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 文件: knowledge/skills/designing/skill.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 问题: 上下文加载指令未提及扫描 migration 文件，导致设计时遗漏了数据库变更影响</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 建议: 在&quot;上下文加载指令&quot;中增加一步：&quot;扫描 db/migrations/ 目录，了解最近的数据库变更&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">### 改进 2: testing skill — 测试报告模板缺少性能指标</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 文件: knowledge/skills/testing/templates/test-report-output.md</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 问题: 模板中没有性能测试相关字段</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 建议: 在模板中增加&quot;性能指标&quot;section</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 操作指引</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请说出需要应用的改进编号（如&quot;应用第 1、2 条&quot;），然后执行 </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">\`reflecting collect\`</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">。</span></span></code></pre></div><h4 id="审核流程" tabindex="-1">审核流程 <a class="header-anchor" href="#审核流程" aria-label="Permalink to &quot;审核流程&quot;">​</a></h4><ol><li>reflecting 阶段一生成草稿（经验 + 技能改进建议）</li><li>用户对话中说&quot;收集第 1、3 条&quot;或&quot;应用第 1、2 条&quot;</li><li>AI 将选中的条目标题加上 <code>✅</code> 标记</li><li>用户执行 <code>reflecting collect {task-id}</code>： <ul><li>勾选的项目经验 → 写入 <code>knowledge/lessons/</code></li><li>勾选的技能改进 → 直接修改对应的 skill 文件</li></ul></li><li>如果 agent 和用户均未发现技能不足，不生成 skill-improvements-draft.md，跳过此环节</li></ol><h3 id="知识分级" tabindex="-1">知识分级 <a class="header-anchor" href="#知识分级" aria-label="Permalink to &quot;知识分级&quot;">​</a></h3><table tabindex="0"><thead><tr><th>级别</th><th>来源</th><th>保留策略</th></tr></thead><tbody><tr><td>规范 (standards)</td><td>knowledge-init scan 生成 + 人工维护</td><td>永久保留，通过 knowledge-init optimize 优化</td></tr><tr><td>模式 (patterns)</td><td>knowledge-init scan 生成 + 人工注入 + reflecting 阶段二收集</td><td>长期保留，定期审核</td></tr><tr><td>教训 (lessons)</td><td>reflecting 阶段二收集（经用户审核）</td><td>有生命周期，按规则淘汰</td></tr></tbody></table><h3 id="淘汰规则-由-knowledge-init-optimize-执行" tabindex="-1">淘汰规则（由 knowledge-init optimize 执行） <a class="header-anchor" href="#淘汰规则-由-knowledge-init-optimize-执行" aria-label="Permalink to &quot;淘汰规则（由 knowledge-init optimize 执行）&quot;">​</a></h3><ol><li><strong>过期淘汰</strong>：创建超过 90 天且 use_count = 0 → 移入 <code>knowledge/archive/</code></li><li><strong>低置信度淘汰</strong>：confidence &lt; 0.3 → 归档</li><li><strong>重复合并</strong>：两条教训标签高度重合且场景相似 → 合并为一条</li><li><strong>晋升机制</strong>：use_count &gt;= 5 且 confidence &gt;= 0.8 → 建议提升为 pattern（人工确认）</li></ol><h3 id="索引膨胀控制" tabindex="-1">索引膨胀控制 <a class="header-anchor" href="#索引膨胀控制" aria-label="Permalink to &quot;索引膨胀控制&quot;">​</a></h3><ul><li><code>_index.md</code> 只保留推荐条目（不超过 50 条）</li><li>归档条目不删除文件，但 status 标记为 archived</li><li>AI 扫描时自动跳过 status: archived 的文件</li></ul><hr><h2 id="使用方式" tabindex="-1">使用方式 <a class="header-anchor" href="#使用方式" aria-label="Permalink to &quot;使用方式&quot;">​</a></h2><h3 id="项目结构-1" tabindex="-1">项目结构 <a class="header-anchor" href="#项目结构-1" aria-label="Permalink to &quot;项目结构&quot;">​</a></h3><p>harness agent 作为一个独立 Git 仓库维护：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>dev-agent-harness/         ← 本仓库（通用 harness 定义）</span></span>
<span class="line"><span>├── harness.md</span></span>
<span class="line"><span>├── skills/</span></span>
<span class="line"><span>├── workflows/</span></span>
<span class="line"><span>├── knowledge/             ← 初始为空，使用时积累</span></span>
<span class="line"><span>├── context-rules/</span></span>
<span class="line"><span>├── templates/</span></span>
<span class="line"><span>└── workspace/             ← 任务产物</span></span></code></pre></div><h3 id="在目标项目中使用" tabindex="-1">在目标项目中使用 <a class="header-anchor" href="#在目标项目中使用" aria-label="Permalink to &quot;在目标项目中使用&quot;">​</a></h3><p><strong>方式一：Git Submodule（推荐）</strong></p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">cd</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> my-project</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">git</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> submodule</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> add</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">harness-repo-ur</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">l</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&gt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> .harness</span></span></code></pre></div><p>好处：</p><ul><li>harness 版本可锁定，团队共享一致</li><li>各项目独立积累 knowledge，互不干扰</li><li>harness 更新时各项目按需升级</li></ul><p>项目结构：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>my-project/</span></span>
<span class="line"><span>├── .harness/              ← harness agent (submodule)</span></span>
<span class="line"><span>│   ├── harness.md</span></span>
<span class="line"><span>│   ├── skills/</span></span>
<span class="line"><span>│   ├── knowledge/         ← 该项目的专属知识</span></span>
<span class="line"><span>│   └── workspace/</span></span>
<span class="line"><span>├── src/                   ← 你的项目代码</span></span>
<span class="line"><span>├── tests/</span></span>
<span class="line"><span>└── ...</span></span></code></pre></div><p><strong>方式二：子目录（简单场景）</strong></p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">cd</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> my-project</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">git</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> clone</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">harness-repo-ur</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">l</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&gt;</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> .harness</span></span></code></pre></div><p>简单直接，但 harness 更新不如 submodule 方便。</p><h3 id="与-qodercli-集成" tabindex="-1">与 QoderCLI 集成 <a class="header-anchor" href="#与-qodercli-集成" aria-label="Permalink to &quot;与 QoderCLI 集成&quot;">​</a></h3><p>harness 设计为与 QoderCLI 天然兼容：</p><ol><li><strong>harness.md</strong> 可作为 QoderCLI 的 AGENT.md 或自定义 skill 加载</li><li><strong>workspace/</strong> 产物文件可在项目 .gitignore 中排除或按需提交</li><li><strong>knowledge/</strong> 随项目版本管理，团队共享经验</li></ol>`,145)])])}const g=i(t,[["render",p]]);export{E as __pageData,g as default};

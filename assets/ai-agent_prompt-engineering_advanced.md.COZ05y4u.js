import{_ as a,o as i,c as n,a4 as l}from"./chunks/framework.BBs01uty.js";const E=JSON.parse('{"title":"Prompt Engineering 高级技巧","description":"","frontmatter":{},"headers":[],"relativePath":"ai-agent/prompt-engineering/advanced.md","filePath":"ai-agent/prompt-engineering/advanced.md"}'),p={name:"ai-agent/prompt-engineering/advanced.md"};function t(e,s,h,k,r,d){return i(),n("div",null,[...s[0]||(s[0]=[l(`<h1 id="prompt-engineering-高级技巧" tabindex="-1">Prompt Engineering 高级技巧 <a class="header-anchor" href="#prompt-engineering-高级技巧" aria-label="Permalink to &quot;Prompt Engineering 高级技巧&quot;">​</a></h1><p>在掌握了基础技巧后,我们来学习一些更高级的Prompt Engineering技术。</p><h2 id="🎯-高级技巧概览" tabindex="-1">🎯 高级技巧概览 <a class="header-anchor" href="#🎯-高级技巧概览" aria-label="Permalink to &quot;🎯 高级技巧概览&quot;">​</a></h2><ol><li><strong>Self-Consistency</strong> - 自我一致性</li><li><strong>Tree of Thoughts</strong> - 思维树</li><li><strong>ReAct Pattern</strong> - 推理+行动</li><li><strong>Meta-Prompting</strong> - 元提示</li><li><strong>Constitutional AI</strong> - 宪法式AI</li><li><strong>Prompt Chaining</strong> - 提示链</li></ol><hr><h2 id="_1-self-consistency-自我一致性" tabindex="-1">1. Self-Consistency (自我一致性) <a class="header-anchor" href="#_1-self-consistency-自我一致性" aria-label="Permalink to &quot;1. Self-Consistency (自我一致性)&quot;">​</a></h2><h3 id="原理" tabindex="-1">原理 <a class="header-anchor" href="#原理" aria-label="Permalink to &quot;原理&quot;">​</a></h3><p>让AI多次回答同一个问题,然后选择最一致的答案。</p><h3 id="应用场景" tabindex="-1">应用场景 <a class="header-anchor" href="#应用场景" aria-label="Permalink to &quot;应用场景&quot;">​</a></h3><ul><li>复杂逻辑推理</li><li>数学计算</li><li>代码生成验证</li></ul><h3 id="实现方式" tabindex="-1">实现方式 <a class="header-anchor" href="#实现方式" aria-label="Permalink to &quot;实现方式&quot;">​</a></h3><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 第一轮</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请实现一个函数,判断字符串是否是回文:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&#39;&#39;&#39;typescript</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">function isPalindrome(s: string): boolean {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  // 你的实现</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&#39;&#39;&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 第二轮(用不同的方法)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请用另一种方法实现同样的功能:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># 第三轮(验证)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请比较以上两种实现:</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 哪种更高效?</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 哪种更易读?</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 是否有边界情况未处理?</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">基于以上分析,给出最终推荐方案。</span></span></code></pre></div><h3 id="效果" tabindex="-1">效果 <a class="header-anchor" href="#效果" aria-label="Permalink to &quot;效果&quot;">​</a></h3><p>通过多次迭代,可以发现潜在问题,提高代码质量。</p><hr><h2 id="_2-tree-of-thoughts-思维树" tabindex="-1">2. Tree of Thoughts (思维树) <a class="header-anchor" href="#_2-tree-of-thoughts-思维树" aria-label="Permalink to &quot;2. Tree of Thoughts (思维树)&quot;">​</a></h2><h3 id="原理-1" tabindex="-1">原理 <a class="header-anchor" href="#原理-1" aria-label="Permalink to &quot;原理&quot;">​</a></h3><p>让AI探索多种可能的解决路径,形成&quot;思维树&quot;,然后选择最优路径。</p><h3 id="应用场景-1" tabindex="-1">应用场景 <a class="header-anchor" href="#应用场景-1" aria-label="Permalink to &quot;应用场景&quot;">​</a></h3><ul><li>复杂问题解决</li><li>架构设计</li><li>算法优化</li></ul><h3 id="实现方式-1" tabindex="-1">实现方式 <a class="header-anchor" href="#实现方式-1" aria-label="Permalink to &quot;实现方式&quot;">​</a></h3><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">我需要设计一个前端缓存策略。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请从以下三个维度分别分析:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 路径1: 浏览器缓存</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 优势: ...</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 劣势: ...</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 适用场景: ...</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 路径2: Service Worker缓存</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 优势: ...</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 劣势: ...</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 适用场景: ...</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 路径3: CDN缓存</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 优势: ...</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 劣势: ...</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 适用场景: ...</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 综合评估</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">基于以上分析,对于电商网站的商品列表页,哪种方案最合适?</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请给出理由和具体实现建议。</span></span></code></pre></div><h3 id="效果-1" tabindex="-1">效果 <a class="header-anchor" href="#效果-1" aria-label="Permalink to &quot;效果&quot;">​</a></h3><p>避免AI陷入单一思路,获得更全面的解决方案。</p><hr><h2 id="_3-react-pattern-reasoning-acting" tabindex="-1">3. ReAct Pattern (Reasoning + Acting) <a class="header-anchor" href="#_3-react-pattern-reasoning-acting" aria-label="Permalink to &quot;3. ReAct Pattern (Reasoning + Acting)&quot;">​</a></h2><h3 id="原理-2" tabindex="-1">原理 <a class="header-anchor" href="#原理-2" aria-label="Permalink to &quot;原理&quot;">​</a></h3><p>让AI交替进行推理(Reasoning)和行动(Acting),逐步解决问题。</p><h3 id="应用场景-2" tabindex="-1">应用场景 <a class="header-anchor" href="#应用场景-2" aria-label="Permalink to &quot;应用场景&quot;">​</a></h3><ul><li>需要查阅文档的任务</li><li>调试复杂问题</li><li>多步骤任务</li></ul><h3 id="实现方式-2" tabindex="-1">实现方式 <a class="header-anchor" href="#实现方式-2" aria-label="Permalink to &quot;实现方式&quot;">​</a></h3><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请按照ReAct模式帮我调试这个问题:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">问题: React应用在某些情况下出现内存泄漏</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Thought 1: 首先需要确定泄漏的来源</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Action 1: 检查是否有未清理的定时器、事件监听器、订阅</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">AI分析代码,找出潜在问题</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Observation 1: 发现useEffect中有addEventListener但没有removeEventListener</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Thought 2: 这确实会导致内存泄漏,需要在cleanup函数中移除</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Action 2: 提供修复代码</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">AI给出修复方案</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Thought 3: 还需要检查其他组件是否有类似问题</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Action 3: 扫描整个项目的useEffect</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">...继续直到问题解决</span></span></code></pre></div><h3 id="效果-2" tabindex="-1">效果 <a class="header-anchor" href="#效果-2" aria-label="Permalink to &quot;效果&quot;">​</a></h3><p>系统性地解决问题,不会遗漏关键步骤。</p><hr><h2 id="_4-meta-prompting-元提示" tabindex="-1">4. Meta-Prompting (元提示) <a class="header-anchor" href="#_4-meta-prompting-元提示" aria-label="Permalink to &quot;4. Meta-Prompting (元提示)&quot;">​</a></h2><h3 id="原理-3" tabindex="-1">原理 <a class="header-anchor" href="#原理-3" aria-label="Permalink to &quot;原理&quot;">​</a></h3><p>让AI帮你优化prompt,或者让AI生成prompt。</p><h3 id="应用场景-3" tabindex="-1">应用场景 <a class="header-anchor" href="#应用场景-3" aria-label="Permalink to &quot;应用场景&quot;">​</a></h3><ul><li>不知道如何提问</li><li>需要标准化prompt模板</li><li>自动化prompt生成</li></ul><h3 id="实现方式-3" tabindex="-1">实现方式 <a class="header-anchor" href="#实现方式-3" aria-label="Permalink to &quot;实现方式&quot;">​</a></h3><h4 id="方式1-让ai优化prompt" tabindex="-1">方式1: 让AI优化prompt <a class="header-anchor" href="#方式1-让ai优化prompt" aria-label="Permalink to &quot;方式1: 让AI优化prompt&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">我想让AI帮我实现一个登录页面,但不知道如何写prompt。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请帮我优化以下prompt:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">原始prompt: &quot;做个登录页面&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请改进这个prompt,使其能够引导AI生成高质量的登录页面代码。</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">考虑:</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 技术栈指定</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 功能需求</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> UI/UX要求</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 安全性考虑</span></span></code></pre></div><h4 id="方式2-让ai生成prompt模板" tabindex="-1">方式2: 让AI生成prompt模板 <a class="header-anchor" href="#方式2-让ai生成prompt模板" aria-label="Permalink to &quot;方式2: 让AI生成prompt模板&quot;">​</a></h4><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">我经常需要让AI帮我做Code Review。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请为我生成一个标准化的Code Review prompt模板,包含:</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Role设定</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Review要点</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 输出格式</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 评分标准</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">模板应该可以复用于不同语言的代码review。</span></span></code></pre></div><h3 id="效果-3" tabindex="-1">效果 <a class="header-anchor" href="#效果-3" aria-label="Permalink to &quot;效果&quot;">​</a></h3><p>快速获得高质量的prompt,提高工作效率。</p><hr><h2 id="_5-constitutional-ai-宪法式ai" tabindex="-1">5. Constitutional AI (宪法式AI) <a class="header-anchor" href="#_5-constitutional-ai-宪法式ai" aria-label="Permalink to &quot;5. Constitutional AI (宪法式AI)&quot;">​</a></h2><h3 id="原理-4" tabindex="-1">原理 <a class="header-anchor" href="#原理-4" aria-label="Permalink to &quot;原理&quot;">​</a></h3><p>给AI设定一组不可违背的原则(宪法),确保其行为符合预期。</p><h3 id="应用场景-4" tabindex="-1">应用场景 <a class="header-anchor" href="#应用场景-4" aria-label="Permalink to &quot;应用场景&quot;">​</a></h3><ul><li>安全敏感的應用</li><li>需要严格遵循规范的场景</li><li>团队协作中的AI助手</li></ul><h3 id="实现方式-4" tabindex="-1">实现方式 <a class="header-anchor" href="#实现方式-4" aria-label="Permalink to &quot;实现方式&quot;">​</a></h3><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># Constitution (宪法)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">你是一个前端开发助手,必须遵守以下原则:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 安全性原则</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 永远不要硬编码敏感信息(API keys, passwords)</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 始终使用HTTPS</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 对用户输入进行验证和转义</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 质量原则</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 代码必须符合TypeScript严格模式</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 必须添加适当的错误处理</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 必须考虑性能影响</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 可维护性原则</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 代码必须有清晰的注释</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 遵循SOLID原则</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 避免过度工程化</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 响应规则</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">当被要求做违反上述原则的事情时:</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 明确指出违反了哪条原则</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 解释为什么这样做不好</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 提供符合原则的替代方案</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">---</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">现在,请基于以上constitution,帮我实现用户认证功能。</span></span></code></pre></div><h3 id="效果-4" tabindex="-1">效果 <a class="header-anchor" href="#效果-4" aria-label="Permalink to &quot;效果&quot;">​</a></h3><p>确保AI的输出始终符合团队规范和安全要求。</p><hr><h2 id="_6-prompt-chaining-提示链" tabindex="-1">6. Prompt Chaining (提示链) <a class="header-anchor" href="#_6-prompt-chaining-提示链" aria-label="Permalink to &quot;6. Prompt Chaining (提示链)&quot;">​</a></h2><h3 id="原理-5" tabindex="-1">原理 <a class="header-anchor" href="#原理-5" aria-label="Permalink to &quot;原理&quot;">​</a></h3><p>将复杂任务拆分成多个步骤,每一步的output作为下一步的input。</p><h3 id="应用场景-5" tabindex="-1">应用场景 <a class="header-anchor" href="#应用场景-5" aria-label="Permalink to &quot;应用场景&quot;">​</a></h3><ul><li>复杂的数据处理流程</li><li>多阶段的内容生成</li><li>端到端的自动化任务</li></ul><h3 id="实现方式-5" tabindex="-1">实现方式 <a class="header-anchor" href="#实现方式-5" aria-label="Permalink to &quot;实现方式&quot;">​</a></h3><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## Step 1: 需求分析</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请分析以下用户需求,提取关键功能点:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&quot;我想要一个博客系统,用户可以写文章、评论、点赞,还要有标签分类和搜索功能&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">输出格式: JSON数组,每个元素包含 { feature: string, priority: &#39;high&#39; | &#39;medium&#39; | &#39;low&#39; }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">---</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## Step 2: 数据库设计</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">基于Step 1的功能列表,设计数据库schema:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[Step 1的输出]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">输出: PostgreSQL表结构SQL</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">---</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## Step 3: API设计</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">基于Step 2的数据库设计,设计RESTful API:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[Step 2的输出]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">输出: OpenAPI spec</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">---</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## Step 4: 前端组件设计</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">基于Step 3的API,设计React组件树:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[Step 3的输出]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">输出: 组件层级结构和props定义</span></span></code></pre></div><h3 id="自动化实现" tabindex="-1">自动化实现 <a class="header-anchor" href="#自动化实现" aria-label="Permalink to &quot;自动化实现&quot;">​</a></h3><p>可以用脚本自动执行prompt chain:</p><div class="language-javascript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">javascript</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">async</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> function</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> promptChain</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">  // Step 1</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> requirements</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> await</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> llm.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">generate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(requirementsPrompt);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">  // Step 2</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> schema</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> await</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> llm.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">generate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">schemaPrompt</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(requirements));</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">  // Step 3</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> api</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> await</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> llm.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">generate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">apiPrompt</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(schema));</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">  // Step 4</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> components</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> await</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> llm.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">generate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">componentPrompt</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(api));</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> { requirements, schema, api, components };</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><h3 id="效果-5" tabindex="-1">效果 <a class="header-anchor" href="#效果-5" aria-label="Permalink to &quot;效果&quot;">​</a></h3><p>将复杂任务自动化,减少人工干预。</p><hr><h2 id="🚀-实战案例" tabindex="-1">🚀 实战案例 <a class="header-anchor" href="#🚀-实战案例" aria-label="Permalink to &quot;🚀 实战案例&quot;">​</a></h2><h3 id="案例1-用tree-of-thoughts设计架构" tabindex="-1">案例1: 用Tree of Thoughts设计架构 <a class="header-anchor" href="#案例1-用tree-of-thoughts设计架构" aria-label="Permalink to &quot;案例1: 用Tree of Thoughts设计架构&quot;">​</a></h3><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">我需要为一个日活10万的电商网站设计前端架构。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请从以下三个角度分别分析:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 方案A: 传统SPA (React Router)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**优势:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 开发简单,生态成熟</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> SEO可以通过SSR解决</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**劣势:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 首屏加载慢</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 大量路由时bundle体积大</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**适用场景:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 中小型应用</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> SEO要求不高</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 方案B: Micro-Frontends</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**优势:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 团队独立开发</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 技术栈灵活</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**劣势:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 复杂度高</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 共享状态困难</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**适用场景:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 大型团队</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 多业务线</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 方案C: Islands Architecture (Astro)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**优势:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 极致的性能</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 按需加载JS</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**劣势:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生态较新</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 学习成本</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**适用场景:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 内容为主的网站</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 性能要求极高</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 决策</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">对于我们的场景(日活10万电商,5人前端团队,SEO重要):</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**推荐方案:**</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 方案A (SPA) + SSR (Next.js)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**理由:**</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">1.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 团队规模适中,不需要micro-frontends的复杂度</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">2.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> SEO重要,Next.js的SSR开箱即用</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">3.</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> 生态成熟,招聘容易</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-light-font-weight:bold;--shiki-dark:#E1E4E8;--shiki-dark-font-weight:bold;">**实施计划:**</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span><span style="--shiki-light:#032F62;--shiki-light-text-decoration:underline;--shiki-dark:#DBEDFF;--shiki-dark-text-decoration:underline;">详细计划</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span></code></pre></div><h3 id="案例2-用react-pattern调试" tabindex="-1">案例2: 用ReAct Pattern调试 <a class="header-anchor" href="#案例2-用react-pattern调试" aria-label="Permalink to &quot;案例2: 用ReAct Pattern调试&quot;">​</a></h3><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">请用ReAct模式帮我解决这个性能问题:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">问题: 商品列表页滚动卡顿</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Thought 1: 首先确认瓶颈在哪里</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Action 1: 使用React DevTools Profiler分析组件渲染</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Observation 1: ProductList组件每次滚动都重新渲染,耗时200ms</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Thought 2: 可能是props变化导致的重渲染</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Action 2: 检查ProductList的props</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Observation 2: 父组件传递了一个新的array引用给products prop</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Thought 3: 这就是问题所在!需要用useMemo稳定引用</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">Action 3: 提供修复代码</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">\`\`\`typescript</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 修复前</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> filteredProducts</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> products.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">filter</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">...</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 修复后</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> filteredProducts</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> useMemo</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(() </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=&gt;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  products.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">filter</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">...</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">), </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  [products, filter]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span></code></pre></div><p>Thought 4: 还可以进一步优化,使用虚拟列表 Action 4: 建议使用react-window</p><p>最终方案:</p><ol><li>用useMemo稳定props引用</li><li>用react-window实现虚拟滚动</li><li>图片懒加载</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span></span></span>
<span class="line"><span>### 案例3: 用Prompt Chaining生成CRUD</span></span>
<span class="line"><span></span></span>
<span class="line"><span>\`\`\`markdown</span></span>
<span class="line"><span>## Chain: 从数据库表到完整CRUD</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Prompt 1: 生成TypeScript类型</span></span></code></pre></div><p>基于以下PostgreSQL表结构,生成TypeScript interface:</p><p>CREATE TABLE users ( id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, name VARCHAR(100), created_at TIMESTAMP DEFAULT NOW() );</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span></span></span>
<span class="line"><span>Output:</span></span>
<span class="line"><span>\`\`\`typescript</span></span>
<span class="line"><span>interface User {</span></span>
<span class="line"><span>  id: number;</span></span>
<span class="line"><span>  email: string;</span></span>
<span class="line"><span>  name?: string;</span></span>
<span class="line"><span>  createdAt: Date;</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="prompt-2-生成api-endpoints" tabindex="-1">Prompt 2: 生成API endpoints <a class="header-anchor" href="#prompt-2-生成api-endpoints" aria-label="Permalink to &quot;Prompt 2: 生成API endpoints&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>基于User interface,生成Express.js CRUD endpoints:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[User interface]</span></span></code></pre></div><p>Output: Express routes</p><h3 id="prompt-3-生成react-hooks" tabindex="-1">Prompt 3: 生成React hooks <a class="header-anchor" href="#prompt-3-生成react-hooks" aria-label="Permalink to &quot;Prompt 3: 生成React hooks&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>基于API endpoints,生成React Query hooks:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[API endpoints]</span></span></code></pre></div><p>Output: useUsers, useUser, useCreateUser, etc.</p><h3 id="prompt-4-生成ui组件" tabindex="-1">Prompt 4: 生成UI组件 <a class="header-anchor" href="#prompt-4-生成ui组件" aria-label="Permalink to &quot;Prompt 4: 生成UI组件&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>基于hooks,生成完整的用户管理页面:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[hooks]</span></span></code></pre></div><p>Output: 完整的React组件</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span></span></span>
<span class="line"><span>---</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 📊 技巧对比</span></span>
<span class="line"><span></span></span>
<span class="line"><span>| 技巧 | 适用场景 | 复杂度 | 效果 |</span></span>
<span class="line"><span>|------|---------|--------|------|</span></span>
<span class="line"><span>| Self-Consistency | 验证答案正确性 | 低 | ⭐⭐⭐ |</span></span>
<span class="line"><span>| Tree of Thoughts | 多方案对比 | 中 | ⭐⭐⭐⭐ |</span></span>
<span class="line"><span>| ReAct Pattern | 调试/问题解决 | 中 | ⭐⭐⭐⭐⭐ |</span></span>
<span class="line"><span>| Meta-Prompting | Prompt优化 | 低 | ⭐⭐⭐ |</span></span>
<span class="line"><span>| Constitutional AI | 规范化输出 | 中 | ⭐⭐⭐⭐ |</span></span>
<span class="line"><span>| Prompt Chaining | 复杂任务自动化 | 高 | ⭐⭐⭐⭐⭐ |</span></span>
<span class="line"><span></span></span>
<span class="line"><span>---</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 🎓 最佳实践</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 1. 组合使用技巧</span></span>
<span class="line"><span></span></span>
<span class="line"><span>不要只用一种技巧,而是根据场景组合:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>\`\`\`markdown</span></span>
<span class="line"><span># 示例: 用Constitutional + Tree of Thoughts设计系统</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## Constitution</span></span>
<span class="line"><span>你必须遵守:</span></span>
<span class="line"><span>- 安全性第一</span></span>
<span class="line"><span>- 性能优先</span></span>
<span class="line"><span>- 可维护性</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## Tree of Thoughts</span></span>
<span class="line"><span>请从以下三个方案中选择:</span></span>
<span class="line"><span>- 方案A: ...</span></span>
<span class="line"><span>- 方案B: ...</span></span>
<span class="line"><span>- 方案C: ...</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## Self-Consistency</span></span>
<span class="line"><span>对选定的方案,请用两种不同方法验证其可行性。</span></span></code></pre></div><h3 id="_2-建立prompt库" tabindex="-1">2. 建立Prompt库 <a class="header-anchor" href="#_2-建立prompt库" aria-label="Permalink to &quot;2. 建立Prompt库&quot;">​</a></h3><p>将常用的prompt保存为模板:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>prompts/</span></span>
<span class="line"><span>├── code-review.md</span></span>
<span class="line"><span>├── bug-fix.md</span></span>
<span class="line"><span>├── feature-design.md</span></span>
<span class="line"><span>└── refactoring.md</span></span></code></pre></div><h3 id="_3-持续优化" tabindex="-1">3. 持续优化 <a class="header-anchor" href="#_3-持续优化" aria-label="Permalink to &quot;3. 持续优化&quot;">​</a></h3><p>记录哪些prompt效果好,哪些不好:</p><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># Prompt Performance Log</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## Prompt: Code Review Template</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Used: 50 times</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Success rate: 90%</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Issues: 有时会过于strict</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Improvement: 添加severity级别</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## Prompt: Bug Fix Assistant</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Used: 30 times</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Success rate: 75%</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Issues: 有时找不到root cause</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Improvement: 加入ReAct pattern</span></span></code></pre></div><hr><h2 id="🔗-延伸阅读" tabindex="-1">🔗 延伸阅读 <a class="header-anchor" href="#🔗-延伸阅读" aria-label="Permalink to &quot;🔗 延伸阅读&quot;">​</a></h2><ul><li><a href="./basics.html">Prompt Engineering Basics</a> - 基础技巧回顾</li><li><a href="./../harness-engineering/core-concepts.html">Harness Engineering</a> - 超越Prompt Engineering</li><li><a href="https://js.langchain.com/" target="_blank" rel="noreferrer">LangChain Documentation</a> - Prompt Chain的实现库</li></ul><hr><h2 id="💬-总结" tabindex="-1">💬 总结 <a class="header-anchor" href="#💬-总结" aria-label="Permalink to &quot;💬 总结&quot;">​</a></h2><p>高级Prompt Engineering的核心:</p><ol><li><strong>系统性思考</strong> - 不只是单次交互,而是设计完整的对话流程</li><li><strong>多路径探索</strong> - 让AI探索多种可能性,而不是单一答案</li><li><strong>自动化思维</strong> - 用prompt chain实现复杂任务的自动化</li><li><strong>质量控制</strong> - 用constitution和自我验证确保输出质量</li></ol><p>记住:<strong>Prompt Engineering不是魔法,而是一种工程化思维。</strong></p><p>下一步: 学习 <a href="./../rag/introduction.html">RAG (Retrieval Augmented Generation)</a>,了解如何给AI添加知识库。</p>`,108)])])}const c=a(p,[["render",t]]);export{E as __pageData,c as default};

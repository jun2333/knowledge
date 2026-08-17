# Prompt Engineering 基础

Prompt Engineering(提示工程)是AI开发的第一层工程化思维,专注于如何通过优化与LLM的交互方式,获得更高质量的回答。

## 🎯 为什么需要 Prompt Engineering?

同样的问题,不同的问法会得到完全不同的答案:

```
❌ Bad Prompt:
"帮我写个登录功能"

✅ Good Prompt:
"用React + TypeScript实现一个用户登录表单,要求:
- 邮箱和密码验证
- 错误提示
- 加载状态
- 使用antd组件库
给出完整代码示例"
```

**核心目标**: 让AI理解你的真实需求,减少来回沟通成本。

---

## 📋 Prompt 的基本结构

一个好的Prompt通常包含以下要素:

### 1. Role (角色设定)

告诉AI它应该扮演什么角色:

```markdown
你是一位资深前端工程师,精通React和TypeScript。
```

**作用**: 让AI调整回答的专业程度和风格。

### 2. Context (背景信息)

提供足够的上下文:

```markdown
我正在开发一个电商网站的用户系统,需要实现登录功能。
技术栈: React 18 + TypeScript + Ant Design
```

**作用**: 让AI的回答更贴合你的实际场景。

### 3. Task (任务描述)

清晰描述你要做什么:

```markdown
请实现一个登录表单组件,包含:
1. 邮箱输入框
2. 密码输入框
3. 登录按钮
4. 表单验证
```

**作用**: 明确任务范围和要求。

### 4. Constraints (约束条件)

说明限制和要求:

```markdown
要求:
- 使用函数式组件 + Hooks
- 使用antd的Form组件
- 邮箱格式验证
- 密码至少8位
- 提交时显示loading状态
```

**作用**: 避免AI给出不符合要求的方案。

### 5. Output Format (输出格式)

指定你想要的输出形式:

```markdown
请提供:
1. 完整的TypeScript代码
2. 关键逻辑的注释
3. 使用示例
```

**作用**: 让AI的输出更易用。

---

## 💡 常用技巧

### 技巧1: Few-Shot Learning (少样本学习)

给AI几个例子,让它模仿:

```markdown
请按照以下格式生成API接口文档:

示例1:
接口: 获取用户信息
URL: GET /api/user/:id
参数: id - 用户ID
返回: { name: string, email: string }

示例2:
接口: 更新用户信息
URL: PUT /api/user/:id
参数: id - 用户ID, data - 更新数据
返回: { success: boolean }

现在请生成"删除用户"接口的文档:
```

**原理**: AI会学习例子的格式和风格,生成类似的内容。

### 技巧2: Chain of Thought (思维链)

引导AI逐步思考:

```markdown
请一步步分析这个问题:

1. 首先,理解需求是什么
2. 然后,分析可能的解决方案
3. 接着,比较各方案的优缺点
4. 最后,给出推荐方案和理由

问题: 如何实现前端权限控制?
```

**效果**: AI会给出更系统、更全面的分析。

### 技巧3: Role Prompting (角色扮演)

让AI扮演特定角色:

```markdown
你是一位有10年经验的前端架构师,正在review junior developer的代码。
请指出以下代码的问题并给出改进建议:

[代码]
```

**效果**: AI会以更专业的视角分析问题。

### 技巧4: Delimiters (分隔符)

用特殊符号区分不同部分:

```markdown
请重构以下代码,使其更符合React最佳实践:

'''javascript
function App() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);
  
  return <div>{data ? data.name : 'loading...'}</div>;
}
'''

要求:
1. 添加错误处理
2. 添加loading状态
3. 提取自定义hook
```

**常用分隔符**: `'''`, `"""`, `---`, `===`

### 技巧5: Temperature Control (温度控制)

通过设置temperature控制创造性:

```
temperature = 0: 确定性高,适合代码生成、数学计算
temperature = 0.7: 平衡,适合一般对话
temperature = 1.0: 创造性高,适合头脑风暴
```

**注意**: 不是所有API都支持这个参数。

---

## 🚫 常见错误

### 错误1: 太模糊

```
❌ "帮我做个网站"
✅ "用Next.js + Tailwind CSS做一个个人博客首页,包含导航栏、文章列表、页脚"
```

### 错误2: 一次性问太多

```
❌ "帮我实现登录、注册、找回密码、用户中心、订单管理..."
✅ 拆分成多个小任务,逐个实现
```

### 错误3: 不提供上下文

```
❌ "这个报错了怎么修?"
✅ "React项目中,useEffect里调用setState报错: Can't perform a React state update on an unmounted component. 代码如下: [代码]"
```

### 错误4: 不让AI思考

```
❌ "直接给我代码"
✅ "请先分析需求,然后给出实现方案,最后提供代码"
```

---

## 📝 实用模板

### 模板1: 代码生成

```markdown
# Role
你是一位{语言/框架}专家

# Context
我在开发{项目类型},需要实现{功能}

# Task
请实现{具体功能}

# Requirements
- 技术要求: {技术栈}
- 功能要求: {功能列表}
- 质量要求: {代码规范}

# Output
请提供:
1. 完整代码
2. 关键逻辑注释
3. 使用示例
```

### 模板2: 代码Review

```markdown
# Role
你是一位资深{语言/框架}工程师

# Task
请review以下代码,指出:
1. 潜在bug
2. 性能问题
3. 可维护性问题
4. 安全漏洞

# Code
'''
{代码}
'''

# Output Format
请按优先级列出问题,并给出修复建议
```

### 模板3: 技术方案设计

```markdown
# Context
我需要实现{功能},背景是{项目背景}

# Requirements
- 功能性需求: {列表}
- 非功能性需求: {性能、安全性等}
- 技术约束: {技术栈、兼容性等}

# Task
请设计技术方案,包括:
1. 架构设计
2. 技术选型及理由
3. 关键实现细节
4. 风险评估
5. 替代方案对比

# Output
请用结构化方式呈现,便于团队讨论
```

---

## 🎓 实战练习

### 练习1: 优化这个Prompt

**原始Prompt:**
```
"帮我写个TODO应用"
```

**优化后:**
```markdown
你是一位React专家。

请帮我实现一个TODO应用,要求:
- 使用React 18 + TypeScript
- 功能: 添加、删除、标记完成、筛选
- 使用localStorage持久化
- 使用Tailwind CSS美化
- 响应式设计

请提供:
1. 完整的组件代码
2. 类型定义
3. 关键功能的实现说明
```

### 练习2: 调试问题

**差的问法:**
```
"我的代码不工作了"
```

**好的问法:**
```markdown
我在React项目中遇到一个问题:

现象: 点击按钮后,state更新了但UI没有重新渲染

环境: React 18, TypeScript

相关代码:
'''typescript
const [items, setItems] = useState<Item[]>([]);

const addItem = () => {
  items.push({ id: Date.now(), text: 'new' });
  setItems(items);
};
'''

我已经尝试:
1. 检查console,没有报错
2. 确认state确实更新了

请问可能的原因是什么?如何修复?
```

---

## 🔗 延伸阅读

- [Advanced Prompt Engineering](./advanced.md) - 高级技巧
- [Harness Engineering](../harness-engineering/core-concepts.md) - 超越Prompt Engineering
- [Spec-First Overview](/ai-agent/spec-first/guide) - Spec-First方法论

---

## 💬 总结

Prompt Engineering的核心思想:

1. **明确** - 清楚表达你的需求
2. **具体** - 提供足够的上下文和约束
3. **结构化** - 使用模板和分隔符
4. **迭代** - 根据结果不断优化prompt

记住:**AI不是读心术士,你需要清楚地告诉它你想要什么。**

下一步: 学习 [Advanced Prompt Engineering](./advanced.md),掌握更高级的技巧。

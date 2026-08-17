# Python 基础语法速成（前端视角）

> 为有 JS/TS 基础的人写的 Python 速成，只覆盖 **AI 生态脚本里用得上的子集**。学完能读懂、能改写 Pandas / OpenAI SDK / LangChain 的示例代码即可。
>
> 运行方式：`python3 xxx.py`，或装个 VS Code Python 插件直接跑。

## 变量与基本类型

Python 是动态类型，不需要声明类型（可加类型注解，见后文）：

```python
name = "python"      # 字符串（没有 const，靠约定：全大写 = 常量）
age = 30             # 数字（int / float 统一是 number）
ok = True            # 布尔（注意首字母大写 True/False）
tags = ["rag", "llm"]  # 列表（相当于数组）
info = {"name": "kimi", "model": "moonshot-v1"}  # 字典（相当于对象）

# 与 JS 的差异
# - null/undefined 统一是 None
# - 字符串只有双引号/单引号，没有反引号模板字符串，用 f-string
print(f"name={name}, age={age}")  # f-string 相当于模板字符串
```

常用内置类型：

| JS | Python | 说明 |
|----|--------|------|
| `null` / `undefined` | `None` | 判断用 `is None` |
| 对象 `{}` | 字典 `{}` | `d["key"]` 或 `d.get("key")` |
| 数组 `[]` | 列表 `[]` | 也有元组 `(1, 2)`（不可变）、集合 `{1, 2}` |
| 布尔 | `True` / `False` | 首字母大写 |
| — | `len(x)` | 通用长度函数，相当于 `x.length` |

## 列表与字典操作

```python
tags = ["rag", "llm"]

tags.append("agent")      # push
tags[0]                   # "rag"
"rag" in tags             # true，相当于 includes

info = {"name": "kimi"}
info["model"] = "v1"      # 增改
info.get("api_key", None) # 安全取值，带默认值（JS 的 ?. 加 ??）
for k, v in info.items(): # 遍历键值对
    print(k, v)
```

## 条件与循环

```python
# if / elif / else（没有 switch，也没有三元 ?:，但有一行表达式）
score = 85
if score >= 90:
    level = "A"
elif score >= 80:
    level = "B"
else:
    level = "C"

level2 = "A" if score >= 90 else "B"   # 相当于三元表达式

# for 循环（没有 C 风格 for）
for i in range(3):        # 0, 1, 2
    print(i)

for tag in tags:
    print(tag)
```

## 函数

```python
def chat(question, model="gpt-4o-mini", **kwargs):
    # 默认参数（相当于 model = "..." 默认值）
    # **kwargs 收集多余关键字参数（相当于 rest 参数）
    print(question, model, kwargs)
    return "answer"       # 没有 return 时返回 None

chat("你好")
chat("你好", "gpt-4o", temperature=0.5)

# lambda 相当于箭头函数，常在排序/过滤里用
items = [{"len": 3}, {"len": 1}]
items.sort(key=lambda x: x["len"])
```

## 类（够用即可）

```python
class Document:
    def __init__(self, title, content):   # 构造函数，self 相当于 this
        self.title = title                # 属性直接用 self.xxx
        self.content = content

    def summary(self):                    # 方法第一个参数必须是 self
        return f"{self.title}: {self.content[:20]}"

doc = Document("闭包", "函数内返回函数……")
print(doc.summary())
```

## 模块导入

```python
# 相当于 import / require
import json                     # 内置库
from openai import OpenAI       # 从包导入具体名字（相当于解构）
import pandas as pd             # 起别名（相当于 import pandas as pd）

# 使用
data = json.load(open("config.json"))
client = OpenAI()
```

## 异步：asyncio

AI 场景里大量代码是异步的（调 API、下载模型）。核心是 **async/await，和 JS 一模一样**，区别是入口要手动跑事件循环：

```python
import asyncio

async def fetch_llm(question):
    # 这里换成真实的 API 调用
    await asyncio.sleep(1)      # await 相当于 JS 的 await
    return f"answer for {question}"

async def main():
    results = await asyncio.gather(   # 相当于 Promise.all
        fetch_llm("q1"),
        fetch_llm("q2"),
    )
    print(results)

asyncio.run(main())   # JS 里 main() 直接跑，Python 需要 asyncio.run 启动
```

> 记不住别的没关系，记住：`async def` + `await` + `asyncio.run(main())` 就能读写大部分 AI 脚本。

## 类型注解（可选）

Python 3 支持类似 TS 的注解，**运行时不影响，纯提示用**：

```python
def encode(text: str, model: str = "bge") -> list[float]:
    # -> list[float] 表示返回浮点列表
    return [0.1, 0.2]
```

配合 `mypy` / IDE 有补全提示，但不像 TS 那样编译期检查，写脚本时不必强求。

## AI 脚本必会的 4 个语法糖

### 1. 列表推导式（相当于 map + filter）

```python
titles = [d["title"] for d in docs if d["title"]]
# 等价于 docs.filter(d => d.title).map(d => d.title)
```

### 2. with 上下文管理器（自动关闭资源）

```python
with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()
# 出 with 块自动关闭，相当于 try-finally 的语法糖
```

### 3. if __name__ == "__main__"（区分"被导入"和"直接运行"）

```python
def main():
    print("run")

if __name__ == "__main__":
    main()          # 只有直接运行本文件才执行；被 import 时不执行
```

### 4. 装饰器（@ 语法，类似把函数包一层）

```python
import time

def timer(func):                    # 装饰器 = 接收函数返回函数的函数
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"耗时 {time.time() - start:.2f}s")
        return result
    return wrapper

@timer                           # 相当于 build_index = timer(build_index)
def build_index():
    time.sleep(1)
```

## 一个综合小例子

把前面所有知识点串起来，模拟"读配置 → 批量处理 → 输出结果"：

```python
import json

def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def process_items(items: list[dict]) -> list[str]:
    return [f"{it['title']}({it['score']})" for it in items if it["score"] >= 60]

def main():
    cfg = load_config("config.json")
    results = process_items(cfg["items"])
    for r in results:
        print(r)

if __name__ == "__main__":
    main()
```

## 学习建议

- **不要背语法**，直接改着跑《Python AI 生态入门》里的 4 个示例，遇到不懂的查本文
- 写 Python 脚本的第一原则：**缩进是语法**（4 空格），混用 tab/空格会直接报错
- 报错看最后一行 `TypeError / ValueError / FileNotFoundError`，和 JS 看栈底同理
- 优先用 `print()` 调试，不用 `console.log` 思维，够用

# CSS 模块化

CSS 模块化用于解决样式全局污染、命名混乱、代码冗余等问题。

---

## CSS Modules

CSS Modules 通过编译时为每个类名生成唯一标识符，实现样式隔离。

```css
/* Button.module.css */
.button {
  background: blue;
  color: white;
}

.primary {
  background: darkblue;
}
```

```jsx
import styles from './Button.module.css';

function Button({ variant = 'primary', children }) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  );
}
```

**编译后**：

```css
/* 生成的唯一类名 */
.Button_button__abc123 {
  background: blue;
  color: white;
}

.Button_primary__def456 {
  background: darkblue;
}
```

### 最佳实践：组合方案

1. **组件样式** — 使用 less/scss + CSS Module 解决方案，也可以和 classnames 库（动态类名）配合使用
2. **全局样式** — 直接用 css（如 reset.css、全局变量）

```jsx
import classNames from 'classnames';
import styles from './Button.module.css';

function Button({ variant, size, disabled, children }) {
  const className = classNames(styles.button, {
    [styles[variant]]: variant,
    [styles[size]]: size,
    [styles.disabled]: disabled,
  });

  return <button className={className}>{children}</button>;
}
```

---

## CSS-in-JS

以 JS 的方式写样式，例如 styled-components 库。

```jsx
import styled from 'styled-components';

const Button = styled.button`
  background: ${props => props.primary ? 'blue' : 'white'};
  color: ${props => props.primary ? 'white' : 'blue'};
  border: 2px solid blue;
  border-radius: 4px;
  padding: 8px 16px;

  &:hover {
    opacity: 0.8;
  }
`;

// 使用
<Button primary>按钮</Button>
```

### 特点

1. **彻底隔离** — CSS-in-JS 本质上放弃了 css，变成了 css-in-line 形式，从根本上解决了全局污染、样式混乱等问题
2. **灵活** — 运用 JS 特性，更灵活地实现样式继承、动态添加样式等场景
3. **模块化友好** — 编译器对 JS 模块化支持度更高，使得可以在项目中更快地找到样式文件
4. **无需额外配置** — 无须 webpack 额外配置 css、less 等文件类型

### 注意

虽然运用灵活，但是写样式不如 css 灵活，由于样式用 JS 写，所以无法像 css 写样式那样可以支持语法高亮、样式自动补全等。所以要更加注意一些样式单词拼错的问题。

---

## Tailwind CSS

Tailwind CSS 是一个原子化 CSS 框架，提供预定义的实用类。

```jsx
function Button({ variant = 'primary', children }) {
  return (
    <button className={`
      px-4 py-2 rounded
      ${variant === 'primary'
        ? 'bg-blue-500 text-white hover:bg-blue-600'
        : 'bg-white text-blue-500 border border-blue-500'}
    `}>
      {children}
    </button>
  );
}
```

### 特点

1. **无需命名** — 不需要想类名，直接使用预定义类
2. **样式即文档** — 类名本身就是样式的描述
3. **生产构建优化** — 自动移除未使用的样式，最终 CSS 体积很小
4. **设计系统** — 内置间距、颜色、字体等设计 token

### 与 React 配合

```jsx
// 使用 clsx 或 classnames 管理动态类名
import clsx from 'clsx';

function Button({ variant, size, className, children }) {
  return (
    <button className={clsx(
      'px-4 py-2 rounded font-medium',
      {
        'bg-blue-500 text-white': variant === 'primary',
        'bg-white text-blue-500 border': variant === 'secondary',
        'px-2 py-1 text-sm': size === 'sm',
        'px-6 py-3 text-lg': size === 'lg',
      },
      className
    )}>
      {children}
    </button>
  );
}
```

---

## 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **CSS Modules** | 样式隔离、学习成本低 | 需要配置、类名组合复杂 | 传统项目、团队熟悉 CSS |
| **CSS-in-JS** | 完全隔离、动态样式灵活 | 运行时开销、无语法高亮 | 组件库、需要动态主题 |
| **Tailwind CSS** | 无需命名、构建优化好 | 类名冗长、需要学习类名 | 新项目、快速原型 |

### 选择建议

- **新项目** — 推荐 Tailwind CSS，开发效率高，构建优化好
- **组件库** — 推荐 CSS-in-JS（如 styled-components），动态样式灵活
- **传统项目** — CSS Modules 是稳妥选择，学习成本低
- **混合使用** — 全局样式用 CSS，组件样式用 Tailwind 或 CSS Modules

---

## QA

### 原子化 CSS 类名很多会影响浏览器渲染性能吗？

**结论：几乎不影响，可以忽略不计。**

**浏览器层面**：
- 类名选择器是哈希查找，O(1) 复杂度
- 100 个类和 1000 个类的查找时间差异可以忽略
- CSS 解析是浏览器高度优化的部分

**实际数据**：
- 小型应用：200-500 个类名
- 中型应用：500-1500 个类名
- 大型应用：1500-3000+ 个类名

**原子化 CSS 反而有优势**：
- 每个类名只定义一次，CSS 文件更小
- 全是简单类名选择器，匹配最快
- 高复用性，浏览器缓存效率高

**真正的性能瓶颈**：
1. 复杂选择器（如 `div > ul li:first-child .btn:hover`）← 影响大
2. CSS 文件体积（需要下载解析）← 影响中
3. 布局重排（修改尺寸/位置）← 影响中
4. 类名数量 ← 几乎无影响

**总结**：几百个类名在原子化 CSS 中是正常且健康的，不用担心这个，把精力放在更有价值的优化上。

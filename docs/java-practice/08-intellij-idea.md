# IntelliJ IDEA 使用指南（Java 后端实战版）

> **目标**：用最短时间学会 IDEA 里日常写 Java 后端必需的操作。按"学习计划用得上"来组织，不铺开所有功能。
>
> **适合**：从 VS Code 转过来了的人。IDEA 和 VS Code 的对应关系会标出来。

## 一、IDEA vs VS Code（先建立对应关系）

| 你熟悉的 VS Code | IDEA 对应 |
|------------------|-----------|
| 侧边栏资源管理器 | 左侧 Project 面板（Cmd+1） |
| Cmd+P 打开文件 | **Cmd+Shift+O**（找文件）/ **Cmd+O**（找类） |
| Cmd+F 当前文件搜索 | 相同 |
| Cmd+Shift+F 全局搜索 | **Cmd+Shift+F**（跨文件搜索代码）/ **Double Shift**（搜索一切） |
| 点击函数名跳定义 | **Cmd+点击** 或 **Cmd+B** |
| 调试断点 | 相同（行号左侧点红点） |
| 终端 | 底部 Terminal 标签页 |
| 插件市场 | Settings → Plugins |

> 最大差异：IDEA 对 Java 的理解更深。**Cmd+点击能直接跳到 Spring Bean 的声明、Mapper 的 XML、甚至 `@Autowired` 注入的实现类**，这是 VS Code 做不到的，也是你读 mall 源码的最强武器。

## 二、打开和配置项目

### 打开 Maven 项目

1. `File → Open` 选 mall 根目录
2. IDEA 识别到 `pom.xml` 会自动开始 **导入 Maven 依赖**（右下角转圈）
3. 首次导入要等依赖下载完（走了阿里云镜像会快），**没下完就运行会报"找不到类"**

> 手动刷新依赖：右侧 **Maven 工具窗口**（侧边栏 M 图标）→ 点刷新按钮（↻）。

### 配置 JDK（Project Structure）

```
File → Project Structure…（Cmd + ;）→ Project → SDK
```

- SDK 下拉 → `Add JDK…` → 选 JDK 目录（如 `~/Library/Java/JavaVirtualMachines/zulu17.../Contents/Home`）
- **Language level** 要和 SDK 匹配（JDK 17 就选 17）
- 一个 IDEA 窗口只能同时跑一个 Project 的 SDK，但**机器上装多个 JDK 可以随时切换**（mall 用 17，如果你以后写 JDK 8 的老项目切回去就行）

> 报"源发行版 xx 需要目标发行版 xx" = 项目的 Language level 和编译 JDK 不一致，去这里改。

## 三、运行和调试（核心技能）

### 运行 Spring Boot 应用

- 打开主类（`MallAdminApplication`），点 `main` 方法左边的**绿色三角 ▶** → `Run`
- 或者点虫子图标（Debug）——**平时都用 Debug 跑**，这样能随时打断点

### 打断点调试（读代码必备）

1. 在想停的行号左侧**点红点**
2. 用 **Debug** 启动（不是 Run）
3. 请求进来自动停在断点，看底部 **Debugger 面板**：

| 操作 | 快捷键 | 作用 |
|------|--------|------|
| Step Over | **F8** | 执行当前行，不进入方法（快速过） |
| Step Into | **F7** | 进入方法内部（跟链路） |
| Step Out | **Shift+F8** | 跳出当前方法 |
| Resume | **Cmd+Option+R** | 跑到下一个断点 |
| 停下 | 点红色方块 ■ | 终止程序 |

4. 右侧 **Variables** 窗口看当前所有变量值；鼠标悬停变量也能看

> **读 mall 的正确姿势**：在 `UmsAdminServiceImpl.login()` 打断点 → 用 Swagger 调登录 → F8 单步 → 亲眼看到数据怎么流。比看代码猜快十倍。

### 条件断点（进阶）

右键红点 → 填条件（如 `username.equals("admin")`），只有满足条件才停。调试循环/列表时超好用。

## 四、读代码的五件武器

**1. Cmd+点击 / Cmd+B：跳转到定义**（VS Code 也有，但 IDEA 更智能）
- 点 `adminService.login(...)` → 直接跳到 `UmsAdminServiceImpl.login()` 实现
- 点 `PmsProductMapper` 的方法 → 能跳到 `PmsProductMapper.xml` 的 SQL

**2. Cmd+Alt+B：跳转实现类**
- 光标放在接口方法上 → 列出所有实现，选一个跳转（如 `PmsProductService` → 找实现类）

**3. Double Shift：搜索一切**
- 输类名/文件名/方法名/设置项，全能搜。比在文件树里翻快得多

**4. Cmd+F / Cmd+Shift+F：当前文件 / 全局搜索**
- 全局搜关键词（如 `secure.ignored.urls`、`@Transactional`），快速定位代码

**5. Cmd+P：查看方法参数**
- 在方法调用处按 Cmd+P，显示参数列表，不用跳进方法也能知道传什么

**6. 红/绿色高亮 + Alt+Enter：错误提示**
- 代码报错会红色波浪线，**光标放上去按 Alt+Enter**，IDEA 会给出修复建议/导入缺失类

> 建议记熟前 4 个，读 mall 就够用了。

## 五、Maven 工具窗口

右侧边栏点 **M** 图标（Maven 窗口）：

- **Lifecycle**：`clean`（清编译产物）、`package`（打包 jar）、`install`（装进本地仓库）
- **Plugins**：spring-boot 相关插件
- 展开每个模块（mall-admin、mall-common…）都能单独操作
- 顶部 ↻ 刷新按钮：pom.xml 改了依赖后点它重新加载

> 日常开发：依赖有问题先点刷新；打包用 `package`（输出在 `target/` 目录）。

## 六、数据库连接（看库数据）

> 注意：IDEA **社区版没有 Database 面板**（那是旗舰版 Ultimate 的功能，你装的是社区版）。看库数据有三个方案：

**方式一：命令行（最简，零安装）**
```bash
docker exec -it mysql8 mysql -uroot -proot mall
show tables;                              # 看所有表
select * from ums_admin;                  # 查 admin 表数据
```

**方式二：DBeaver（免费 GUI，推荐日常用）**

> 安装注意：`brew install --cask dbeaver-community` 在国内网络会卡死（安装包托管在 GitHub releases）。实测可用的安装方式：

```bash
# 1. 从官方 GitHub 加速代理下载（ghfast.top 等，速度可达 10MB/s+）
# 先查最新版本号，以 26.1.5 为例（Apple Silicon 用 aarch64 包）：
curl -L -o ~/Downloads/dbeaver-ce.dmg \
  "https://ghfast.top/https://github.com/dbeaver/dbeaver/releases/download/26.1.5/dbeaver-ce-26.1.5-macos-aarch64.dmg"
# 2. 挂载安装
hdiutil attach ~/Downloads/dbeaver-ce.dmg -nobrowse
cp -R "/Volumes/DBeaver Community/DBeaver.app" /Applications/
hdiutil detach "/Volumes/DBeaver Community"
```

安装后用 `New Connection → MySQL` 建连接（Host `localhost` / Port `3306` / Database `mall` / User `root` / Password `root`）。能看表结构、跑 SQL、双击看数据。首次连接需下载 MySQL 驱动（从 Maven 仓库），失败的话在 `Preferences → Drivers → MySQL → Edit → Maven` 里加阿里云镜像。

**方式三：VS Code Database 插件**（你熟 VS Code 的话）：装 `Database Client` 之类的插件，同样填上面的连接信息。

> 配合调试：在代码里看到某张表，切到数据库工具查数据，理解代码在操作什么。

## 七、终端和 Git

- **底部 Terminal 标签页**：内置终端，直接 `docker ps`、`mvn` 都能跑
- **Git 集成**：右侧 Git 面板看 diff；文件右键 → Git → Commit；IDEA 会标出改动的文件（蓝色=改过，绿色=新增）
- 提交前在底部 `Git` 工具窗口检查 diff，别把无关文件提交了

## 八、常见问题

**Q：运行报"找不到主类"？**
A：Project Structure → Modules 确认当前模块被标记为 sources；或 Maven 窗口对模块执行 `clean` 后再 `compile`。

**Q：代码全是红色报错但 Maven 依赖明明有？**
A：Maven 窗口点刷新 ↻ 重新导入；还不行就 `File → Invalidate Caches...` 清缓存重启。

**Q：Maven 下载依赖很慢/失败？**
A：确认 `~/.m2/settings.xml` 配了阿里云镜像（本项目环境已配好）；失败多是网络问题，再点一次刷新。

**Q：字体太小/主题不习惯？**
A：`Settings（Cmd+,）→ Appearance & Behavior` 调主题字号；`Editor → Font` 调代码字号。

## 九、学习计划中怎么用它

| 阶段 | IDEA 用法 |
|------|----------|
| 阶段 1 | Debug + F8 走登录链路；Double Shift 找类 |
| 阶段 2 | Cmd+点击 跳 Controller→Service→Mapper→XML |
| 阶段 3 | 打断点看 Example 条件拼接；Database 面板看 SQL 效果 |
| 阶段 4 | 配合 redis-cli 验证缓存（Terminal 标签页） |
| 阶段 5 | Cmd+Alt+B 找实现类，理解代理结构 |
| 阶段 6 | 自己写代码：Alt+Enter 导包、Cmd+P 看参数 |

> 最快的学习方式：**一边 Debug 一边读**。把读 mall 当"开着导航开车"，断点就是路标。

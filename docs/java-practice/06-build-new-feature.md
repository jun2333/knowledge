# 阶段 6：动手开发新功能（毕业设计）

> **目标**：把前 5 个阶段的认知串起来，在 mall 里**从零新增一个完整功能模块**，走一遍真实开发流程。这是"能干活"的最终检验。
>
> **前置**：阶段 1-5 完成。

## 一、验收标准（做完自检）

- [ ] 新功能能跑通（Swagger 里增删改查 + 分页全部可用）
- [ ] 代码风格和 mall 一致（统一返回、异常、命名规范）
- [ ] 能给不懂的人讲清：你建了什么表、写了哪些层、为什么这么写

## 二、任务：新增"通知公告"管理模块

业务：后台管理员可以**发布/编辑/删除/上下架通知**，列表按标题模糊查询 + 分页。

功能清单（就是一个标准 CRUD）：

| 功能 | 接口 | 说明 |
|------|------|------|
| 新增 | `POST /notice/create` | 新建通知 |
| 修改 | `POST /notice/update/{id}` | 编辑通知 |
| 删除 | `POST /notice/delete/{id}` | 删除 |
| 状态 | `POST /notice/update/status/{id}` | 上下架（发布/下架） |
| 详情 | `GET /notice/{id}` | 单条 |
| 分页 | `GET /notice/list` | 标题模糊 + 分页 |

## 三、开发步骤（照做，卡住就找相似模块对照）

### Step 1：建表

在 MySQL 里执行（先停掉应用，避免锁表）：

```sql
CREATE TABLE `sms_notice` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT '标题',
  `content` text COMMENT '内容',
  `status` int(1) DEFAULT 0 COMMENT '状态 0-下架 1-上架',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`)
) COMMENT='通知公告表';
```

> 命名规范：mall 业务表前缀 `sms_`（营销模块）或 `cms_`（内容模块），notice 放内容模块用 `cms_notice` 也行。自己定，但要统一。

### Step 2：写实体 + Mapper（参考 mall-mbg 现有写法）

在 `mall-mbg` 里**手写**（不跑生成器，生成器步骤在 Step 4 补充说明）：

- `com.macro.mall.model.CmsNotice`：字段对应表的 POJO（id、title、content、status、createTime）
- `com.macro.mall.mapper.CmsNoticeMapper`：接口，声明 `insert/selectByPrimaryKey/updateByPrimaryKey/deleteByPrimaryKey/selectByExample`
- `resources/com/macro/mall/mapper/CmsNoticeMapper.xml`：写 `<resultMap>` + 对应 SQL

> 对照看：打开现有的 `PmsProductMapper.java` + `PmsProductMapper.xml`，照着它的结构写你自己的，字段少，很快。

> 补充：mall 的表/实体/Mapper 本来是用 MyBatis Generator 生成的（`mall-mbg/generatorConfig.xml`）。手写一遍是为了让你真正理解结构，等你会了，以后可以用生成器一键生成。

### Step 3：写 Service

在 `mall-admin` 里：

- `com.macro.mall.service.CmsNoticeService`（接口）
- `com.macro.mall.service.impl.CmsNoticeServiceImpl`（实现）

实现要点：
- `list()` 用 `CmsNoticeExample` 拼标题模糊条件 + `PageHelper.startPage()` 分页 + `CommonPage.restPage()` 返回
- `create()` / `update()` / `delete()` 调对应 mapper 方法
- `updateStatus()` 先查后改（参考 `PmsProductServiceImpl` 的 `updatePublishStatus`）
- 简单的校验（标题为空抛异常）用 `Asserts.fail()`（参考 `UmsAdminServiceImpl`）

### Step 4：写 Controller

在 `mall-admin/.../controller/CmsNoticeController.java`：

```java
@RestController
@RequestMapping("/notice")
public class CmsNoticeController {
    @Autowired
    private CmsNoticeService noticeService;

    @RequestMapping(value = "/list", method = RequestMethod.GET)
    public CommonResult<CommonPage<CmsNotice>> list(@RequestParam(required = false) String title,
                                                    @RequestParam(value = "pageSize", defaultValue = "5") Integer pageSize,
                                                    @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum) {
        return CommonResult.success(noticeService.list(title, pageSize, pageNum));
    }
    // create / update / delete / updateStatus / getItem 同理
}
```

> 对照 `PmsProductController` 的注解写法，尤其是 `@RequestParam` / `@PathVariable` / `@RequestBody` 的使用。

### Step 5：权限登记（可选但加分）

mall 的动态权限是基于 `ums_resource` 表的。要让新接口能被权限系统管理，需要往 `ums_resource` 表插入资源记录（参考现有记录，字段：name、url、category_id 等）。**如果暂时不想做，接口会受"超级管理员"的默认全权限保护，也能用。**

### Step 6：自测

1. 重启应用
2. Swagger 里调通全部 6 个接口（注意新接口可能要重新登录拿 token，因为重启后旧 token 可能还在有效期，一般能继续用）
3. 检查：创建 → 列表分页 → 修改 → 上下架 → 删除，全链路走一遍

## 四、做完之后的复盘（重要）

回答这几个问题，答不上来就回对应阶段重读：

1. 请求进来，`CmsNoticeController.list()` 是怎么调到 `CmsNoticeMapper` 的？（回看阶段 1/2）
2. 为什么 `CmsNoticeMapper` 没有实现类也能注入调用？（回看阶段 3）
3. `@Transactional` 加在哪个方法上？新功能里哪个操作应该加事务？（回看阶段 3）
4. 如果这个接口要被缓存，怎么写？（回看阶段 4）
5. 新接口默认被鉴权保护，是靠哪段配置？（回看阶段 5）

## 五、如果卡住了

- **看相似模块**：mall 里每个功能都是同构的，Pms/Sms/Cms 模块任选一个对照
- **看官方教程**：macrozheng 写过 mall 的完整开发教程（[www.macrozheng.com](https://www.macrozheng.com)），遇到陌生概念先查
- **报错贴出来**：把控制台最后的 `Caused by` 发出来，我们定位

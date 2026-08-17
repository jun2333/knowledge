# Spring Boot 入门（NestJS 开发者视角）

::: tip 背景
承接《Java 入门》，面向熟悉 NestJS 的 JS 开发者。Spring Boot 在生态位上最接近 NestJS——全家桶式应用框架，自带 DI 容器、分层结构、生态整合。本文用 NestJS 做锚点快速建立 Spring Boot 心智模型。
:::

## 快速开始

用 [Spring Initializr](https://start.spring.io)（对应 `nest new`）生成项目：选 Java 17+、Spring Web、Spring Data JPA、MySQL Driver。生成后目录：

```
src/main/
├── java/com/example/demo/
│   └── DemoApplication.java   # 入口，对应 main.ts
└── resources/
    └── application.yml        # 配置文件，对应 .env / config
```

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

启动：`mvn spring-boot:run`（对应 `npm run start:dev`），默认端口 8080。

## IoC/DI 容器：对应 NestJS 的 Module + providers

NestJS 里 `@Injectable()` + `providers` 让框架帮你管理依赖；Spring Boot 做同样的事，只是叫 **IoC 容器（Inversion of Control）**：

| NestJS | Spring Boot |
|--------|-------------|
| `@Injectable()` | `@Service` / `@Component` / `@Repository` |
| Module 中注册 providers | 组件扫描（`@SpringBootApplication` 默认扫本包及子包） |
| 构造函数注入 | 构造器注入（推荐） |
| `@Inject()` / `forwardRef` | `@Autowired`（可选，构造器注入不需要） |

```typescript
// NestJS
@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}
}
```

```java
// Spring Boot：构造器注入
@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

**核心心智**：Spring 启动时扫描并实例化所有标注了 `@Service`/`@Component` 的类，放进容器统一管理；谁需要谁在构造器里声明，容器自动注入。**不要自己 `new` 业务对象**——那不是 Spring 管理的实例。

## Controller / Service / Repository 分层

### Controller（对应 NestJS Controller）

```typescript
// NestJS
@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get(':id')
  getUser(@Param('id') id: string) { return this.userService.getById(id) }
}
```

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getById(id);
    }

    @PostMapping
    public User create(@RequestBody CreateUserDto dto) {
        return userService.create(dto);
    }
}
```

### Service（业务逻辑层）

```java
@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional          // 对应事务管理，方法内多步 DB 操作要么全成要么全败
    public User create(CreateUserDto dto) {
        return userRepository.save(new User(dto.name()));
    }
}
```

### Repository + Entity（数据访问，对应 TypeORM）

```typescript
// TypeORM
@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id!: number
  @Column() name!: string
}
```

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    // getter/setter（或直接用 record + Spring Data 映射）
}
```

```java
// Spring Data JPA：接口即实现，方法名即查询
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByName(String name);      // 派生查询
    List<User> findByAgeGreaterThan(int age); // 按方法名自动生成 SQL
}
```

| TypeORM | Spring Data JPA |
|---------|----------------|
| `@Entity('users')` | `@Entity` + `@Table(name = "users")` |
| `@PrimaryGeneratedColumn()` | `@Id` + `@GeneratedValue` |
| `@Column()` | 字段默认映射，无需注解 |
| `repository.find(...)` | `findByName(...)` 方法名即查询 |
| 自定义 SQL | `@Query("SELECT u FROM User u WHERE ...")` |

## 注解速查表

| 注解 | 作用 | 对应 NestJS |
|------|------|-------------|
| `@SpringBootApplication` | 入口，含组件扫描 | `NestFactory.create()` + Module |
| `@RestController` | JSON 接口控制器 | `@Controller()` |
| `@RequestMapping("/api/users")` | 路由前缀 | `@Controller('api/users')` |
| `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` | HTTP 方法路由 | `@Get()` / `@Post()` 等 |
| `@PathVariable("id")` | 路径参数 | `@Param('id')` |
| `@RequestParam` | 查询参数 | `@Query()` |
| `@RequestBody` | 请求体 | `@Body()` |
| `@Service` / `@Component` / `@Repository` | 注册到容器 | `@Injectable()` |
| `@Autowired` | 字段/构造器注入 | 构造函数注入（默认） |
| `@Transactional` | 事务边界 | TypeORM 的 `queryRunner` / 事务装饰器 |
| `@Entity` / `@Table` / `@Id` / `@GeneratedValue` | ORM 映射 | TypeORM 装饰器 |
| `@Configuration` | 配置类 | Module 中的 providers/imports |
| `@Value("${server.port}")` | 读取配置 | `process.env` / `ConfigService` |

## 配置：application.yml（对应 .env）

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/demo
    username: root
    password: secret
  jpa:
    hibernate:
      ddl-auto: update   # 启动时自动建表（开发期），生产建议 none + 迁移工具
```

代码里读取：`@Value("${server.port}")` 或 `@ConfigurationProperties` 绑定成对象。

## 打包与部署

| 步骤 | 命令 | 对应 JS |
|------|------|---------|
| 打包 | `mvn package` | `npm run build` |
| 产物 | `target/demo-0.0.1.jar` | `dist/` |
| 运行 | `java -jar demo.jar` | `node dist/main.js` |
| 内嵌服务器 | jar 自带 Tomcat | Node 自带 HTTP 服务 |

jar 包内嵌 Tomcat，无需单独装服务器，`java -jar` 直接跑——这就是 Spring Boot 的"可执行 jar"。

## 学习路径建议

1. **先跑通**：Initializr 生成项目 → 写一个 User CRUD（Controller → Service → Repository → JPA）
2. **理解容器**：写代码时多问一句"这个对象谁 new 的？"——容器帮你 new
3. **再深入**：`@Transactional` 事务、Bean Validation 参数校验、全局异常处理（`@RestControllerAdvice`）、Spring Security
4. **对照继续**：看到 NestJS 中间件 → 对应 Spring 的 Filter/Interceptor；看到管道 → 对应 `@Valid` + Bean Validation

## 延伸阅读

- [Java 入门（JS 开发者视角）](/service/java-basics) - 语言基础与 Maven 工程化
- [TypeORM 用法](/service/typeorm) - JPA 的对照参考
- [NestJS 从入门到放弃](/service/nest) - 你已经掌握的另一侧

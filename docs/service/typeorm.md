# TypeORM 用法

TypeORM 是 Node.js 生态最流行的 **ORM（对象关系映射）** 库：用 TypeScript 类（实体）描述表结构，框架自动生成 SQL，你不需要手写 `INSERT` / `SELECT`。NestJS 官方推荐搭配使用（`@nestjs/typeorm`）。

## 为什么需要 ORM

| 手写 SQL | 用 ORM |
|---------|--------|
| 字符串拼接易出错、易注入 | 方法调用 + 参数化，防 SQL 注入 |
| 表结构改了 SQL 全要改 | 改实体类即可 |
| 查询结果要手动映射成对象 | 自动映射成实体实例 |
| 没有类型提示 | 全程 TypeScript 类型检查 |

代价：复杂 SQL 的灵活度不如手写（可用 QueryBuilder 补救），且有一层抽象需要理解。

## 核心概念

```
实体（Entity）= 表
  ↓ TypeORM 启动时扫描
仓库（Repository）= 表的操作对象（自动生成，方法内置）
  ↓ 注入
服务里直接调用 find / save / delete...
```

**实体定义**：

```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')              // 对应 users 表（不写则用类名 user）
export class User {
  @PrimaryGeneratedColumn()   // 自增主键
  id: number;

  @Column({ length: 50 })     // varchar(50)
  name: string;

  @Column({ default: 0 })     // 有默认值
  age: number;

  @CreateDateColumn()         // 自动填创建时间
  createdAt: Date;
}
```

## 快速开始（NestJS）

```bash
npm install @nestjs/typeorm typeorm mysql2
```

```typescript
// app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'password',
      database: 'myapp',
      entities: [User],          // 注册实体
      synchronize: true,         // 开发环境自动同步表结构（生产必须关！）
    }),
  ],
})
export class AppModule {}

// users.module.ts —— 模块里注册实体对应的 Repository
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

```typescript
// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)                    // 注入 User 的仓库
    private usersRepository: Repository<User>,
  ) {}
}
```

## 入门：增删改查

| Repository 方法 | 对应的 SQL | 说明 |
|----------------|-----------|------|
| `save(user)` | `INSERT`（无主键）/ `UPDATE`（有主键） | 万能：插入或更新 |
| `find()` | `SELECT *` | 查全部 |
| `findOne({ where: { id } })` | `SELECT ... WHERE id = ? LIMIT 1` | 查单条，查不到返回 `null` |
| `update({ id: 1 }, { name: 'x' })` | `UPDATE ... SET` | 按条件更新（第一个参数是条件） |
| `delete(1)` | `DELETE WHERE id = 1` | 按主键删；`delete({ age: MoreThan(60) })` 按条件删 |

```typescript
// 增
const user = this.usersRepository.create({ name: 'Alice', age: 25 });  // 创建对象（不落库）
await this.usersRepository.save(user);                                 // 插入

// 查
const all = await this.usersRepository.find();
const one = await this.usersRepository.findOne({ where: { id: 1 } });

// 改
await this.usersRepository.update({ id: 1 }, { age: 26 });

// 删
await this.usersRepository.delete(1);
```

## 常用实战：条件查询

`where` 对象 + 查询操作符：

```typescript
import { MoreThan, LessThan, In, Like, Between, IsNull } from 'typeorm';

const adults = await this.usersRepository.find({
  where: { age: MoreThan(18) },     // WHERE age > 18
  order: { id: 'DESC' },            // ORDER BY id DESC
  take: 10,                         // LIMIT 10
  skip: 20,                         // OFFSET 20（分页）
});

const byName = await this.usersRepository.find({
  where: { name: Like('%张%') },    // 模糊查询
});
```

| 操作符 | 生成的 SQL |
|--------|-----------|
| `MoreThan(18)` | `age > 18` |
| `LessThan(18)` | `age < 18` |
| `In([1,2,3])` | `id IN (1,2,3)` |
| `Like('%张%')` | `name LIKE '%张%'` |
| `Between(18, 60)` | `age BETWEEN 18 AND 60` |
| `IsNull()` | `deleted_at IS NULL` |

**多条件**：`where: { age: MoreThan(18), status: 'active' }` = `AND` 连接；要用 `OR` 得 `where: [{ a: 1 }, { b: 2 }]`。

**先查后删**（业务标配：查不到要 404）：

```typescript
async remove(id: number) {
  const user = await this.usersRepository.findOne({ where: { id } });
  if (!user) throw new NotFoundException('用户不存在');
  await this.usersRepository.delete(id);
  return { deleted: true };
}
```

## 常用实战：关联关系

一对多（用户 → 订单）：

```typescript
// user.entity.ts —— 一的一方
@OneToMany(() => Order, (order) => order.user)
orders: Order[];

// order.entity.ts —— 多的一方（拥有外键）
@ManyToOne(() => User, (user) => user.orders)
@JoinColumn({ name: 'userId' })   // 外键列，只在一侧标
user: User;
```

查询时带出关联（避免 N+1）：

```typescript
// 方式一：relations 选项
const users = await this.usersRepository.find({ relations: ['orders'] });

// 方式二：QueryBuilder 联查（更灵活）
const users = await this.usersRepository
  .createQueryBuilder('u')
  .leftJoinAndSelect('u.orders', 'o')
  .getMany();
```

多对多（用户 ↔ 角色）需要中间表，用 `@ManyToMany` + `@JoinTable()`，用法类似。

## 常用实战：事务

多个操作要"要么全成功要么全失败"：

```typescript
// dataSource 由 forRoot 创建并注册进容器，@InjectDataSource() 注入
// manager 是开启事务时自动传入的"事务版 EntityManager"
await this.dataSource.transaction(async (manager) => {
  await manager.delete(User, { id: 1 });
  await manager.update(Order, { userId: 1 }, { userId: null });  // 中途失败，全部回滚
});
```

> 关键：事务里**必须用 `manager`**（绑定事务连接），用 `repository` 走默认连接、不在事务内、失败不回滚。Repository 只管单个实体；EntityManager 全实体通用（`manager.delete(User, ...)` 第一个参数传实体类）。

## 深度实战：软删除

不真删数据，只标记删除时间，查询自动过滤：

```typescript
// user.entity.ts
@DeleteDateColumn()       // 加这一列就有软删除能力
deletedAt: Date | null;

// 使用
await this.usersRepository.softDelete(1);      // UPDATE deleted_at = now WHERE id = 1
await this.usersRepository.restore(1);         // 恢复
const all = await this.usersRepository.find(); // 自动过滤已删除（WHERE deleted_at IS NULL）
const withDeleted = await this.usersRepository.find({ withDeleted: true });  // 连删掉的也查
```

**什么时候用**：可恢复的数据（订单、用户）、审计要求（保留历史）。日志类数据直接 `delete` 即可。

## 深度实战：迁移（Migration）

`synchronize: true` 会按实体自动改表结构——开发方便，但生产环境危险（可能误删列、改数据类型丢数据）。生产用**迁移**：生成 SQL 脚本，人工审核后执行。

```bash
# 1. 准备 data-source.ts（独立于 Nest 的配置，供 CLI 使用）
npx typeorm-ts-node-commonjs migration:generate -d src/data-source.ts src/migrations/AddAgeColumn
# 2. 检查生成的 SQL（确认无误）
# 3. 执行
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
```

```typescript
// data-source.ts
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'password',
  database: 'myapp',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});
```

## 深度实战：性能优化

| 优化点 | 做法 |
|--------|------|
| **只查需要的列** | `select: ['id', 'name']` 或 QueryBuilder 的 `.select(['u.id', 'u.name'])`，别 `SELECT *` |
| **分页** | `take` + `skip`（数据量大时用游标分页） |
| **加索引** | 实体字段上 `@Index()`（高频 where 的列） |
| **避免 N+1** | 用 `relations` / `leftJoinAndSelect` 一次性联查；或 `@ManyToOne` 侧 `eager: true` |
| **避免全表扫描** | 条件查询优先走索引列 |

```typescript
@Entity('users')
@Index(['status', 'age'])        // 复合索引：常按这两个条件查
export class User {
  @Column()
  status: string;
}
```

## 常见坑

1. **`synchronize: true` 上生产**：改实体 = 自动改表，可能丢数据。生产必须关掉，用迁移。
2. **`findOne` 不传 `where`**：TypeORM 0.3 起必须 `findOne({ where: {...} })`，直接 `findOne(id)` 已废弃。
3. **N+1 查询**：循环里逐条查关联 = 每次请求 N+1 条 SQL。用 `relations` 或 QueryBuilder 联查。
4. **事务里用了 repository**：不在事务内，失败不回滚。事务内一律用 `manager`。
5. **时区**：`datetime` 存的是本地时间，`timestamp` 存 UTC。前后端传时间建议统一 ISO 字符串。
6. **`save` 的语义**：有主键就 UPDATE、无主键就 INSERT。想强制插入用 `insert()`，强制更新用 `update()`。

## 总结

- **选型规律**：简单条件 → `where` 对象；业务要 404 → 先查后删；多步原子 → 事务（用 manager）；多表/聚合 → QueryBuilder；要可恢复 → 软删除
- **生产三件事**：关 `synchronize`、用迁移、检查慢查询
- 与 NestJS 集成链路：`forRoot` 注册连接 → `forFeature` 注册实体仓库 → `@InjectRepository` 注入 → 直接调用

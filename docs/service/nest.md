---
title: NestJS 入门
date: 2023-03-08
---

# NestJS 入门

NestJS 是一个用于构建高效、可扩展的 Node.js 服务器端应用的框架，基于 TypeScript，使用装饰器和依赖注入。

## 核心特点

| 特点 | 说明 |
|------|------|
| **TypeScript 优先** | 原生 TypeScript 支持 |
| **装饰器** | 类似 Spring 的注解风格 |
| **依赖注入** | 内置 DI 容器 |
| **模块化** | 强制模块化架构 |
| **底层可选** | 默认 Express，可切换 Fastify |

## 快速开始

### 安装

```bash
npm install -g @nestjs/cli
nest new my-nest-app
cd my-nest-app
npm run start:dev
```

### 项目结构

```
my-nest-app/
├── src/
│   ├── app.module.ts        # 根模块
│   ├── app.controller.ts    # 根控制器
│   ├── app.service.ts       # 根服务
│   ├── main.ts              # 入口文件
│   └── users/               # 用户模块
│       ├── users.module.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── dto/
│           └── create-user.dto.ts
├── test/
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## 核心概念

### 模块（Module）

模块是组织代码的基本单位。

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],  // 导入其他模块
  controllers: [],         // 控制器
  providers: [],           // 服务/提供者
  exports: []              // 导出给其他模块使用
})
export class AppModule {}
```

### 控制器（Controller）

处理 HTTP 请求。

```typescript
// users.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')  // 路由前缀
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // GET /users/1
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  // POST /users
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

### 服务（Service）

封装业务逻辑。

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()  // 标记为可注入
export class UsersService {
  private users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' }
  ];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find(u => u.id === id);
  }

  create(createUserDto: CreateUserDto) {
    const newUser = {
      id: this.users.length + 1,
      ...createUserDto
    };
    this.users.push(newUser);
    return newUser;
  }
}
```

### DTO（数据传输对象）

定义请求/响应数据结构。

```typescript
// dto/create-user.dto.ts
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}
```

## 依赖注入

NestJS 内置 DI 容器，自动管理服务实例。

```typescript
// 服务自动注入到控制器
@Controller('users')
export class UsersController {
  // NestJS 自动创建 UsersService 实例并注入
  constructor(private readonly usersService: UsersService) {}
}

// 服务间也可以互相注入
@Injectable()
export class OrdersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService
  ) {}
}
```

## 常用装饰器

### 路由装饰器

| 装饰器 | HTTP 方法 |
|--------|----------|
| `@Get()` | GET |
| `@Post()` | POST |
| `@Put()` | PUT |
| `@Delete()` | DELETE |
| `@Patch()` | PATCH |
| `@Options()` | OPTIONS |

### 参数装饰器

```typescript
@Get(':id')
findOne(
  @Param('id') id: string,      // 路由参数
  @Query('page') page: number,  // 查询参数
  @Headers('authorization') auth: string,  // 请求头
  @Body() body: CreateUserDto,  // 请求体
  @Req() req: Request           // 完整请求对象
) {}
```

## 中间件

```typescript
// logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url}`);
    next();
  }
}

// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');  // 所有路由
  }
}
```

## 管道（Pipe）

用于数据转换和验证。

```typescript
// validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, { metatype }) {
    if (!metatype) return value;
    
    const object = plainToInstance(metatype, value);
    const errors = await validate(object);
    
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }
    
    return object;
  }
}

// 全局使用
// main.ts
app.useGlobalPipes(new ValidationPipe());
```

## 守卫（Guard）

用于权限控制。

```typescript
// auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization'];
    
    // 验证 token
    return !!token;
  }
}

// 使用
@UseGuards(AuthGuard)
@Get('profile')
getProfile() {
  return { user: 'Alice' };
}
```

## 拦截器（Interceptor）

用于日志、缓存、转换响应等。

```typescript
// logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => console.log(`耗时: ${Date.now() - now}ms`))
      );
  }
}

// 全局使用
app.useGlobalInterceptors(new LoggingInterceptor());
```

## 异常过滤器

```typescript
// http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response
      .status(status)
      .json({
        statusCode: status,
        message: exception.message,
        timestamp: new Date().toISOString()
      });
  }
}

// 全局使用
app.useGlobalFilters(new HttpExceptionFilter());
```

## 数据库集成

### TypeORM 示例

```bash
npm install @nestjs/typeorm typeorm mysql2
```

```typescript
// app.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'password',
      database: 'myapp',
      entities: [User],
      synchronize: true  // 开发环境自动同步表结构
    }),
    UsersModule
  ]
})
export class AppModule {}

// users.service.ts
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  findAll() {
    return this.usersRepository.find();
  }

  create(dto: CreateUserDto) {
    const user = this.usersRepository.create(dto);
    return this.usersRepository.save(user);
  }
}
```

## 与 Koa/Egg 对比

| 维度 | NestJS | Koa | Egg.js |
|------|--------|-----|--------|
| **语言** | TypeScript | JavaScript | JavaScript |
| **架构** | 模块化 + DI | 中间件 | 约定优于配置 |
| **学习曲线** | 高 | 低 | 中 |
| **生态** | 成长中 | 成熟 | 成熟 |
| **适用场景** | 大型企业级 | 微服务 | 中大型项目 |

**选择建议：**
- 团队有 Java/Spring 背景 → NestJS
- 需要 TypeScript → NestJS
- 快速原型 → Koa
- 阿里系项目 → Egg.js

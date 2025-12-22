# MO Gallery - Hono.js Backend

基于 Hono.js 的图片画廊后端项目，从 NestJS 项目移植而来。

## 技术栈

- **Hono.js** - 轻量级 Web 框架
- **Prisma** - ORM 数据库工具
- **SQLite** - 数据库
- **TypeScript** - 类型安全
- **JWT** - 身份验证
- **Sharp** - 图片处理
- **bcryptjs** - 密码加密

## 功能特性

- ✅ 用户认证 (JWT)
- ✅ 图片上传和管理
- ✅ 图片分类
- ✅ 缩略图自动生成
- ✅ 系统设置管理
- ✅ CORS 支持
- ✅ CDN 支持

## 图片存储架构

⚠️ **重要**: 生产环境建议使用独立的静态文件服务器或 CDN，避免图片流量经过 API 服务器。

详细说明请查看: [STORAGE_ARCHITECTURE.md](./STORAGE_ARCHITECTURE.md)

### 快速开始 - 独立静态服务器

开发环境可以使用内置的静态文件服务器：

```bash
# 终端 1: 启动 API 服务器
npm run dev

# 终端 2: 启动静态文件服务器
npm run static
```

然后在管理后台配置 CDN 域名为: `http://localhost:3001`

### 生产环境推荐

使用 Nginx、Caddy 或 CDN 服务提供静态文件，详见 [STORAGE_ARCHITECTURE.md](./STORAGE_ARCHITECTURE.md)。

## 项目结构

```
mo-gallary-hono/
├── src/
│   ├── routes/          # API 路由
│   │   ├── auth.ts      # 认证路由
│   │   ├── photos.ts    # 图片路由
│   │   └── settings.ts  # 设置路由
│   ├── middleware/      # 中间件
│   │   └── auth.ts      # JWT 认证中间件
│   ├── lib/             # 工具库
│   │   ├── prisma.ts    # Prisma 客户端
│   │   └── jwt.ts       # JWT 工具
│   └── index.ts         # 主入口文件
├── prisma/
│   ├── schema.prisma    # 数据库 schema
│   └── seed.ts          # 种子数据
├── public/
│   └── uploads/         # 上传文件目录
└── package.json
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env` 文件并根据需要修改：

```env
DATABASE_URL="file:./dev.db"
PORT=8787
JWT_SECRET=your-secret-key-change-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 初始化种子数据
npm run prisma:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:8787` 启动。

### 5. 构建生产版本

```bash
npm run build
npm start
```

## API 端点

### 认证

- `POST /api/auth/login` - 用户登录

### 图片管理

- `GET /api/photos` - 获取图片列表 (支持分类和数量限制)
- `GET /api/photos/featured` - 获取精选图片
- `GET /api/categories` - 获取分类列表
- `POST /api/admin/photos` - 上传图片 (需要认证)
- `DELETE /api/admin/photos/:id` - 删除图片 (需要认证)

### 系统设置

- `GET /api/admin/settings` - 获取系统设置 (需要认证)
- `PATCH /api/admin/settings` - 更新系统设置 (需要认证)

## 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

⚠️ **请在生产环境中修改默认密码！**

## 与 NestJS 版本的主要区别

1. **框架**: 从 NestJS 迁移到 Hono.js，更轻量级
2. **依赖注入**: Hono.js 使用函数式方法，无需装饰器
3. **中间件**: 使用 Hono 的中间件系统
4. **文件上传**: 使用 FormData API 处理文件上传
5. **模块化**: 使用 ES Modules (`.js` 扩展名)

## 开发说明

- 使用 TypeScript 开发，需要在 import 语句中添加 `.js` 扩展名
- Prisma 客户端使用单例模式避免连接泄漏
- JWT 密钥应在生产环境中使用强密码
- 文件上传目录 `public/uploads` 需要有写权限

## License

ISC

# 图片存储架构说明

## 当前实现

### 问题
- 所有图片存储在后端 `public/uploads` 目录
- 前端通过 API 服务器 URL 加载图片 (如 `http://localhost:8787/uploads/xxx.jpg`)
- 增加了后端服务器的带宽负载
- 不适合生产环境大规模使用

### 架构流程
```
用户上传 -> Hono 后端 -> 保存到 public/uploads -> 前端从 API URL 加载
```

## 推荐的生产架构

### 方案 1: 使用 CDN + 独立静态文件服务器 (推荐)

#### 架构
```
用户上传 -> Hono 后端 -> 保存到 public/uploads
                              ↓
                        Nginx/Caddy 静态服务器
                              ↓
                          CDN (可选)
                              ↓
                           前端加载
```

#### 实现步骤

1. **配置 Nginx 或 Caddy 提供静态文件服务**

```nginx
# nginx.conf
server {
    listen 80;
    server_name static.your-domain.com;

    location /uploads {
        alias /path/to/mo-gallary-hono/public/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }
}
```

或使用 Caddy (更简单):
```
static.your-domain.com {
    root * /path/to/mo-gallary-hono/public
    file_server
}
```

2. **在管理后台配置 CDN 域名**
   - 进入 "系统配置" → "网站设置"
   - 设置 "CDN 边缘域名" 为 `https://static.your-domain.com`
   - 保存配置

3. **前端会自动使用 CDN URL**
   ```
   图片 URL: /uploads/xxx.jpg
   解析后: https://static.your-domain.com/uploads/xxx.jpg
   ```

#### 优势
- ✅ 后端只负责上传逻辑，不提供静态文件
- ✅ 静态文件服务器专门优化文件传输
- ✅ 可以轻松添加 CDN 加速
- ✅ 实现简单，成本低

---

### 方案 2: 使用 Cloudflare R2 对象存储

#### 所需工作
1. **安装 AWS S3 SDK**
   ```bash
   npm install @aws-sdk/client-s3
   ```

2. **实现 R2 上传逻辑** (需要开发)
   - 修改 `src/routes/photos.ts` 的上传函数
   - 根据 `storage_provider` 判断上传目标
   - 使用 S3 SDK 上传到 R2
   - 返回 R2 的完整 URL

3. **配置 R2 凭据**
   - 在管理后台配置 R2 Access Key、Secret Key、Bucket、Endpoint
   - 图片直接从 R2 URL 加载

#### 架构
```
用户上传 -> Hono 后端 -> 上传到 Cloudflare R2
                              ↓
                         R2 返回 URL
                              ↓
                    数据库保存完整 R2 URL
                              ↓
                      前端从 R2 直接加载
```

#### 优势
- ✅ 全球 CDN 加速
- ✅ 按量付费，成本低
- ✅ 可靠性高
- ❌ 需要开发上传逻辑
- ❌ 需要 R2 账户和配置

---

### 方案 3: 使用 GitHub 作为图床

#### 架构
```
用户上传 -> Hono 后端 -> 通过 GitHub API 上传
                              ↓
                      GitHub 返回 raw URL
                              ↓
                使用 CDN (如 jsdelivr) 加速
                              ↓
                         前端加载
```

#### URL 示例
```
GitHub Raw: https://raw.githubusercontent.com/user/repo/main/uploads/xxx.jpg
jsDelivr CDN: https://cdn.jsdelivr.net/gh/user/repo@main/uploads/xxx.jpg
```

#### 优势
- ✅ 完全免费
- ✅ 可以使用 jsdelivr 等 CDN
- ❌ 单文件限制 100MB
- ❌ 需要开发上传逻辑
- ❌ 有 API 请求限制

---

## 快速实施建议

### 开发/测试环境
保持当前实现即可：
```
前端从 http://localhost:8787/uploads/xxx.jpg 加载
```

### 生产环境 (推荐方案 1)

#### 1. 部署独立静态服务器
使用 Caddy (最简单):
```bash
# 安装 Caddy
curl https://getcaddy.com | bash

# 创建 Caddyfile
cat > Caddyfile << EOF
static.your-domain.com {
    root * /path/to/mo-gallary-hono/public
    file_server
    encode gzip
}
EOF

# 启动
caddy run
```

#### 2. 配置 CDN 域名
在管理后台设置: `https://static.your-domain.com`

#### 3. 完成！
前端现在从静态服务器加载图片，后端只负责上传逻辑。

---

## 代码实现说明

### 当前的 resolveAssetUrl 函数

```typescript
// src/lib/api.ts
export function resolveAssetUrl(assetPath: string, cdnDomain?: string): string {
  if (/^https?:\/\//i.test(assetPath)) return assetPath
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`

  const cdn = cdnDomain?.trim()
  if (cdn) return `${cdn.replace(/\/+$/, '')}${normalizedPath}`

  return `${getApiBase()}${normalizedPath}`
}
```

### 工作流程

1. **未配置 CDN**: 图片从 API 服务器加载
   ```
   /uploads/xxx.jpg → http://localhost:8787/uploads/xxx.jpg
   ```

2. **配置 CDN 后**: 图片从 CDN 加载
   ```
   /uploads/xxx.jpg → https://static.your-domain.com/uploads/xxx.jpg
   ```

3. **使用云存储**: 直接保存完整 URL
   ```
   数据库存储: https://r2.your-domain.com/uploads/xxx.jpg
   前端直接使用，无需 resolve
   ```

---

## 总结

| 方案 | 实现难度 | 成本 | 性能 | 推荐度 |
|------|---------|------|------|--------|
| 独立静态服务器 + CDN | ⭐ 简单 | $ 低 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cloudflare R2 | ⭐⭐⭐ 中等 | $ 低 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| GitHub 图床 | ⭐⭐⭐ 中等 | 免费 | ⭐⭐⭐ | ⭐⭐⭐ |
| 当前实现 (开发) | ⭐ 已完成 | $ 低 | ⭐⭐ | ⭐⭐ (仅开发) |

**建议**: 生产环境使用方案 1（独立静态服务器），最简单且性能最好。

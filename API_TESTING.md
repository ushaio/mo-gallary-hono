# API 测试指南

本文档提供了使用 curl 或其他 HTTP 客户端测试 API 的示例。

## 基础 URL

```
http://localhost:8787
```

## 1. 健康检查

```bash
curl http://localhost:8787
```

## 2. 用户登录

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

响应示例：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**保存返回的 token，后续需要在请求头中使用。**

## 3. 获取图片列表

```bash
# 获取所有图片
curl http://localhost:8787/api/photos

# 获取指定分类的图片
curl "http://localhost:8787/api/photos?category=风景"

# 限制返回数量
curl "http://localhost:8787/api/photos?limit=10"
```

## 4. 获取精选图片

```bash
curl http://localhost:8787/api/photos/featured
```

## 5. 获取分类列表

```bash
curl http://localhost:8787/api/categories
```

## 6. 上传图片 (需要认证)

```bash
# 将 YOUR_TOKEN_HERE 替换为登录时获取的 token
curl -X POST http://localhost:8787/api/admin/photos \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/your/image.jpg" \
  -F "title=测试图片" \
  -F "category=风景,旅行"
```

## 7. 删除图片 (需要认证)

```bash
# 将 YOUR_TOKEN_HERE 替换为登录时获取的 token
# 将 PHOTO_ID 替换为实际的图片 ID
curl -X DELETE http://localhost:8787/api/admin/photos/PHOTO_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 8. 获取系统设置 (需要认证)

```bash
# 将 YOUR_TOKEN_HERE 替换为登录时获取的 token
curl http://localhost:8787/api/admin/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 9. 更新系统设置 (需要认证)

```bash
# 将 YOUR_TOKEN_HERE 替换为登录时获取的 token
curl -X PATCH http://localhost:8787/api/admin/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "site_title": "我的画廊",
    "storage_provider": "local",
    "cdn_domain": ""
  }'
```

## 使用 Postman 或 Insomnia

1. 导入以下环境变量：
   - `base_url`: `http://localhost:8787`
   - `token`: 登录后获取的 JWT token

2. 在需要认证的请求中，添加 Header：
   - Key: `Authorization`
   - Value: `Bearer {{token}}`

## 常见错误

### 401 Unauthorized
- 未提供 token 或 token 无效
- 解决方案：重新登录获取新的 token

### 400 Bad Request
- 请求参数不正确
- 解决方案：检查请求体格式和必需字段

### 500 Internal Server Error
- 服务器内部错误
- 解决方案：查看服务器日志获取详细错误信息

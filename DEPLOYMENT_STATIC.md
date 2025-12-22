# Nginx 配置示例 - 用于生产环境

## 方案 1: Nginx 直接提供静态文件

```nginx
# /etc/nginx/sites-available/mo-gallery-static

server {
    listen 80;
    server_name static.your-domain.com;

    # SSL 配置 (推荐使用 Let's Encrypt)
    # listen 443 ssl http2;
    # ssl_certificate /etc/letsencrypt/live/static.your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/static.your-domain.com/privkey.pem;

    # 日志
    access_log /var/log/nginx/static-access.log;
    error_log /var/log/nginx/static-error.log;

    # CORS 配置
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type" always;

    # 静态文件目录
    location /uploads {
        alias /path/to/mo-gallary-hono/public/uploads;

        # 缓存设置 (1年)
        expires 1y;
        add_header Cache-Control "public, immutable";

        # 启用 gzip 压缩
        gzip on;
        gzip_types image/jpeg image/png image/webp image/svg+xml;
        gzip_min_length 1024;

        # 防止目录浏览
        autoindex off;

        # 处理 OPTIONS 请求
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/mo-gallery-static /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 方案 2: Nginx 反向代理到静态服务器

如果你想通过 Node.js 静态服务器提供文件：

```nginx
server {
    listen 80;
    server_name static.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 缓存
        proxy_cache_valid 200 1y;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

---

## Caddy 配置示例 (更简单)

```
# Caddyfile

static.your-domain.com {
    root * /path/to/mo-gallary-hono/public
    file_server
    encode gzip

    header {
        Cache-Control "public, max-age=31536000, immutable"
        Access-Control-Allow-Origin "*"
    }

    # 自动 HTTPS
}
```

### 启动 Caddy

```bash
# 安装 Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 启动服务
sudo systemctl enable caddy
sudo systemctl start caddy
```

---

## 使用 Cloudflare 作为 CDN

1. **配置 DNS**
   - 添加 A 记录: `static` → 你的服务器 IP
   - 开启 Cloudflare 代理（橙色云朵图标）

2. **Cloudflare 设置**
   - 缓存规则:
     - URL Pattern: `static.your-domain.com/uploads/*`
     - Cache Level: Standard
     - Edge Cache TTL: 1 year

3. **在管理后台配置**
   - CDN 域名: `https://static.your-domain.com`

---

## Docker 部署静态服务器

```dockerfile
# Dockerfile.static
FROM nginx:alpine

# 复制静态文件
COPY public /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

```yaml
# docker-compose.yml
version: '3'
services:
  static:
    build:
      context: .
      dockerfile: Dockerfile.static
    ports:
      - "3001:80"
    volumes:
      - ./public:/usr/share/nginx/html
    restart: unless-stopped
```

启动:
```bash
docker-compose up -d
```

---

## 推荐部署流程

### 开发环境
```bash
# 终端 1
npm run dev

# 终端 2
npm run static
```
配置 CDN: `http://localhost:3001`

### 生产环境 (推荐)
1. 使用 Caddy (最简单)
   ```bash
   caddy run
   ```

2. 或使用 Nginx + Cloudflare CDN

3. 在管理后台配置 CDN 域名
   ```
   https://static.your-domain.com
   ```

---

## 验证配置

上传一张图片后，检查数据库中的 URL:
```sql
SELECT id, title, url FROM Photo LIMIT 1;
```

应该看到: `/uploads/xxx.jpg`

前端访问时会自动拼接 CDN 域名:
```
原始: /uploads/xxx.jpg
解析后: https://static.your-domain.com/uploads/xxx.jpg
```

检查网络请求，确保图片从静态服务器加载，而不是 API 服务器。

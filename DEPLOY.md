# 生产环境部署指南

## 项目架构

- **前端**：React + Vite → 构建为静态文件
- **后端**：Node.js + Express + Socket.IO → 提供 API + WebSocket + 静态文件服务
- **数据**：内存存储 + JSON 文件持久化（`server/data/`）
- **生产模式**：后端统一 serve 前端静态文件，**单端口运行**

---

## 环境要求

| 组件 | 版本要求 |
|------|---------|
| Node.js | >= 18.0 |
| npm | >= 9.0 |
| 操作系统 | Linux / Windows / macOS |

---

## 快速部署（单服务器）

### 1. 拉取代码

```bash
git clone <你的仓库地址>
cd Kimi_Agent_kf
```

### 2. 安装前端依赖并构建

```bash
cd app
npm install
npm run build
```

构建完成后会生成 `app/dist/` 文件夹，包含所有静态文件。

### 3. 修改后端配置（serve 前端静态文件）

编辑 `server/index.js`，在文件最前面添加 `path` 模块：

```js
const path = require('path');
```

在 `app.use(express.json({ limit: '10mb' }));` 之后添加静态文件服务：

```js
// Serve frontend static files
app.use(express.static(path.join(__dirname, '../app/dist')));

// Fallback to index.html for SPA routes (React Router HashRouter)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../app/dist/index.html'));
});
```

### 4. 安装后端依赖

```bash
cd ../server
npm install
```

### 5. 启动服务

```bash
node index.js
```

服务启动后，控制台会输出：
```
Chat server running on http://0.0.0.0:3001
```

### 6. 访问

```
http://你的服务器IP:3001
```

---

## 使用 PM2 进程管理（推荐）

PM2 可以确保服务在后台持续运行，并在崩溃后自动重启。

### 1. 全局安装 PM2

```bash
npm install -g pm2
```

### 2. 创建 PM2 配置文件

在项目根目录创建 `ecosystem.config.js`：

```js
module.exports = {
  apps: [
    {
      name: 'chat-server',
      cwd: './server',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
    },
  ],
};
```

### 3. 创建日志目录

```bash
mkdir -p logs
```

### 4. 启动

```bash
pm2 start ecosystem.config.js
```

### 5. 常用命令

```bash
pm2 status              # 查看运行状态
pm2 logs chat-server    # 查看实时日志
pm2 restart chat-server # 重启服务
pm2 stop chat-server    # 停止服务
pm2 delete chat-server  # 删除进程
pm2 startup             # 设置开机自启
pm2 save                # 保存当前进程列表（配合 startup 使用）
```

---

## 使用 Nginx 反向代理（可选）

如果你需要通过 **域名** 或 **HTTPS** 访问，可以用 Nginx 做反向代理。

### 场景 A：Nginx 代理到 Node 后端（单端口）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 场景 B：Nginx 直接 serve 前端，只代理 API/WebSocket

如果你希望 Nginx 直接处理前端静态文件（性能更好）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /path/to/Kimi_Agent_kf/app/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Socket.IO WebSocket proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> 注意：使用场景 B 时，需要修改 `app/src/lib/socket.ts` 和 `app/src/lib/api.ts` 中的 `BASE_URL`，移除 `:3001` 端口。

---

## 防火墙 / 安全组配置

### Linux 防火墙（ufw）

```bash
sudo ufw allow 3001/tcp    # 如果使用单端口部署
sudo ufw allow 80/tcp      # 如果使用 Nginx
sudo ufw allow 443/tcp     # 如果使用 HTTPS
sudo ufw reload
```

### Linux 防火墙（firewalld）

```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 云服务器安全组

在阿里云、腾讯云、AWS 等控制台中，入站规则需要放行：
- **3001/tcp**（单端口部署）
- **80/tcp**（HTTP）
- **443/tcp**（HTTPS）

---

## HTTPS 配置（Let's Encrypt）

如果使用 Nginx + 域名，可以用 Certbot 免费申请 SSL 证书：

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

Certbot 会自动修改 Nginx 配置，添加 443 端口和证书路径。

---

## 数据持久化

后端使用 `server/data/` 目录存储用户和会话数据：
- `users.json` — 注册用户
- `sessions.json` — 聊天记录

**请确保该目录有写入权限**：

```bash
chmod -R 755 server/data
```

如果需要备份，直接复制这两个 JSON 文件即可。

---

## 常见问题

### Q1: 访问显示 "500 Internal Privoxy Error"

**原因**：请求经过了 Privoxy 代理，但代理无法连接到目标。  
**解决**：
1. 检查服务器安全组/防火墙是否放行 3001 端口
2. 检查服务器上是否有 Privoxy 在运行：`ps aux | grep privoxy`
3. 关闭本地浏览器代理/VPN后再试
4. 使用生产部署方式（后端 serve 前端），不要直接 `npm run dev` 暴露到公网

### Q2: 通过 IP 访问时页面白屏或报错

**原因**：Vite 生产构建的 `base: './'` 配置在通过 IP 访问时可能导致资源路径问题。  
**解决**：确认 `vite.config.ts` 中 `base` 配置为 `'./'` 即可，构建后的静态文件通过后端 serve 不存在此问题。

### Q3: WebSocket 连接失败

**原因**：Nginx 没有正确代理 WebSocket。  
**解决**：Nginx 配置中必须包含：
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Q4: 图片发送后对方收不到

**原因**：Socket.IO 大消息限制或移动端浏览器限制。  
**解决**：代码中已经做了图片压缩（最大 1024px，JPEG 质量 80%）。如果仍有问题，检查服务器带宽或 `express.json({ limit: '10mb' })` 是否足够。

### Q5: 如何修改运行端口？

```bash
PORT=8080 node index.js
```

或在 `ecosystem.config.js` 中修改 `env.PORT`。

### Q6: 如何清空所有数据？

直接删除 `server/data/` 目录下的 JSON 文件，重启服务后会自动重建空数据：

```bash
rm server/data/users.json server/data/sessions.json
pm2 restart chat-server
```

---

## 目录结构（部署后）

```
Kimi_Agent_kf/
├── app/
│   ├── dist/              # 前端构建产物（由 npm run build 生成）
│   └── ...
├── server/
│   ├── data/              # JSON 数据持久化
│   │   ├── users.json
│   │   └── sessions.json
│   ├── index.js           # 后端入口
│   └── package.json
├── logs/                  # PM2 日志（可选）
├── ecosystem.config.js    # PM2 配置（可选）
├── DEPLOY.md              # 本文件
└── ...
```

---

## 更新部署

当代码有更新时：

```bash
cd Kimi_Agent_kf

# 拉取最新代码
git pull

# 重新构建前端
cd app
npm install      # 如果有新依赖
npm run build

# 重启后端
cd ../server
npm install      # 如果有新依赖
pm2 restart chat-server
```

---

## 最低配置建议

| 场景 | CPU | 内存 | 带宽 |
|------|-----|------|------|
| 10 人同时在线 | 1 核 | 512MB | 1Mbps |
| 50 人同时在线 | 2 核 | 1GB | 3Mbps |
| 200 人同时在线 | 4 核 | 2GB | 10Mbps |

> 由于是纯内存存储 + JSON 文件，不建议用于超大规模生产环境。如需支持千人以上并发，建议迁移到 MongoDB/Redis + 专业的消息队列。

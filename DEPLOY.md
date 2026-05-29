# PSI 管理系统部署指南

## 架构说明

系统采用前后端分离架构：
- **前端**: React + Vite + Ant Design (部署到 Vercel/Netlify)
- **后端**: Node.js + Express (部署到 Railway/Render/Vercel Functions)

## 前端部署 (Vercel)

### 1. 配置环境变量

在 Vercel 项目的 Settings > Environment Variables 中添加：

| Name | Value | Environments |
|------|-------|--------------|
| VITE_API_BASE_URL | `https://your-backend-api.vercel.app` | Production |

本地开发时，在 `.env` 文件中配置：
```
VITE_API_BASE_URL=http://localhost:5000
```

### 2. 部署步骤

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

### 3. 手动配置 Vercel

1. 访问 [vercel.com](https://vercel.com) 并创建新项目
2. 导入 Git 仓库
3. 配置构建命令: `npm run build`
4. 输出目录: `dist`
5. 添加环境变量 `VITE_API_BASE_URL`

## 后端部署 (Railway)

### 1. Railway 部署

1. 访问 [railway.app](https://railway.app) 并创建新项目
2. 连接 Git 仓库或上传代码
3. Railway 会自动检测 Node.js 项目

### 2. 配置环境变量

在 Railway 项目的 Variables 中添加：

| Name | Value |
|------|-------|
| PORT | 5000 |
| NODE_ENV | production |
| DATA_PATH | ./data |
| CORS_ORIGIN | `https://your-frontend.vercel.app` |

### 3. 端口配置

Railway 自动设置 `PORT` 环境变量，确保代码使用 `process.env.PORT`。

## 后端部署 (Render)

### 1. Render 部署

1. 访问 [render.com](https://render.com) 并创建 Web Service
2. 连接 Git 仓库
3. 配置设置：
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `node index.js`

### 2. 环境变量

| Name | Value |
|------|-------|
| NODE_ENV | production |
| DATA_PATH | ../data |
| CORS_ORIGIN | `https://your-frontend.vercel.app` |

## 数据存储说明

当前使用 JSON 文件存储数据。生产环境建议：

1. ** Railway/Render 持久化存储**
   - 使用 Railway 的 Persistent Disks
   - 使用 Render 的 Mounted Drives

2. **迁移到数据库**
   - MongoDB Atlas (推荐)
   - PostgreSQL (Supabase)
   - MySQL (PlanetScale)

### 迁移到数据库示例

```javascript
// 安装 MongoDB 驱动
npm install mongodb

// 修改 server/routes/groupData.js
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);
const db = client.db('psi-system');
const collection = db.collection('group-data');

// 使用 Mongoose 也可以
```

## 本地开发

### 1. 安装依赖

```bash
# 根目录安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
```

### 2. 配置环境变量

```bash
# 前端 .env
VITE_API_BASE_URL=http://localhost:5000

# 后端 server/.env
PORT=5000
NODE_ENV=development
DATA_PATH=../data
CORS_ORIGIN=*
```

### 3. 启动服务

```bash
# 终端 1: 启动后端
cd server
node index.js

# 终端 2: 启动前端
npm run dev
```

访问 http://localhost:3000

## 故障排除

### CORS 错误

确保后端的 `CORS_ORIGIN` 环境变量包含前端域名：
```
CORS_ORIGIN=https://your-app.vercel.app
```

### API 请求失败

1. 检查前端环境变量 `VITE_API_BASE_URL` 是否正确
2. 检查后端是否正在运行
3. 检查后端日志是否有错误

### 数据不保存

确保数据目录有写入权限。在生产环境，建议使用持久化存储。

## 监控和日志

- Railway: 内置日志和监控
- Vercel: 内置分析和日志
- 建议添加监控工具如 Sentry
# PSI Management System

PSI (Procurement, Sales, Inventory) 管理系统用于西南欧区域的供应链管理，支持多业务组（ES、IT、FR、PT）建立自己的 PSI 看板，并汇总到区域总看板。

## 技术栈

- **前端**: React + Vite + Ant Design
- **后端**: Node.js + Express
- **数据存储**: JSON 文件

## 安装和启动

### 1. 安装依赖

```bash
# 根目录安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

### 2. 启动应用

```bash
# 启动后端服务器 (端口 5000)
cd server
node index.js

# 在新终端启动前端开发服务器 (端口 3000)
npm run dev
```

### 3. 访问应用

打开浏览器访问 http://localhost:3000

## 功能特性

### 业务组看板
- PSI 表格展示（10 行维度 × 12 个月份）
- 手动输入和 Excel 上传
- 自动计算 Arrival、Closing Stock、MOS 等
- 筛选和折叠功能
- 当月执行进度看板

### 区域总看板
- 月度 PSI 汇总表（按 Category/Series）
- KPI 快照仪表盘

## 文件结构

```
psi-system/
├── server/
│   ├── index.js          # Express 入口
│   ├── routes/
│   │   ├── masterData.js
│   │   ├── groupData.js
│   │   ├── calculate.js
│   │   └── upload.js
│   ├── utils/
│   │   └── calculations.js
│   └── package.json
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── pages/
│   │   ├── GroupDashboard.jsx
│   │   └── RegionalDashboard.jsx
│   ├── components/
│   │   ├── PSITable.jsx
│   │   ├── Sidebar.jsx
│   │   ├── FilterBar.jsx
│   │   └── UploadModal.jsx
│   └── services/
│       └── api.js
├── data/
│   ├── master-data.json
│   ├── ES.json
│   ├── IT.json
│   ├── FR.json

│   ├── PT.json
│   └── mtd-data.json
└── package.json
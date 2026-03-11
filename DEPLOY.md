# 本地启动

## 方式一：分开启动（开发用）

### 1. 启动后端
```bash
cd backend
python phase17_server.py
```
后端运行在 http://localhost:8087

### 2. 启动前端
```bash
cd frontend
npm install
npm run dev
```
前端运行在 http://localhost:3000

## 方式二：合并启动（生产用）

### 1. 构建前端
```bash
cd frontend
npm install
npm run build
```

### 2. 启动合并服务
```bash
cd ..
python backend/server.py
```
访问 http://localhost:8080

## Railway 部署

推送代码到 GitHub 后，在 Railway 连接仓库自动部署。

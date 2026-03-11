FROM python:3.11-slim

# 安装 Node.js 和 npm
RUN apt-get update && apt-get install -y nodejs npm curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制后端文件
COPY requirements.txt .
COPY backend/server.py .
COPY backend/phase17_tweak.py .

# 复制前端源文件
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/index.html ./
COPY frontend/src ./src

# 安装前端依赖并构建
RUN npm install && npm run build

# 构建结果已在 dist/ 目录

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["python", "server.py"]

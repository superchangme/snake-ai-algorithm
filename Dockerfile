FROM python:3.11-slim

# 安装 Node.js
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制后端
COPY backend/ ./backend/
COPY requirements.txt ./

# 复制前端并构建
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# 暴露端口
EXPOSE 8080

# 启动
CMD ["python", "backend/server.py"]

FROM python:3.11-slim

WORKDIR /app

# 安装 Node.js
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# 复制后端
COPY backend/ ./backend/
COPY requirements.txt .

# 复制前端源码
COPY frontend/package*.json frontend/
WORKDIR /app/frontend
RUN npm install

# 构建前端
COPY frontend/src ./src
COPY frontend/index.html .
RUN npm run build

# 复制前端构建结果
WORKDIR /app
COPY frontend/dist ./dist

# 暴露端口
EXPOSE 8080

# 启动
CMD ["python", "backend/server.py"]

FROM python:3.11-slim

WORKDIR /app

# 安装 Node.js
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# 复制后端
COPY backend/ ./backend/
COPY requirements.txt .

# 复制前端源码
COPY frontend/package*.json frontend/
COPY frontend/index.html frontend/

WORKDIR /app/frontend
RUN npm install

COPY frontend/src ./src
RUN npm run build

# 复制前端构建结果到 /app/dist
RUN mkdir -p /app/dist && cp -r dist/* /app/dist/

# 回到 /app
WORKDIR /app

# 暴露端口
EXPOSE 8080

# 启动
CMD ["python", "backend/server.py"]

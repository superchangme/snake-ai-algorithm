FROM python:3.11-slim

WORKDIR /app

# 复制后端
COPY backend/ ./backend/
COPY requirements.txt .

# 复制前端构建结果
COPY frontend/dist ./frontend/dist

# 暴露端口
EXPOSE 8080

# 启动
CMD ["python", "backend/server.py"]

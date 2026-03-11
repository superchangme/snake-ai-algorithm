FROM python:3.11-slim

WORKDIR /app

# 复制文件
COPY requirements.txt .
COPY backend/ ./backend/
COPY dist/ ./dist/

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["python", "backend/server.py"]

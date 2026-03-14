#!/bin/bash
echo "🐍 Snake AI 启动中..."

# 杀掉旧服务
lsof -ti :3000 | xargs -r kill -9
lsof -ti :8080 | xargs -r kill -9
sleep 1

# 启动后端
cd "$(dirname "$0")"
source venv/bin/activate
python main.py > /tmp/snake.log 2>&1 &
sleep 2

# 启动前端
cd frontend
npm run dev > /tmp/snake-frontend.log 2>&1 &
sleep 3

echo "✅ 服务已启动!"
echo "🌐 前端: http://localhost:3000"
echo "🔌 API: http://localhost:8080"

#!/bin/bash
echo "🐍 Snake AI 启动中..."

# 杀掉旧服务
lsof -ti :3000 | xargs -r kill -9 2>/dev/null
lsof -ti :8080 | xargs -r kill -9 2>/dev/null
sleep 1

# 启动后端
cd /Users/tom.chang/code/ai_projects/snake-ai/backend
source ../venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 > /tmp/snake.log 2>&1 &
sleep 2

# 启动前端 (dev模式)
cd /Users/tom.chang/code/ai_projects/snake-ai/frontend
npm run dev > /tmp/snake-frontend.log 2>&1 &
sleep 3

echo "✅ 服务已启动!"
echo "🌐 前端: http://localhost:3000"
echo "🔌 API: http://localhost:8080"

# 贪食蛇 AI

基于路径规划算法的智能贪食蛇游戏。

## 项目结构

```
snake-ai/
├── frontend/     # 前端 (React + TypeScript + Vite)
└── backend/      # 后端 (Python 算法服务)
```

## 快速开始

### 启动前端
```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000/?algorithm=api
```

### 启动后端
```bash
cd backend
python3 phase17_server.py
# 服务端口: 8087
```

## 算法版本

| 版本 | 说明 | 支持网格 |
|------|------|----------|
| Phase17 | Hamilton 路径优化 | 偶数/奇数网格 |
| Phase6 | 纯 Hamilton 路径 | 偶数网格 |

## 测试成绩

| 地图尺寸 | 得分 | 状态 |
|----------|------|------|
| 17×17 | 286/286 | 满分 ✅ |
| 20×20 | 397/397 | 满分 ✅ |
| 19×19 | 348/360 | 97% |
| 15×15 | 220/222 | 99% |

## API 接口

### 请求
```bash
POST http://localhost:8087/move
Content-Type: application/json

{
  "width": 17,
  "height": 17,
  "snake": [[8,8],[8,7],[8,6]],
  "food": [[5,5]]
}
```

### 响应
```json
{
  "move": "right",
  "score": 286,
  "steps": 12971
}
```

## 技术栈

- **前端**: React, TypeScript, Vite
- **后端**: Python 3
- **算法**: Hamilton 路径 + BFS 优化

## 许可证

MIT

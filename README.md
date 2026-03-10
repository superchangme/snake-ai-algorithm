# Snake AI

AI-powered snake game with automatic path planning algorithm.

## Project Structure

```
snake-ai/
├── frontend/     # React + TypeScript (Vite)
└── backend/      # Python algorithm server
```

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000/?algorithm=api
```

### Backend
```bash
cd backend
python3 phase17_server.py
# Server runs on port 8087
```

## Algorithm Versions

| Version | Description | Grid Support |
|---------|-------------|--------------|
| Phase17 | Hamilton path optimization | Even & Odd grids |
| Phase6 | Pure Hamilton | Even grids |

## Test Results

| Map Size | Score | Status |
|----------|-------|--------|
| 17×17 | 286/286 | Perfect ✅ |
| 20×20 | 397/397 | Perfect ✅ |
| 19×19 | 348/360 | 97% |
| 15×15 | 220/222 | 99% |

## API

### Request
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

### Response
```json
{
  "move": "right",
  "score": 286,
  "steps": 12971
}
```

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Python 3
- **Algorithm**: Hamilton path, BFS optimization

## License

MIT

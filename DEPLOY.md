# Snake AI 部署记录

## 本地启动

### 方式一：分开启动（开发用）

#### 1. 启动后端
```bash
cd backend
python phase17_server.py
```
后端运行在 http://localhost:8087

#### 2. 启动前端
```bash
cd frontend
npm install
npm run dev
```
前端运行在 http://localhost:3000

### 方式二：合并启动（生产用）

#### 1. 构建前端
```bash
cd frontend
npm install
npm run build
```

#### 2. 启动合并服务
```bash
cd ..
python backend/server.py
```
访问 http://localhost:8080

---

## Railway 部署心路历程 🚀

### 最终成功配置 (2026-03-12)

**commit**: `26f5f50`

**railpack.json**:
```json
{
  "$schema": "https://schema.railpack.com",
  "packages": {
    "python": "3.13",
    "node": "22"
  },
  "steps": {
    "build": {
      "commands": [
        "cd /app/frontend && npm install && npm run build && mkdir -p /app/dist && cp -r dist/* /app/dist/"
      ]
    }
  }
}
```

**railway.json**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "RAILPACK"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "startCommand": "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT}"
  }
}
```

---

### 踩坑记录

| 日期 | 问题 | 原因 | 解决方案 |
|------|------|------|----------|
| 2026-03-12 | `npm: not found` | Railpack 没有识别 Node.js | 显式声明 `packages.node: "22"` |
| 2026-03-12 | `requirements.txt` 找不到 | 自定义 install 步骤在文件复制前执行 | 移除自定义 install，让 Railpack 自动处理 |
| 2026-03-12 | `vite` 命令找不到 | npm install 没执行 | 把 `npm install && npm run build` 放同一个步骤 |

### 关键教训

1. **不要混用 Nixpacks 语法**: Railpack 是全新的构建器，不能用 `nixpacks.toml` 的 `[phases.setup]` 语法
2. **用 railpack.json**: 格式与 Nixpacks 完全不兼容，必须用 `$schema: "https://schema.railpack.com"`
3. **不要自定义 install**: 文件复制发生在 install 之前，自定义 install 会导致文件找不到
4. **packages 必须显式声明**: 同时用 Python + Node 时，必须显式声明 `packages.python` 和 `packages.node`

### 尝试过的失败方案

1. ❌ `nixpacksConfig.nodejs.version: 22` - Nixpacks 语法
2. ❌ `nixpacksConfig.phases.setup.nixPkgs: ["nodejs_22", "python313"]` - Nixpacks 语法
3. ❌ `railway run npm` - 本地 CLI 命令，不影响云端
4. ❌ `railpack.toml` - 使用了 Nixpacks 语法
5. ❌ 自定义 install 步骤 - 文件还没复制到容器

### 成功要点

- 使用 `railpack.json` (不是 toml)
- 显式声明 `packages.python` 和 `packages.node`
- 不自定义 install，让 Railpack 自动处理依赖安装
- build 步骤中先 `npm install` 再 `npm run build`
- 使用绝对路径 `/app/...`

---

**URL**: https://snake.superchangme.website

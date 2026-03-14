@echo off
echo 🐍 Snake AI 启动中...

REM 杀掉旧服务
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 >nul

REM 启动后端
cd /d %~dp0
call venv\Scripts\activate.bat
start "Snake Backend" cmd /k "python main.py"

REM 启动前端
cd /d %~dp0frontend
start "Snake Frontend" cmd /k "npm run dev"

echo.
echo ✅ 服务已启动!
echo 🌐 前端: http://localhost:3000
echo 🔌 API: http://localhost:8080
pause

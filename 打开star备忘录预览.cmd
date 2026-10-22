@echo off
cd /d "%~dp0"

start "star备忘录预览服务" /min cmd /c "node serve.js"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8765/preview-star.html"

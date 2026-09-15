@echo off
chcp 65001 >nul
title AnesPilot - 麻醉副駕駛
echo ========================================================
echo        AnesPilot (麻醉副駕駛) - 手術室臨床輔助系統
echo ========================================================
echo.
echo [1] 正在為您啟動本地 Web 伺服器 (Port: 3000)...
start /b python -m http.server 3000 --directory "%~dp0" >nul 2>&1
timeout /t 1 >nul
echo [2] 正在開啟瀏覽器...
start http://localhost:3000/
echo.
echo 提示：
echo - 本地網址: http://localhost:3000/
echo - 手機同網段連線: 請在手機瀏覽器輸入此電腦的 IP (例如 http://192.168.x.x:3000)
echo - 單檔離線模式: 亦可直接雙擊開啟 standalone.html
echo.
echo 按任意鍵關閉此視窗...
pause >nul

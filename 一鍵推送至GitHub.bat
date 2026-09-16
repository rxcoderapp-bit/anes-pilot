@echo off
chcp 65001 >nul
title AnesPilot - 推送更新至 GitHub
echo ========================================================
echo        AnesPilot (麻醉副駕駛) - 一鍵更新至 GitHub
echo ========================================================
echo.
cd /d "C:\Users\chunh\.gemini\antigravity\scratch\anes-pilot"

echo 正在檢查本機狀態...
git add -A
git diff-index --quiet HEAD --
if %errorlevel% neq 0 (
    echo 發現未儲存變更，正在自動建立提交...
    git commit -m "chore: auto-commit before push"
)

echo.
echo 正在將最新程式碼同步推送到 GitHub (https://github.com/rxcoderapp-bit/anes-pilot)...
echo 正在執行: git push origin main ...
echo --------------------------------------------------------
git push origin main
set PUSH_STATUS=%errorlevel%
echo --------------------------------------------------------

if %PUSH_STATUS% equ 0 (
    echo.
    echo ========================================================
    echo  [成功] 恭喜！最新版本 (v1.3.0) 已成功同步推送至 GitHub！
    echo  GitHub Pages 將於 1~2 分鐘內自動完成雲端佈署。
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  [推送未完成] 請檢視上方 Git 傳回的具體訊息：
    echo  - 若為瀏覽器登入授權，請依照視窗指示完成登入。
    echo  - 若顯示 rejected，請聯繫 AI 助手為您執行分支合併。
    echo ========================================================
)
echo.
echo 請按任意鍵關閉此視窗...
pause >nul


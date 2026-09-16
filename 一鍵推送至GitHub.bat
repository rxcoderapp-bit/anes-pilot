@echo off
chcp 65001 >nul
title AnesPilot - 推送更新至 GitHub
echo ========================================================
echo        AnesPilot (麻醉副駕駛) - 一鍵更新至 GitHub
echo ========================================================
echo.
echo 正在將最新程式碼同步推送到 GitHub (https://github.com/rxcoderapp-bit/anes-pilot)...
echo.
cd /d "C:\Users\chunh\.gemini\antigravity\scratch\anes-pilot"
echo 正在執行: git push origin main ...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [成功] 恭喜！程式已成功同步推送至 GitHub！
    echo  GitHub Pages 將於 1~2 分鐘內自動完成雲端佈署。
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  [提示] 若跳出 GitHub 登入視窗，請依照畫面完成授權。
    echo ========================================================
)
echo.
echo 按任意鍵關閉此視窗...
pause >nul

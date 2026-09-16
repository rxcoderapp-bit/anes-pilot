@echo off
chcp 65001 >nul
title AnesPilot - 推送更新至 GitHub
echo ========================================================
echo        AnesPilot (麻醉副駕駛) - 一鍵更新至 GitHub
echo ========================================================
echo.
cd /d "C:\Users\chunh\.gemini\antigravity\scratch\anes-pilot"

:: 強制指定 GitHub 認證走 Device 裝置碼模式，徹底停用 127.0.0.1 瀏覽器跳轉
set GCM_GITHUB_AUTHMODES=device
set GCM_OAUTH_FLOW=device

echo 正在檢查本機狀態...
git add -A
git diff-index --quiet HEAD --
if %errorlevel% neq 0 (
    echo 發現未儲存變更，正在自動建立提交...
    git commit -m "chore: auto-commit before push"
)

echo.
echo 正在將最新程式碼同步推送到 GitHub (https://github.com/rxcoderapp-bit/anes-pilot)...
echo.
echo --------------------------------------------------------
echo 【提示】：
echo 若下方出現「enter code: XXXX-XXXX」，請複製該 8 碼，
echo 在瀏覽器開啟的網頁貼上授權，授權後【請稍候此視窗自動推送】！
echo --------------------------------------------------------
echo.
git push origin main
set PUSH_STATUS=%errorlevel%
echo.

if %PUSH_STATUS% equ 0 (
    echo ========================================================
    echo  [成功] 恭喜！最新版本 (v1.3.0) 已成功同步推送至 GitHub！
    echo  GitHub Pages 將於 1~2 分鐘內自動完成雲端佈署。
    echo ========================================================
) else (
    echo ========================================================
    echo  [推送未完成]
    echo  若尚未完成授權，請執行桌面上的「GitHub登入認證.bat」！
    echo ========================================================
)
echo.
echo 請按任意鍵關閉此視窗...
pause >nul

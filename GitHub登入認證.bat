@echo off
chcp 65001 >nul
title GitHub Login Helper
echo ========================================================
echo        AnesPilot - GitHub 帳號一次性安全授權綁定
echo ========================================================
echo.
set GCM_GITHUB_AUTHMODES=device
set GCM_OAUTH_FLOW=device
set GCM_GUI=false
set GCM_NO_UI=1

echo 正在啟動 GitHub 裝置授權模式 (文字主控台模式，無多餘彈窗)...
echo.
echo --------------------------------------------------------
echo 【操作步驟】：
echo 1. 稍後下方會顯示一組 8 碼英數字（例如：ABCD-1234）
echo 2. 同時會自動開啟瀏覽器至 https://github.com/login/device
echo 3. 請在網頁上輸入或貼上該 8 碼代碼，並點擊 Continue 與 Authorize
echo 4. 在網頁授權完成後，此視窗將自動偵測並儲存金鑰！
echo --------------------------------------------------------
echo.
"C:\Program Files\Git\mingw64\bin\git-credential-manager.exe" github login --device --no-ui
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo  [成功] 恭喜！GitHub 帳號已成功綁定至 Windows 憑證庫！
    echo  現在您可以關閉此視窗，並執行「一鍵推送至GitHub.bat」！
    echo ========================================================
) else (
    echo ========================================================
    echo  [未完成] 授權未完成或逾時，請再次執行本程式重試。
    echo ========================================================
)
echo.
echo 請按任意鍵關閉此視窗...
pause >nul

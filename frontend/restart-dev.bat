@echo off
echo ========================================
echo Clearing Vite cache and restarting...
echo ========================================

echo.
echo [1/3] Stopping any running Vite processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *vite*" 2>nul

echo.
echo [2/3] Clearing Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Cache cleared successfully!
) else (
    echo No cache found, skipping...
)

echo.
echo [3/3] Starting development server...
echo.
echo ========================================
echo Server will start on http://localhost:5174
echo ========================================
echo.
echo IMPORTANT: After server starts:
echo 1. Open browser to http://localhost:5174
echo 2. Press Ctrl+Shift+R to hard refresh
echo 3. Open DevTools (F12) and check Console
echo ========================================
echo.

npm run dev

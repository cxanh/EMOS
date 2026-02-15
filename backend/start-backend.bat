@echo off
echo ========================================
echo Starting EOMS Backend Server
echo ========================================
echo.
echo Checking for port conflicts...
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo WARNING: Port 3000 is already in use!
    echo Please stop the process using port 3000 first.
    echo.
    echo To find the process:
    echo   netstat -ano ^| findstr :3000
    echo.
    echo To kill the process:
    echo   taskkill /F /PID [PID_NUMBER]
    echo.
    pause
    exit /b 1
)

echo Port 3000 is available.
echo.
echo Starting server...
echo ========================================
npm run dev

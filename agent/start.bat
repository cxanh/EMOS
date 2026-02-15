@echo off
REM EOMS Agent 启动脚本 (Windows)

echo Starting EOMS Agent...

REM 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed
    exit /b 1
)

REM 检查虚拟环境
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 安装依赖
echo Installing dependencies...
pip install -r requirements.txt

REM 启动 Agent
echo Starting agent...
python agent.py

#!/bin/bash
# EOMS Agent 启动脚本

echo "Starting EOMS Agent..."

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# 检查依赖
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "Installing dependencies..."
pip install -r requirements.txt

# 启动 Agent
echo "Starting agent..."
python3 agent.py

#!/bin/bash

echo "========================================"
echo "EOMS 系统测试脚本"
echo "========================================"
echo ""

echo "[1/5] 测试后端数据库连接..."
cd backend
node test-connection.js
if [ $? -ne 0 ]; then
    echo "❌ 后端连接测试失败"
    exit 1
fi
echo "✅ 后端连接测试通过"
echo ""

echo "[2/5] 检查后端依赖..."
npm list --depth=0 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  后端依赖可能有问题，请检查"
else
    echo "✅ 后端依赖完整"
fi
echo ""

cd ..

echo "[3/5] 检查前端依赖..."
cd frontend
npm list --depth=0 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  前端依赖可能有问题，请检查"
else
    echo "✅ 前端依赖完整"
fi
echo ""

cd ..

echo "[4/5] 检查 Agent Python 语法..."
cd agent
python3 -m py_compile agent.py
if [ $? -ne 0 ]; then
    echo "❌ Agent 语法检查失败"
    exit 1
fi
python3 -m py_compile collectors/cpu.py collectors/memory.py collectors/disk.py collectors/network.py
if [ $? -ne 0 ]; then
    echo "❌ Agent 采集器语法检查失败"
    exit 1
fi
echo "✅ Agent 语法检查通过"
echo ""

cd ..

echo "[5/5] 检查 Python 依赖..."
cd agent
pip3 show psutil > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  psutil 未安装，请运行: pip3 install -r requirements.txt"
else
    echo "✅ psutil 已安装"
fi

pip3 show requests > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  requests 未安装，请运行: pip3 install -r requirements.txt"
else
    echo "✅ requests 已安装"
fi

pip3 show pyyaml > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  pyyaml 未安装，请运行: pip3 install -r requirements.txt"
else
    echo "✅ pyyaml 已安装"
fi

cd ..

echo ""
echo "========================================"
echo "测试完成！"
echo "========================================"
echo ""
echo "下一步："
echo "1. 启动后端: cd backend && npm run dev"
echo "2. 启动 Agent: cd agent && python3 agent.py"
echo "3. 启动前端: cd frontend && npm run dev"
echo ""

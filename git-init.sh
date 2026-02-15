#!/bin/bash

echo "========================================"
echo "EOMS 项目 Git 初始化脚本"
echo "========================================"
echo ""

echo "[1/6] 初始化 Git 仓库..."
git init
if [ $? -ne 0 ]; then
    echo "❌ Git 初始化失败，请确保已安装 Git"
    exit 1
fi
echo "✅ Git 仓库初始化成功"
echo ""

echo "[2/6] 添加文件到暂存区..."
git add .
if [ $? -ne 0 ]; then
    echo "❌ 添加文件失败"
    exit 1
fi
echo "✅ 文件添加成功"
echo ""

echo "[3/6] 查看将要提交的文件..."
git status
echo ""

echo "[4/6] 提交到本地仓库..."
git commit -m "Initial commit: EOMS distributed monitoring system"
if [ $? -ne 0 ]; then
    echo "❌ 提交失败"
    exit 1
fi
echo "✅ 提交成功"
echo ""

echo "[5/6] 设置默认分支为 main..."
git branch -M main
echo "✅ 分支设置成功"
echo ""

echo "[6/6] 准备推送到远程仓库..."
echo ""
echo "========================================"
echo "接下来需要手动执行以下命令："
echo "========================================"
echo ""
echo "1. 在 GitHub 创建新仓库"
echo "2. 复制仓库地址"
echo "3. 执行以下命令（替换为你的仓库地址）："
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "   git push -u origin main"
echo ""
echo "========================================"
echo ""

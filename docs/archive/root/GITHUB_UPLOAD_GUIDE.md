> 历史记录/非当前基线
>
> 本文档为项目根目录迁移出的历史材料，仅用于追溯阶段背景、问题修复或功能完成过程。
> 当前项目入口与有效文档请以根目录 `README.md`、`DOCS.md` 和 `docs/` 目录中的 SSOT 文档为准。
# GitHub 上传指南

本指南将帮助你将EOMS项目上传到GitHub。

---

## 📋 准备工作

### 1. 安装Git

如果还没有安装Git，请先安装：

**Windows**:
- 下载：https://git-scm.com/download/win
- 安装后打开Git Bash

**验证安装**:
```bash
git --version
```

### 2. 配置Git

首次使用需要配置用户信息：

```bash
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub邮箱"
```

### 3. 创建GitHub账号

如果还没有GitHub账号：
1. 访问 https://github.com
2. 点击 "Sign up" 注册
3. 验证邮箱

---

## 🚀 上传步骤

### 步骤1: 创建GitHub仓库

1. 登录GitHub
2. 点击右上角 "+" → "New repository"
3. 填写仓库信息：
   - **Repository name**: `EOMS` 或 `distributed-monitoring-system`
   - **Description**: `基于分布式架构的智能运维监控系统 | Enterprise Operations Monitoring System`
   - **Public/Private**: 选择 Public（公开）或 Private（私有）
   - **不要勾选** "Initialize this repository with a README"
4. 点击 "Create repository"

### 步骤2: 初始化本地仓库

在项目根目录打开终端（Git Bash或PowerShell），执行：

```bash
# 初始化Git仓库
git init

# 查看状态
git status
```

### 步骤3: 添加文件到暂存区

```bash
# 添加所有文件（.gitignore会自动排除不需要的文件）
git add .

# 查看将要提交的文件
git status
```

### 步骤4: 提交到本地仓库

```bash
# 提交更改
git commit -m "Initial commit: EOMS distributed monitoring system"
```

### 步骤5: 关联远程仓库

将下面的命令中的 `YOUR_USERNAME` 和 `YOUR_REPO_NAME` 替换为你的实际信息：

```bash
# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 验证远程仓库
git remote -v
```

### 步骤6: 推送到GitHub

```bash
# 推送到GitHub（首次推送）
git push -u origin main
```

如果提示分支名称是 `master` 而不是 `main`，使用：
```bash
git branch -M main
git push -u origin main
```

---

## ⚠️ 重要提醒

### 1. 检查敏感信息

在上传前，确保已经排除了敏感信息：

✅ **已排除**（在.gitignore中）:
- `.env` 文件（包含数据库密码、API密钥等）
- `node_modules/` 文件夹
- `logs/` 日志文件
- `__pycache__/` Python缓存
- `graduation_design/` 毕业设计文档（包含个人信息）

⚠️ **需要检查**:
- 代码中是否有硬编码的密码
- 配置文件中是否有真实的IP地址
- 文档中是否有个人隐私信息

### 2. 创建示例配置文件

为了让其他人能够运行你的项目，需要提供示例配置：

**backend/.env.example** (已存在):
```env
PORT=50001
JWT_SECRET=your-secret-key-here
REDIS_HOST=localhost
REDIS_PORT=6379
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-influxdb-token
INFLUX_ORG=eoms
INFLUX_BUCKET=metrics
```

**frontend/.env.example**:
```env
VITE_API_BASE_URL=http://localhost:50001
VITE_WS_URL=ws://localhost:50001
```

### 3. 更新README.md

确保README.md包含完整的项目说明（已存在）。

---

## 📝 后续维护

### 日常提交流程

```bash
# 1. 查看修改的文件
git status

# 2. 添加修改的文件
git add .

# 3. 提交更改
git commit -m "描述你的修改内容"

# 4. 推送到GitHub
git push
```

### 常用Git命令

```bash
# 查看提交历史
git log

# 查看远程仓库
git remote -v

# 拉取最新代码
git pull

# 创建新分支
git checkout -b feature-name

# 切换分支
git checkout main

# 合并分支
git merge feature-name

# 查看差异
git diff
```

---

## 🔧 常见问题

### Q1: 推送时要求输入用户名和密码

**解决方案**:
GitHub已不再支持密码认证，需要使用Personal Access Token (PAT)。

1. 访问 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 设置权限（至少勾选 `repo`）
4. 生成并复制token
5. 推送时使用token作为密码

**或者使用SSH**:
```bash
# 生成SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 添加到GitHub
# 复制 ~/.ssh/id_ed25519.pub 的内容
# 到 GitHub → Settings → SSH and GPG keys → New SSH key

# 修改远程仓库地址为SSH
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

### Q2: 文件太大无法上传

GitHub单个文件限制100MB。

**解决方案**:
- 检查是否误提交了 `node_modules/` 或其他大文件
- 使用 Git LFS 处理大文件
- 将大文件添加到 `.gitignore`

### Q3: 提交了敏感信息怎么办

**解决方案**:
```bash
# 从历史记录中删除文件
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch PATH_TO_FILE" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送
git push origin --force --all
```

**更好的方法**: 使用 BFG Repo-Cleaner
```bash
# 下载 BFG
# https://rtyley.github.io/bfg-repo-cleaner/

# 删除敏感文件
java -jar bfg.jar --delete-files YOUR_FILE

# 清理
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 强制推送
git push --force
```

### Q4: 想要忽略已经提交的文件

```bash
# 从Git中删除但保留本地文件
git rm --cached FILE_NAME

# 添加到.gitignore
echo "FILE_NAME" >> .gitignore

# 提交更改
git commit -m "Remove FILE_NAME from tracking"
git push
```

---

## 🎯 推荐的仓库设置

### 1. 添加仓库描述

在GitHub仓库页面：
- 点击 "About" 旁边的设置图标
- 添加描述和标签

**建议描述**:
```
基于分布式架构的智能运维监控系统，支持多节点监控、智能告警、AI分析等功能。
A distributed monitoring system with intelligent alerting and AI-powered analysis.
```

**建议标签**:
```
monitoring, distributed-system, operations, devops, vue3, nodejs, influxdb, redis, ai, alerting
```

### 2. 添加Topics

在仓库页面添加相关主题标签，提高可发现性。

### 3. 启用Issues和Discussions

- Issues: 用于bug报告和功能请求
- Discussions: 用于社区讨论

### 4. 添加README徽章

在README.md顶部添加徽章：

```markdown
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen.svg)
![Python](https://img.shields.io/badge/python-3.x-blue.svg)
```

---

## 📚 参考资源

- [Git官方文档](https://git-scm.com/doc)
- [GitHub官方文档](https://docs.github.com)
- [Git教程 - 廖雪峰](https://www.liaoxuefeng.com/wiki/896043488029600)
- [GitHub Desktop](https://desktop.github.com/) - 图形化Git工具

---

## ✅ 上传检查清单

上传前请确认：

- [ ] 已安装并配置Git
- [ ] 已创建GitHub仓库
- [ ] 已检查并排除敏感信息
- [ ] 已创建.gitignore文件
- [ ] 已创建LICENSE文件
- [ ] README.md内容完整
- [ ] .env.example文件已创建
- [ ] 已测试项目可以正常运行
- [ ] 文档清晰易懂

---

**祝你上传顺利！** 🎉

如有问题，可以参考GitHub官方文档或在Issues中提问。


# 📊 InfluxDB 安装和配置指南

**系统**: Windows  
**InfluxDB 版本**: 2.x  
**用途**: 存储历史监控数据

---

## 📋 目录

1. [为什么需要 InfluxDB](#为什么需要-influxdb)
2. [下载和安装](#下载和安装)
3. [启动 InfluxDB](#启动-influxdb)
4. [初始化配置](#初始化配置)
5. [验证安装](#验证安装)
6. [常见问题](#常见问题)

---

## 🎯 为什么需要 InfluxDB

### 当前系统状态

| 功能 | Redis | InfluxDB |
|------|-------|----------|
| 实时数据 | ✅ 支持 | ❌ 不需要 |
| 最新数据 | ✅ 支持 | ❌ 不需要 |
| 历史数据 | ❌ 不支持 | ✅ 需要 |
| 数据查询 | ✅ 简单查询 | ✅ 复杂查询 |
| 时间范围查询 | ❌ 不支持 | ✅ 支持 |

### 影响范围

**没有 InfluxDB 时**:
- ✅ 实时监控正常
- ✅ 最新数据显示正常
- ❌ 无法查看历史数据
- ❌ 无法查看趋势图表
- ❌ 无法进行时间范围查询

**有 InfluxDB 时**:
- ✅ 所有功能完整可用
- ✅ 可以查看任意时间段的数据
- ✅ 可以进行数据分析
- ✅ 可以生成报表

---

## 📥 下载和安装

### 方法 1: 使用官方安装包（推荐）

#### 步骤 1: 下载 InfluxDB

访问官方下载页面：
```
https://portal.influxdata.com/downloads/
```

或直接下载 Windows 版本：
```
https://dl.influxdata.com/influxdb/releases/influxdb2-2.7.5-windows.zip
```

#### 步骤 2: 解压文件

1. 下载完成后，解压 ZIP 文件
2. 建议解压到: `C:\Program Files\InfluxDB\`
3. 或者解压到项目目录: `C:\Users\ASUS\Desktop\毕设\EOMS\influxdb\`

#### 步骤 3: 添加到环境变量（可选）

1. 右键"此电脑" → "属性"
2. 点击"高级系统设置"
3. 点击"环境变量"
4. 在"系统变量"中找到"Path"
5. 添加 InfluxDB 的路径，例如: `C:\Program Files\InfluxDB\`

---

### 方法 2: 使用 Chocolatey（如果已安装）

```powershell
# 以管理员身份运行 PowerShell
choco install influxdb
```

---

### 方法 3: 使用 Docker（推荐用于开发）

```bash
# 拉取 InfluxDB 镜像
docker pull influxdb:2.7

# 运行 InfluxDB 容器
docker run -d -p 8086:8086 ^
  --name influxdb ^
  -v influxdb-data:/var/lib/influxdb2 ^
  -v influxdb-config:/etc/influxdb2 ^
  influxdb:2.7
```

---

## 🚀 启动 InfluxDB

### 方法 1: 直接启动（开发环境）

#### 打开新的终端窗口

```powershell
# 导航到 InfluxDB 目录
cd "C:\Program Files\InfluxDB"

# 或者如果在项目目录
cd C:\Users\ASUS\Desktop\毕设\EOMS\influxdb

# 启动 InfluxDB
.\influxd.exe
```

**预期输出**:
```
2026-02-09T19:45:00.000Z	info	Welcome to InfluxDB	{"log_id": "..."}
2026-02-09T19:45:00.000Z	info	Starting HTTP server	{"log_id": "...", "addr": ":8086"}
2026-02-09T19:45:00.000Z	info	Listening	{"log_id": "...", "transport": "http", "addr": ":8086"}
```

✅ **看到 "Listening" 表示启动成功！**

---

### 方法 2: 后台启动（生产环境）

#### 创建启动脚本

创建文件 `start-influxdb.bat`:
```batch
@echo off
echo Starting InfluxDB...
cd "C:\Program Files\InfluxDB"
start /B influxd.exe > influxdb.log 2>&1
echo InfluxDB started in background
echo Log file: influxdb.log
```

#### 运行脚本
```bash
start-influxdb.bat
```

---

### 方法 3: 使用 Windows 服务（推荐）

#### 安装为 Windows 服务

```powershell
# 以管理员身份运行
sc create InfluxDB binPath= "C:\Program Files\InfluxDB\influxd.exe" start= auto
sc start InfluxDB
```

#### 管理服务

```powershell
# 启动服务
sc start InfluxDB

# 停止服务
sc stop InfluxDB

# 查看状态
sc query InfluxDB
```

---

## ⚙️ 初始化配置

### 首次启动配置

#### 步骤 1: 访问 Web UI

启动 InfluxDB 后，打开浏览器访问：
```
http://localhost:8086
```

#### 步骤 2: 初始化设置

1. **用户名**: admin
2. **密码**: admin123456（至少 8 位）
3. **组织名**: eoms
4. **Bucket 名**: metrics
5. 点击"Continue"

#### 步骤 3: 获取 Token

1. 初始化完成后，会显示一个 Token
2. **重要**: 复制并保存这个 Token
3. 这个 Token 用于 API 访问

#### 步骤 4: 更新后端配置

编辑 `backend/.env`:
```env
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=你的Token（从Web UI复制）
INFLUX_ORG=eoms
INFLUX_BUCKET=metrics
```

---

## ✅ 验证安装

### 1. 检查服务状态

```powershell
# 检查端口是否监听
netstat -ano | findstr :8086
```

**预期输出**:
```
TCP    0.0.0.0:8086           0.0.0.0:0              LISTENING       12345
```

### 2. 访问 Web UI

打开浏览器访问: http://localhost:8086

**预期结果**:
- ✅ 可以看到登录页面
- ✅ 可以使用 admin 账号登录
- ✅ 可以看到仪表盘

### 3. 测试 API 连接

```powershell
# 使用 curl 测试
curl http://localhost:8086/health
```

**预期响应**:
```json
{
  "name": "influxdb",
  "message": "ready for queries and writes",
  "status": "pass",
  "checks": [],
  "version": "2.7.5",
  "commit": "..."
}
```

### 4. 测试后端连接

重启后端服务，检查日志：

**预期日志**:
```
InfluxDB Client Connected
Data Store Service Initialized
```

**不应该看到**:
```
Error: connect ECONNREFUSED 127.0.0.1:8086
```

---

## 🔧 配置详解

### InfluxDB 配置文件

默认配置文件位置:
- Windows: `%USERPROFILE%\.influxdbv2\configs`
- 或: `C:\Users\ASUS\.influxdbv2\configs`

### 后端配置

`backend/.env`:
```env
# InfluxDB 配置
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=你的Token
INFLUX_ORG=eoms
INFLUX_BUCKET=metrics
```

### 验证配置

编辑 `backend/test-connection.js` 并运行：
```bash
cd backend
node test-connection.js
```

---

## 🐛 常见问题

### Q1: 端口 8086 被占用

**错误信息**:
```
Error: listen EADDRINUSE: address already in use :::8086
```

**解决方案**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr :8086

# 结束进程
taskkill /F /PID [进程ID]
```

### Q2: 无法访问 Web UI

**可能原因**:
1. InfluxDB 未启动
2. 防火墙阻止
3. 端口配置错误

**解决方案**:
```powershell
# 检查进程
Get-Process influxd -ErrorAction SilentlyContinue

# 检查端口
netstat -ano | findstr :8086

# 检查防火墙
# 添加防火墙规则允许 8086 端口
```

### Q3: Token 丢失或忘记

**解决方案**:

方法 1: 从 Web UI 重新生成
1. 登录 http://localhost:8086
2. 点击左侧菜单 "API Tokens"
3. 点击 "Generate API Token"
4. 选择 "All Access API Token"
5. 复制新的 Token

方法 2: 使用 CLI
```bash
influx auth list
```

### Q4: 数据写入失败

**错误信息**:
```
Error writing to InfluxDB: unauthorized access
```

**解决方案**:
1. 检查 Token 是否正确
2. 检查 Org 和 Bucket 名称
3. 检查 Token 权限

### Q5: InfluxDB 启动失败

**可能原因**:
1. 端口被占用
2. 权限不足
3. 配置文件错误

**解决方案**:
```powershell
# 以管理员身份运行
# 检查日志文件
type influxdb.log

# 重置配置
rm -r %USERPROFILE%\.influxdbv2
```

---

## 📊 数据管理

### 查看数据

1. 登录 Web UI: http://localhost:8086
2. 点击左侧 "Data Explorer"
3. 选择 Bucket: metrics
4. 选择 Measurement: system_metrics
5. 点击 "Submit" 查看数据

### 删除数据

```bash
# 使用 CLI 删除数据
influx delete --bucket metrics --start 2026-01-01T00:00:00Z --stop 2026-12-31T23:59:59Z
```

### 备份数据

```bash
# 备份
influx backup backup-folder/

# 恢复
influx restore backup-folder/
```

---

## 🚀 快速启动脚本

创建 `start-influxdb.bat`:
```batch
@echo off
echo ========================================
echo Starting InfluxDB
echo ========================================
echo.

REM 检查 InfluxDB 是否已在运行
netstat -ano | findstr :8086 >nul
if %errorlevel% equ 0 (
    echo InfluxDB is already running on port 8086
    echo.
    echo Access Web UI: http://localhost:8086
    pause
    exit /b 0
)

echo Starting InfluxDB server...
cd "C:\Program Files\InfluxDB"
start "InfluxDB" influxd.exe

echo.
echo Waiting for InfluxDB to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo InfluxDB Started Successfully!
echo ========================================
echo.
echo Web UI: http://localhost:8086
echo API: http://localhost:8086/api/v2
echo.
echo Press any key to exit...
pause >nul
```

---

## 📚 相关资源

### 官方文档
- [InfluxDB 官方文档](https://docs.influxdata.com/influxdb/v2.7/)
- [InfluxDB 下载页面](https://portal.influxdata.com/downloads/)
- [InfluxDB API 文档](https://docs.influxdata.com/influxdb/v2.7/api/)

### 教程
- [InfluxDB 快速入门](https://docs.influxdata.com/influxdb/v2.7/get-started/)
- [InfluxDB 查询语言 (Flux)](https://docs.influxdata.com/flux/v0.x/)

---

## ✅ 安装检查清单

完成以下步骤确认 InfluxDB 正常工作：

- [ ] InfluxDB 已下载并解压
- [ ] InfluxDB 服务已启动
- [ ] 可以访问 Web UI (http://localhost:8086)
- [ ] 已完成初始化配置
- [ ] 已创建组织 (eoms)
- [ ] 已创建 Bucket (metrics)
- [ ] 已获取并保存 Token
- [ ] 已更新 backend/.env 配置
- [ ] 后端可以连接到 InfluxDB
- [ ] 数据可以正常写入
- [ ] 可以在 Web UI 中查看数据

---

## 💡 提示

### 开发环境建议
- 使用直接启动方式（方便调试）
- 保持终端窗口打开（可以看到日志）
- 使用 Web UI 监控数据

### 生产环境建议
- 安装为 Windows 服务
- 配置自动启动
- 设置日志轮转
- 定期备份数据

---

**创建时间**: 2026-02-09  
**最后更新**: 2026-02-09  
**适用版本**: InfluxDB 2.x

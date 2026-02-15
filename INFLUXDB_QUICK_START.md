# 🚀 InfluxDB 快速启动指南

**5 分钟快速上手**

---

## 📥 第一步：下载 InfluxDB

### 下载地址
```
https://dl.influxdata.com/influxdb/releases/influxdb2-2.7.5-windows.zip
```

或访问官网：https://portal.influxdata.com/downloads/

---

## 📂 第二步：解压文件

1. 下载完成后，解压 ZIP 文件
2. 建议解压到项目目录：
   ```
   C:\Users\ASUS\Desktop\毕设\EOMS\influxdb\
   ```

---

## ▶️ 第三步：启动 InfluxDB

### 打开新的 PowerShell 或 CMD 窗口

```bash
# 导航到 InfluxDB 目录
cd C:\Users\ASUS\Desktop\毕设\EOMS\influxdb

# 启动 InfluxDB
influxd.exe
```

**看到以下信息表示启动成功**:
```
info	Listening	{"transport": "http", "addr": ":8086"}
```

⚠️ **保持这个窗口打开！** 关闭窗口会停止 InfluxDB。

---

## ⚙️ 第四步：初始化配置

### 1. 打开浏览器

访问: http://localhost:8086

### 2. 填写初始化信息

- **Username**: admin
- **Password**: admin123456（至少 8 位）
- **Organization Name**: eoms
- **Bucket Name**: metrics

### 3. 点击 "Continue"

### 4. 复制 Token

⚠️ **重要**: 会显示一个很长的 Token，复制并保存它！

示例：
```
9KjMbmAYxfBlqnkWzeEWrdpwFz1OXvkm9lRZ9ZDXzEngRZ3UZuNmO43bKBdokwesmR3JD_8Rdb99loOKNTrs4w==
```

---

## 🔧 第五步：更新后端配置

### 编辑 `backend/.env` 文件

找到 InfluxDB 配置部分，更新 Token：

```env
# InfluxDB 配置
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=你刚才复制的Token
INFLUX_ORG=eoms
INFLUX_BUCKET=metrics
```

**示例**:
```env
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=9KjMbmAYxfBlqnkWzeEWrdpwFz1OXvkm9lRZ9ZDXzEngRZ3UZuNmO43bKBdokwesmR3JD_8Rdb99loOKNTrs4w==
INFLUX_ORG=eoms
INFLUX_BUCKET=metrics
```

---

## ✅ 第六步：验证

### 1. 后端会自动重启（nodemon）

检查后端日志，应该看到：
```
InfluxDB Client Connected
Data Store Service Initialized
```

**不应该再看到**:
```
Error: connect ECONNREFUSED 127.0.0.1:8086
```

### 2. 检查数据写入

等待几秒钟，然后：

1. 访问 http://localhost:8086
2. 登录（admin / admin123456）
3. 点击左侧 "Data Explorer"
4. 选择 Bucket: metrics
5. 应该能看到数据！

---

## 🎉 完成！

现在你的系统完全正常了：

- ✅ 后端运行正常
- ✅ Agent 采集数据
- ✅ Redis 存储实时数据
- ✅ InfluxDB 存储历史数据
- ✅ 前端显示所有数据

---

## 🔄 日常使用

### 启动 InfluxDB

每次开机后需要启动 InfluxDB：

```bash
cd C:\Users\ASUS\Desktop\毕设\EOMS\influxdb
influxd.exe
```

### 停止 InfluxDB

在 InfluxDB 窗口按 `Ctrl + C`

---

## 🐛 遇到问题？

### 问题 1: 端口 8086 被占用

```bash
# 查找占用的进程
netstat -ano | findstr :8086

# 结束进程（替换 PID）
taskkill /F /PID [进程ID]
```

### 问题 2: 忘记 Token

1. 登录 http://localhost:8086
2. 点击左侧 "API Tokens"
3. 点击 "Generate API Token"
4. 选择 "All Access API Token"
5. 复制新的 Token
6. 更新 `backend/.env`

### 问题 3: 后端还是报错

1. 确认 InfluxDB 正在运行
2. 确认 Token 正确（没有多余空格）
3. 重启后端服务

---

## 📚 详细文档

查看完整文档: [InfluxDB安装和配置指南.md](docs/InfluxDB安装和配置指南.md)

---

**就这么简单！** 🎊

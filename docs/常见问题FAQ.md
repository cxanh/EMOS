# ❓ 常见问题 FAQ

**最后更新**: 2026-02-07

---

## 🖥️ Windows 相关问题

### Q1: 测试脚本显示乱码怎么办？

**问题描述**:
运行 `test-all.bat` 时，中文字符显示为乱码：
```
EOMS 绯荤粺娴嬭瘯鑴氭湰
娴嬭瘯鍚庣鏁版嵁搴撹繛鎺?
```

**原因**:
Windows CMD 默认使用 GBK 编码，而脚本文件使用 UTF-8 编码，导致中文显示乱码。

**解决方案**:

**方案 1: 使用 PowerShell 中文版（推荐）**
```powershell
.\test-all-cn.ps1
```

如果提示执行策略错误：
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**方案 2: 使用 CMD 英文版**
```cmd
.\test-all.bat
```
此版本使用英文输出，避免乱码问题。

**方案 3: 修改 CMD 编码（临时）**
```cmd
chcp 65001
.\test-all.bat
```

---

### Q2: PowerShell 无法运行脚本？

**问题描述**:
```
.\test-all-cn.ps1 : 无法加载文件，因为在此系统上禁止运行脚本
```

**原因**:
PowerShell 执行策略限制。

**解决方案**:
```powershell
# 查看当前策略
Get-ExecutionPolicy

# 设置为允许本地脚本
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# 确认更改
Get-ExecutionPolicy
```

---

### Q3: npm 命令找不到？

**问题描述**:
```
'npm' 不是内部或外部命令
```

**原因**:
Node.js 未安装或未添加到 PATH。

**解决方案**:
1. 下载并安装 Node.js 18+ from https://nodejs.org/
2. 重启终端
3. 验证安装：
```cmd
node --version
npm --version
```

---

### Q4: python 命令找不到？

**问题描述**:
```
'python' 不是内部或外部命令
```

**原因**:
Python 未安装或未添加到 PATH。

**解决方案**:
1. 下载并安装 Python 3.8+ from https://www.python.org/
2. 安装时勾选 "Add Python to PATH"
3. 重启终端
4. 验证安装：
```cmd
python --version
pip --version
```

---

## 🔌 数据库连接问题

### Q5: Redis 连接失败？

**问题描述**:
```
Redis connection failed: ECONNREFUSED
```

**原因**:
Redis 服务未启动。

**解决方案**:

**Windows**:
```cmd
# 下载 Redis for Windows
# https://github.com/microsoftarchive/redis/releases

# 启动 Redis
redis-server.exe
```

**Linux**:
```bash
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS**:
```bash
brew services start redis
```

**验证**:
```bash
redis-cli ping
# 应返回: PONG
```

---

### Q6: InfluxDB 连接失败？

**问题描述**:
```
InfluxDB connection failed
```

**原因**:
InfluxDB 未安装或未配置。

**解决方案**:

1. **安装 InfluxDB 2.x**

Windows:
- 下载 from https://www.influxdata.com/downloads/
- 运行安装程序

Linux:
```bash
wget https://dl.influxdata.com/influxdb/releases/influxdb2-2.7.1-amd64.deb
sudo dpkg -i influxdb2-2.7.1-amd64.deb
sudo systemctl start influxdb
```

macOS:
```bash
brew install influxdb
brew services start influxdb
```

2. **初始化 InfluxDB**
- 访问 http://localhost:8086
- 创建用户和组织
- 创建 Bucket: metrics
- 生成 Token

3. **配置环境变量**
编辑 `backend/.env`:
```env
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-token-here
INFLUX_ORG=eoms
INFLUX_BUCKET=metrics
```

4. **重启后端**
```bash
cd backend
npm run dev
```

---

## 📦 依赖安装问题

### Q7: npm install 失败？

**问题描述**:
```
npm ERR! network timeout
```

**原因**:
网络问题或 npm 源速度慢。

**解决方案**:

**方案 1: 使用淘宝镜像**
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

**方案 2: 使用 cnpm**
```bash
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

**方案 3: 清除缓存重试**
```bash
npm cache clean --force
npm install
```

---

### Q8: pip install 失败？

**问题描述**:
```
pip install 超时或失败
```

**原因**:
网络问题或 PyPI 源速度慢。

**解决方案**:

**方案 1: 使用清华镜像**
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**方案 2: 配置永久镜像**
```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pip install -r requirements.txt
```

**方案 3: 使用代理**
```bash
pip install -r requirements.txt --proxy http://proxy.example.com:8080
```

---

## 🚀 启动问题

### Q9: 前端报错 "Failed to resolve import @/..."？

**问题描述**:
```
Failed to resolve import "@/stores/user" from "src/App.vue"
```

**原因**:
Vite 配置缺少路径别名配置。

**解决方案**:
已修复，确保以下配置正确：

1. **vite.config.ts**:
```typescript
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

2. **tsconfig.app.json**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

3. **重启开发服务器**:
```bash
cd frontend
npm run dev
```

---

### Q10: 后端启动失败？

**问题描述**:
```
Error: Cannot find module 'express'
```

**原因**:
依赖未安装。

**解决方案**:
```bash
cd backend
npm install
npm run dev
```

---

### Q10: 后端启动失败？

**问题描述**:
```
Error: Cannot find module 'express'
```

**原因**:
依赖未安装。

**解决方案**:
```bash
cd backend
npm install
npm run dev
```

---

### Q11: Agent 启动失败？

**问题描述**:
```
ModuleNotFoundError: No module named 'psutil'
```

**原因**:
Python 依赖未安装。

**解决方案**:
```bash
cd agent
pip install -r requirements.txt
python agent.py
```

---

### Q12: 前端启动失败？

**问题描述**:
```
Error: Cannot find module 'vue'
```

**原因**:
依赖未安装。

**解决方案**:
```bash
cd frontend
npm install
npm run dev
```

---

### Q13: 端口被占用？

**问题描述**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**原因**:
端口已被其他程序占用。

**解决方案**:

**Windows**:
```cmd
# 查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程（替换 PID）
taskkill /PID <PID> /F
```

**Linux/Mac**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 结束进程
kill -9 <PID>
```

**或者修改端口**:
编辑 `backend/.env`:
```env
PORT=3001
```

---

## 🌐 前端访问问题

### Q13: 前端无法访问后端 API？

**问题描述**:
```
Network Error: ERR_CONNECTION_REFUSED
```

**原因**:
后端服务未启动或地址配置错误。

**解决方案**:

1. **确认后端已启动**
```bash
cd backend
npm run dev
```

2. **检查前端配置**
编辑 `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3000
```

3. **检查 CORS 配置**
确保 `backend/index.js` 中启用了 CORS。

---

### Q14: WebSocket 连接失败？

**问题描述**:
```
WebSocket connection failed
```

**原因**:
后端 WebSocket 服务未启动。

**解决方案**:

1. 确认后端已启动
2. 检查 WebSocket 地址
3. 查看浏览器控制台错误信息

---

## 📊 数据问题

### Q15: 前端显示无数据？

**问题描述**:
前端页面显示"暂无数据"。

**原因**:
Agent 未启动或未上报数据。

**解决方案**:

1. **启动 Agent**
```bash
cd agent
python agent.py
```

2. **检查 Agent 日志**
查看是否有错误信息。

3. **检查后端日志**
确认是否收到数据。

4. **检查浏览器控制台**
查看 API 请求是否成功。

---

### Q16: 历史数据查询失败？

**问题描述**:
历史查询返回空数据。

**原因**:
InfluxDB 未配置或无历史数据。

**解决方案**:

1. **配置 InfluxDB**
参考 Q6

2. **等待数据积累**
Agent 需要运行一段时间才有历史数据。

3. **检查时间范围**
确保查询的时间范围内有数据。

---

## 🔐 认证问题

### Q17: 登录失败？

**问题描述**:
```
Invalid username or password
```

**原因**:
用户名或密码错误。

**解决方案**:

**默认账号**:
- 用户名: `admin`
- 密码: `admin`

如需修改，编辑 `backend/routes/auth.js`。

---

### Q18: Token 过期？

**问题描述**:
```
Token expired
```

**原因**:
JWT Token 已过期。

**解决方案**:
重新登录获取新 Token。

---

## 🛠️ 开发问题

### Q19: 代码修改后不生效？

**问题描述**:
修改代码后，页面没有更新。

**原因**:
需要重启服务或清除缓存。

**解决方案**:

**后端**:
```bash
# 使用 nodemon 自动重启
cd backend
npm run dev
```

**前端**:
```bash
# Vite 支持热更新，刷新浏览器
# 如果不生效，重启开发服务器
cd frontend
npm run dev
```

---

### Q20: TypeScript 类型错误？

**问题描述**:
```
Type 'string' is not assignable to type 'number'
```

**原因**:
类型不匹配。

**解决方案**:
修正类型定义或使用类型断言。

---

## 📞 获取更多帮助

如果以上方案无法解决问题：

1. 查看 [测试指南.md](./测试指南.md) 故障排查部分
2. 查看 [测试报告.md](./测试报告.md) 已知问题
3. 查看 [问题修复清单.md](./问题修复清单.md)
4. 提交 Issue 描述问题

---

## 💡 最佳实践

### 开发环境建议

1. **使用 PowerShell 或 Git Bash**
   - 更好的中文支持
   - 更强大的命令行功能

2. **使用 VS Code**
   - 集成终端
   - 代码提示
   - 调试功能

3. **定期更新依赖**
   ```bash
   npm update
   pip install --upgrade -r requirements.txt
   ```

4. **使用版本管理**
   - Git 管理代码
   - 定期提交

5. **查看日志**
   - 后端日志
   - Agent 日志
   - 浏览器控制台

---

**维护**: 持续更新中  
**最后更新**: 2026-02-07

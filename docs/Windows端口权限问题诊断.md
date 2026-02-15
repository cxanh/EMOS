# 🔧 Windows 端口权限问题诊断和解决方案

**问题**: Node.js 无法绑定到任何端口，即使是 127.0.0.1  
**错误**: `Error: listen EACCES: permission denied 127.0.0.1:PORT`  
**严重程度**: 🔴 系统级问题

---

## 📋 问题确认

我们已经测试了：
- ✅ 端口 3000 - 被拒绝
- ✅ 端口 3001 - 被拒绝  
- ✅ 使用 `localhost` - 被拒绝
- ✅ 使用 `127.0.0.1` - 被拒绝
- ✅ 简单的 HTTP 服务器 - 被拒绝

**结论**: 这不是代码问题，而是 Windows 系统配置问题。

---

## 🔍 可能的原因

### 1. Hyper-V 保留端口范围

Windows 10/11 的 Hyper-V 可能保留了大量端口，导致普通应用无法使用。

**检查方法**:
```powershell
# 以管理员身份运行 PowerShell
netsh interface ipv4 show excludedportrange protocol=tcp
```

**预期输出**:
```
Protocol tcp Port Exclusion Ranges

Start Port    End Port
----------    --------
     3000        3100    *
     5000        5100    *
```

如果看到你的端口在排除范围内，这就是问题所在。

### 2. Windows Defender 防火墙

防火墙可能阻止了 Node.js 绑定端口。

### 3. 第三方安全软件

杀毒软件或安全软件可能拦截了端口绑定。

### 4. WSL (Windows Subsystem for Linux)

WSL 可能占用了端口范围。

---

## ✅ 解决方案

### 方案 1: 检查并释放 Hyper-V 保留端口（推荐）

**步骤 1**: 以管理员身份打开 PowerShell

**步骤 2**: 检查保留端口
```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

**步骤 3**: 如果端口被保留，禁用 Hyper-V 动态端口分配
```powershell
# 停止 Hyper-V 服务
net stop winnat

# 重新启动
net start winnat
```

**步骤 4**: 或者永久禁用动态端口保留
```powershell
# 设置固定的保留范围，避开常用端口
netsh int ipv4 set dynamicport tcp start=49152 num=16384
netsh int ipv4 set dynamicport udp start=49152 num=16384
```

**步骤 5**: 重启电脑使更改生效

---

### 方案 2: 使用高端口号（临时方案）

使用 49152 以上的端口，这些端口通常不会被保留。

**修改 `backend/.env`**:
```env
PORT=50000
```

**修改 `frontend/vite.config.ts`**:
```typescript
server: {
  port: 5174,
  proxy: {
    '/api': {
      target: 'http://localhost:50000',  // 改为新端口
      changeOrigin: true
    }
  }
}
```

**修改 `frontend/.env`**:
```env
VITE_API_BASE_URL=http://localhost:50000/api
```

---

### 方案 3: 以管理员身份运行（不推荐）

**步骤 1**: 右键点击 PowerShell 或 CMD

**步骤 2**: 选择"以管理员身份运行"

**步骤 3**: 导航到项目目录并启动服务

**缺点**:
- 每次都需要管理员权限
- 安全风险
- 不适合开发环境

---

### 方案 4: 配置 Windows Defender 防火墙

**步骤 1**: 打开 Windows Defender 防火墙

**步骤 2**: 点击"高级设置"

**步骤 3**: 选择"入站规则" → "新建规则"

**步骤 4**: 选择"端口" → "TCP" → 输入端口号（如 3000）

**步骤 5**: 选择"允许连接"

**步骤 6**: 应用到所有配置文件

**步骤 7**: 命名规则（如"Node.js Development"）

---

### 方案 5: 检查第三方安全软件

如果安装了以下软件，可能需要配置：
- 360 安全卫士
- 腾讯电脑管家
- 卡巴斯基
- Norton
- McAfee

**操作**: 在安全软件中添加 Node.js 到白名单或信任列表。

---

## 🧪 测试解决方案

### 测试脚本

使用我们创建的测试脚本：
```bash
cd backend
node test-port.js
```

**成功输出**:
```
Attempting to start server on 127.0.0.1:3001...
✅ Server successfully started on http://127.0.0.1:3001
Press Ctrl+C to stop
```

**失败输出**:
```
Server error: Error: listen EACCES: permission denied 127.0.0.1:3001
```

---

## 📝 推荐的完整解决流程

### 第一步：诊断问题

```powershell
# 以管理员身份运行
netsh interface ipv4 show excludedportrange protocol=tcp
```

### 第二步：根据诊断结果选择方案

**如果端口被 Hyper-V 保留**:
→ 使用方案 1（释放保留端口）

**如果没有保留端口**:
→ 使用方案 2（更换高端口）或方案 4（配置防火墙）

### 第三步：应用解决方案

按照选择的方案执行步骤。

### 第四步：测试

```bash
cd backend
node test-port.js
```

### 第五步：启动完整服务

如果测试成功：
```bash
cd backend
npm run dev
```

---

## 🎯 快速解决方案（推荐）

如果你想快速解决问题，使用高端口号：

### 1. 修改后端端口

**`backend/.env`**:
```env
PORT=50000
```

### 2. 修改前端配置

**`frontend/.env`**:
```env
VITE_API_BASE_URL=http://localhost:50000/api
```

**`frontend/vite.config.ts`**:
```typescript
server: {
  port: 5174,
  proxy: {
    '/api': {
      target: 'http://localhost:50000',
      changeOrigin: true
    }
  }
}
```

### 3. 测试

```bash
# 测试端口
cd backend
node test-port.js

# 如果成功，启动服务
npm run dev
```

### 4. 启动前端

```bash
cd frontend
npm run dev
```

---

## 🔗 相关资源

- [Microsoft Docs - Hyper-V Port Ranges](https://docs.microsoft.com/en-us/troubleshoot/windows-server/networking/service-overview-and-network-port-requirements)
- [Node.js Issues - EACCES on Windows](https://github.com/nodejs/node/issues)
- [Stack Overflow - Port Permission Denied](https://stackoverflow.com/questions/tagged/eacces+windows)

---

## ✅ 验证清单

完成解决方案后，验证以下项目：

- [ ] `node test-port.js` 成功启动
- [ ] 后端服务成功启动（`npm run dev`）
- [ ] 可以访问 `http://localhost:PORT/health`
- [ ] 前端可以连接到后端 API
- [ ] WebSocket 连接正常

---

## 💡 预防措施

### 开发环境最佳实践

1. **使用高端口号**
   - 开发端口使用 49152-65535 范围
   - 避免使用常见端口（3000, 8000, 8080）

2. **配置防火墙规则**
   - 为开发工具创建永久规则
   - 添加 Node.js 到信任列表

3. **定期检查端口保留**
   ```powershell
   netsh interface ipv4 show excludedportrange protocol=tcp
   ```

4. **使用端口管理工具**
   - TCPView (Sysinternals)
   - CurrPorts (NirSoft)

---

**创建时间**: 2026-02-08  
**最后更新**: 2026-02-08  
**状态**: 待用户验证

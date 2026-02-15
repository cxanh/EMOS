# ✅ AI智能分析系统检查清单

**快速验证系统是否正常工作**

---

## 🔧 环境检查

### 必需服务

- [ ] **后端服务** (端口 50001)
  ```bash
  cd backend
  node index.js
  # 看到: Server running on port 50001
  ```

- [ ] **Ollama服务** (端口 11434)
  ```bash
  ollama serve
  # 看到: Ollama is running
  ```

- [ ] **Redis** (端口 6379)
  ```bash
  redis-cli ping
  # 返回: PONG
  ```

- [ ] **InfluxDB** (端口 8086)
  ```bash
  curl http://localhost:8086/health
  # 返回: {"status":"pass"}
  ```

- [ ] **前端服务** (端口 5173)
  ```bash
  cd frontend
  npm run dev
  # 看到: Local: http://localhost:5173/
  ```

---

## 📁 文件检查

### 后端文件

- [ ] `backend/services/aiService.js` - AI核心服务
- [ ] `backend/routes/ai.js` - AI路由
- [ ] `backend/.env` - 配置文件（包含LLM配置）

### 前端文件

- [ ] `frontend/src/views/AIAnalysis.vue` - AI分析页面
- [ ] `frontend/src/api/ai.ts` - API封装
- [ ] `frontend/src/stores/ai.ts` - 状态管理
- [ ] `frontend/src/router/index.ts` - 路由配置（包含/ai-analysis）
- [ ] `frontend/src/components/Sidebar.vue` - 侧边栏（包含AI菜单）

---

## ⚙️ 配置检查

### 后端配置 (`backend/.env`)

- [ ] `LLM_PROVIDER=ollama`
- [ ] `OLLAMA_BASE_URL=http://localhost:11434`
- [ ] `OLLAMA_MODEL=llama2:7b`

### Ollama模型

- [ ] 模型已下载
  ```bash
  ollama list
  # 应该看到: llama2:7b
  ```

---

## 🧪 功能测试

### 后端API测试

- [ ] **AI状态检查**
  ```bash
  curl http://localhost:50001/api/ai/status
  # 返回: {"success":true,"data":{"enabled":true,...}}
  ```

- [ ] **系统健康检查**
  ```bash
  curl -X POST http://localhost:50001/api/ai/analyze/health
  # 返回: {"success":true,"data":{...}}
  ```

### 前端页面测试

- [ ] 能够访问 `http://localhost:5173`
- [ ] 能够登录系统
- [ ] 侧边栏显示 "🤖 AI智能分析" 菜单
- [ ] 点击菜单能进入AI分析页面
- [ ] AI状态显示为启用（绿色点）

### AI功能测试

- [ ] **系统健康检查**
  - 点击 "系统健康检查" 卡片
  - 显示加载动画
  - 10-30秒后显示结果
  - 健康评分正常显示
  - 问题列表正常显示
  - 优化建议正常显示

- [ ] **性能趋势分析**
  - 点击 "性能趋势分析" 卡片
  - 弹出对话框
  - 选择节点和时间范围
  - 点击 "开始分析"
  - 15-40秒后显示结果
  - 趋势信息正常显示
  - 预测数据正常显示

- [ ] **优化建议**
  - 点击 "优化建议" 卡片
  - 显示加载动画
  - 10-30秒后显示结果
  - 快速见效建议正常显示
  - 分类方案正常显示
  - 长期规划正常显示

- [ ] **分析历史**
  - 执行分析后，历史记录出现
  - 点击历史项能加载历史结果

---

## 🎨 UI检查

### 页面元素

- [ ] 页面标题显示 "🤖 AI智能分析"
- [ ] AI状态指示器正常显示
- [ ] 三个分析操作卡片正常显示
- [ ] 卡片悬停有上浮效果
- [ ] 加载动画正常显示
- [ ] 结果区域正常显示

### 样式检查

- [ ] 健康评分圆环有渐变色
- [ ] 问题卡片有彩色左边框
- [ ] 按钮有悬停效果
- [ ] 动画流畅无卡顿
- [ ] 响应式布局正常（调整窗口大小）

---

## 🐛 错误检查

### 常见错误

- [ ] **"AI service not enabled"**
  - 检查 `backend/.env` 配置
  - 检查 Ollama 是否运行

- [ ] **"Ollama API error"**
  - 检查 Ollama 服务状态
  - 检查模型是否下载
  - 检查网络连接

- [ ] **"Failed to parse AI response"**
  - 检查模型输出格式
  - 查看后端日志
  - 可能需要重试

- [ ] **页面空白**
  - 检查浏览器控制台错误
  - 检查前端编译错误
  - 清除缓存重新加载

---

## 📊 性能检查

### 响应时间

- [ ] 系统健康检查 < 30秒
- [ ] 性能趋势分析 < 40秒
- [ ] 优化建议 < 30秒

### 资源使用

- [ ] 前端内存 < 200MB
- [ ] 后端内存 < 500MB
- [ ] Ollama内存 < 10GB
- [ ] CPU使用率合理

---

## 📝 日志检查

### 后端日志

- [ ] 查看日志文件
  ```bash
  tail -f backend/logs/combined.log
  ```

- [ ] 应该看到:
  - "AI Service Initialized"
  - "Analyzing system health..."
  - "AI analysis completed"

### 前端控制台

- [ ] 打开浏览器开发者工具 (F12)
- [ ] 查看 Console 标签
- [ ] 不应该有红色错误
- [ ] 可能有蓝色信息日志

---

## 🎯 完整测试流程

### 1. 启动所有服务 (5分钟)

```bash
# 终端1: 后端
cd backend
node index.js

# 终端2: Ollama
ollama serve

# 终端3: 前端
cd frontend
npm run dev
```

### 2. 访问系统 (1分钟)

1. 打开 `http://localhost:5173`
2. 登录 (admin/admin123)
3. 点击 "🤖 AI智能分析"

### 3. 测试功能 (5分钟)

1. 点击 "系统健康检查"
2. 等待结果显示
3. 点击 "性能趋势分析"
4. 选择节点和时间范围
5. 等待结果显示
6. 点击 "优化建议"
7. 等待结果显示

### 4. 验证结果 (2分钟)

- [ ] 所有分析都成功完成
- [ ] 结果格式正确
- [ ] 数据合理
- [ ] UI显示正常

---

## ✅ 最终确认

### 系统状态

- [ ] 所有服务正常运行
- [ ] 所有文件存在
- [ ] 配置正确
- [ ] 功能正常
- [ ] UI正常
- [ ] 性能正常
- [ ] 无错误日志

### 准备就绪

如果以上所有项目都已勾选，说明：

🎉 **AI智能分析系统已完全就绪！**

可以开始使用了！

---

## 🚨 故障排除

### 如果有任何项目未通过

1. **查看相关文档**
   - [快速启动指南](AI_FRONTEND_QUICK_START.md)
   - [常见问题FAQ](docs/常见问题FAQ.md)

2. **检查日志**
   - 后端日志: `backend/logs/combined.log`
   - 前端控制台: 浏览器F12
   - Ollama日志: `ollama logs`

3. **重启服务**
   ```bash
   # 停止所有服务 (Ctrl+C)
   # 重新启动
   ```

4. **清除缓存**
   ```bash
   # 前端
   cd frontend
   rm -rf node_modules/.vite
   npm run dev
   ```

---

## 📞 需要帮助？

参考以下文档：

- 📖 [AI系统设计方案](docs/AI智能分析系统设计方案.md)
- 🚀 [快速启动指南](AI_FRONTEND_QUICK_START.md)
- 🎨 [视觉设计展示](AI_VISUAL_SHOWCASE.md)
- 📊 [最终总结](AI_ANALYSIS_FINAL_SUMMARY.md)

---

**检查清单版本**: 1.0  
**最后更新**: 2026-02-12

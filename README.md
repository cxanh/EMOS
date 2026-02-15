# EOMS - 分布式感知运维系统

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-核心功能完成-success.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Python](https://img.shields.io/badge/python-%3E%3D3.8-blue.svg)

**Enterprise Operations Monitoring System**

一个支持多节点监控、实时数据展示、历史分析和智能运维建议的分布式监控系统

[快速开始](#快速开始) • [文档中心](./DOCS.md) • [功能特性](#功能特性) • [技术栈](#技术栈) • [项目结构](./PROJECT_STRUCTURE.md)

</div>

---

## 📖 项目简介

EOMS 是一个为运维人员和系统管理员设计的分布式监控系统，支持：

- 🖥️ **多节点监控** - 实时采集多台服务器的系统资源数据
- 📊 **实时展示** - WebSocket 实时推送，延迟 < 2s
- 📈 **历史分析** - 基于 InfluxDB 的时序数据查询和可视化
- 🤖 **智能分析** - 集成 LLM 提供智能运维建议
- 🔔 **告警通知** - 阈值告警和实时通知
- 🌐 **多端支持** - Web、桌面端、移动端统一访问

---

## ✨ 功能特性

### 核心功能 ✅ (已完成)

#### 数据采集与上报
- ✅ Python Agent 跨平台支持 (Linux/Mac/Windows)
- ✅ 系统指标采集 (CPU、内存、磁盘、网络)
- ✅ 1 秒采集间隔，实时性强
- ✅ 自动注册和心跳检测
- ✅ 数据上报重试机制

#### 数据存储与查询
- ✅ Redis 实时数据缓存
- ✅ InfluxDB 时序数据存储
- ✅ RESTful API 接口
- ✅ 历史数据查询和聚合
- ✅ 数据导出 (CSV 格式)

#### 实时监控
- ✅ WebSocket 实时推送 (<2s 延迟)
- ✅ 多节点监控面板
- ✅ ECharts 实时趋势图
- ✅ 节点状态管理
- ✅ 自动重连机制

#### 用户界面
- ✅ JWT 用户认证
- ✅ Vue 3 + TypeScript 前端
- ✅ 响应式设计
- ✅ 实时数据可视化
- ✅ 历史数据查询界面
- ✅ 时间范围选择器

### 可选功能 ⏳ (未实现)

- ⏳ LLM 智能分析
- ⏳ 异常检测和告警
- ⏳ 优化建议
- ⏳ 用户权限管理
- ⏳ Docker 容器化部署
- 🚧 LLM 智能分析
- 🚧 告警系统

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│              多端访问层 (Client Layer)                    │
│      Web 管理端 | Electron 桌面端 | 移动端 H5             │
└────────────────────────┬────────────────────────────────┘
                         │ REST API / WebSocket
┌────────────────────────┴────────────────────────────────┐
│           中心服务层 (Service Layer)                      │
│         Node.js + Express + WebSocket                   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│           数据支撑层 (Data Layer)                         │
│      Redis (实时缓存) | InfluxDB (时序数据)              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP POST
┌────────────────────────┴────────────────────────────────┐
│            采集层 (Agent Layer)                           │
│          Python Agent (多节点部署)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- Python >= 3.8
- Redis >= 7.0 (可选)
- InfluxDB >= 2.0 (可选)

### 快速测试

在启动系统前，建议先运行测试脚本检查环境：

```bash
# Windows
.\test-all.bat

# Linux/Mac
chmod +x test-all.sh
./test-all.sh
```

测试脚本会自动检查：
- 数据库连接
- 依赖完整性
- 代码语法
- Python 包安装

### 本地开发

**详细步骤请查看 [START.md](./START.md)**

```bash
# 1. 启动后端服务
cd backend
npm install
npm run dev

# 2. 启动 Agent (新终端)
cd agent
pip install -r requirements.txt
python agent.py

# 3. 启动前端 (新终端)
cd frontend
npm install
npm run dev

# 4. 访问应用
# 浏览器打开: http://localhost:5174
# 默认账号: admin / admin
```

**注意**: Redis 和 InfluxDB 是可选的。没有它们系统仍可运行，但功能会受限。

### Docker 部署 (推荐)

```bash
# 一键启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

详细步骤请参考 [快速开始指南](./快速开始指南.md)

---

## 📚 文档

### 📖 文档中心

**所有项目文档已整理到 `docs/` 目录**

👉 **[进入文档中心](./docs/README.md)** - 完整的文档导航和分类

### 快速链接

| 文档 | 说明 | 重要性 |
|------|------|--------|
| [START.md](./docs/START.md) | 5 分钟快速启动系统 | ⭐⭐⭐ |
| [当前状态总结.md](./docs/当前状态总结.md) | 项目状态和下一步计划 | ⭐⭐⭐ |
| [测试指南.md](./docs/测试指南.md) | 完整测试流程 | ⭐⭐⭐ |
| [常见问题FAQ.md](./docs/常见问题FAQ.md) | 常见问题解答 | ⭐⭐⭐ |
| [部署指南.md](./docs/部署指南.md) | 生产环境部署 | ⭐⭐⭐ |
| [技术实施细节.md](./docs/技术实施细节.md) | API 规范和代码示例 | ⭐⭐⭐ |

### 按角色查找

- **新手**: [START.md](./docs/START.md) → [当前状态总结.md](./docs/当前状态总结.md)
- **开发者**: [实施方案.md](./docs/实施方案.md) → [任务目录.md](./docs/任务目录.md) → [技术实施细节.md](./docs/技术实施细节.md)
- **测试人员**: [测试指南.md](./docs/测试指南.md)
- **运维人员**: [部署指南.md](./docs/部署指南.md)
- **项目经理**: [项目完成报告.md](./docs/项目完成报告.md) → [开发进度.md](./docs/开发进度.md)

**更多文档**: 查看 [文档中心](./docs/README.md) 获取完整文档列表和导航

---

## 🛠️ 技术栈

### 前端
- **框架**: Vue 3.5 + TypeScript
- **构建**: Vite 7.x
- **状态管理**: Pinia
- **路由**: Vue Router 4.x
- **图表**: ECharts 6.x
- **HTTP**: Axios

### 后端
- **运行时**: Node.js 18+
- **框架**: Express 5.x
- **WebSocket**: ws 8.x
- **认证**: JWT
- **日志**: Winston

### 数据库
- **实时缓存**: Redis 7.x
- **时序数据**: InfluxDB 2.x

### 采集层
- **语言**: Python 3.8+
- **核心库**: psutil, requests

### 桌面应用
- **框架**: Electron

---

## 📁 项目结构

```
project-root/
├── agent/                    # Python 采集 Agent
│   ├── agent.py
│   ├── config.yaml
│   └── collectors/
├── backend/                  # Node.js 后端服务
│   ├── index.js
│   ├── config/
│   ├── routes/
│   ├── services/
│   └── middleware/
├── frontend/                 # Vue 3 前端应用
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/
│   │   └── api/
│   └── package.json
├── electron/                 # Electron 桌面应用
├── docker/                   # Docker 配置
└── docs/                     # 文档
```

---

## 🗓️ 开发计划

| 阶段 | 内容 | 状态 | 完成时间 |
|------|------|------|----------|
| 阶段一 | 核心基础设施 (数据层 + Agent) | ✅ 已完成 | 2026-02-07 |
| 阶段二 | 前端功能完善 (多节点 + 历史查询) | ✅ 已完成 | 2026-02-07 |
| 阶段三 | 智能分析功能 (LLM 集成) | ⏳ 可选 | - |
| 阶段四 | 系统完善与优化 (告警 + 部署) | ⏳ 可选 | - |

**核心功能已完成**: 系统已具备生产环境部署能力 🎉

**下一步**: 参考 [测试指南.md](./测试指南.md) 进行系统测试

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- 使用 ESLint + Prettier 格式化代码
- 遵循 Conventional Commits 提交规范
- 编写单元测试
- 更新相关文档

---

## 📝 更新日志

### v1.0.0 (2026-02-06)

**新增**
- ✨ 初始项目结构
- ✨ 前端基础界面
- ✨ 后端基础框架
- ✨ Electron 桌面应用
- 📚 完整项目文档

**待开发**
- 🚧 Python Agent
- 🚧 数据持久化
- 🚧 多节点管理
- 🚧 LLM 智能分析

---

## 🐛 问题反馈

如果遇到问题，请：

1. 查看 [快速开始指南](./快速开始指南.md) 中的常见问题
2. 搜索已有的 [Issues](../../issues)
3. 创建新的 Issue 并提供详细信息

---

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

---

## 👥 团队

**项目负责人**: 待定  
**开发团队**: 待定  
**技术支持**: 待定

---

## 🙏 致谢

感谢以下开源项目：

- [Vue.js](https://vuejs.org/)
- [Express](https://expressjs.com/)
- [ECharts](https://echarts.apache.org/)
- [Redis](https://redis.io/)
- [InfluxDB](https://www.influxdata.com/)
- [Electron](https://www.electronjs.org/)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！**

Made with ❤️ by EOMS Team

</div>

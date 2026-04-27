> 历史记录/非当前基线
>
> 本文档为项目根目录迁移出的历史材料，仅用于追溯阶段背景、问题修复或功能完成过程。
> 当前项目入口与有效文档请以根目录 `README.md`、`DOCS.md` 和 `docs/` 目录中的 SSOT 文档为准。
# 📁 项目结构说明

**EOMS - 分布式感知运维系统**

---

## 🗂️ 目录结构

```
EOMS/
│
├── 📄 README.md                    # 项目主页
├── 📄 DOCS.md                      # 文档导航（快速访问）
├── 📄 PROJECT_STRUCTURE.md         # 本文件
├── 📄 package.json                 # 根项目配置
│
├── 📂 docs/                        # 📚 文档中心
│   ├── README.md                   # 文档中心首页 ⭐⭐⭐
│   ├── 文档清单.md                  # 完整文档列表
│   ├── 文档索引.md                  # 详细导航指南
│   │
│   ├── START.md                    # 快速启动 ⭐⭐⭐
│   ├── 当前状态总结.md              # 项目状态 ⭐⭐⭐
│   │
│   ├── 快速开始指南.md              # 环境搭建
│   ├── 项目总览.md                  # 项目介绍
│   │
│   ├── 实施方案.md                  # 开发计划 ⭐⭐⭐
│   ├── 任务目录.md                  # 任务清单 ⭐⭐⭐
│   ├── 技术实施细节.md              # API 规范 ⭐⭐⭐
│   ├── 开发进度.md                  # 进度跟踪
│   ├── aiide可解析系统设计方案.md   # 设计约束
│   ├── 系统设计方案.md              # 原始设计
│   │
│   ├── 测试指南.md                  # 测试流程 ⭐⭐⭐
│   ├── 部署指南.md                  # 部署指南 ⭐⭐⭐
│   │
│   ├── 项目完成报告.md              # 成果总结
│   └── 最终开发总结.md              # 经验总结
│
├── 📂 agent/                       # 🤖 Python 采集 Agent
│   ├── agent.py                    # 主程序
│   ├── config.yaml                 # 配置文件
│   ├── requirements.txt            # Python 依赖
│   ├── start.sh                    # Linux/Mac 启动脚本
│   ├── start.bat                   # Windows 启动脚本
│   ├── README.md                   # Agent 说明文档
│   │
│   └── collectors/                 # 采集器模块
│       ├── __init__.py
│       ├── cpu.py                  # CPU 采集
│       ├── memory.py               # 内存采集
│       ├── disk.py                 # 磁盘采集
│       └── network.py              # 网络采集
│
├── 📂 backend/                     # 🔧 Node.js 后端服务
│   ├── index.js                    # 入口文件
│   ├── package.json                # 依赖配置
│   ├── .env                        # 环境变量
│   ├── .env.example                # 环境变量示例
│   ├── .gitignore                  # Git 忽略配置
│   ├── test-connection.js          # 连接测试脚本
│   │
│   ├── config/                     # 配置模块
│   │   ├── redis.js                # Redis 配置
│   │   └── influxdb.js             # InfluxDB 配置
│   │
│   ├── routes/                     # 路由模块
│   │   ├── auth.js                 # 认证路由
│   │   ├── agent.js                # Agent 管理路由
│   │   └── metrics.js              # 监控数据路由
│   │
│   ├── services/                   # 服务模块
│   │   └── dataStore.js            # 数据存储服务
│   │
│   ├── middleware/                 # 中间件
│   │   ├── auth.js                 # JWT 认证
│   │   └── errorHandler.js         # 错误处理
│   │
│   ├── websocket/                  # WebSocket 服务
│   │   └── metricsWS.js            # 实时推送
│   │
│   └── utils/                      # 工具函数
│       └── logger.js               # 日志工具
│
├── 📂 frontend/                    # 🎨 Vue 3 前端应用
│   ├── index.html                  # HTML 入口
│   ├── package.json                # 依赖配置
│   ├── vite.config.ts              # Vite 配置
│   ├── tsconfig.json               # TypeScript 配置
│   ├── .env                        # 环境变量
│   ├── .gitignore                  # Git 忽略配置
│   ├── README.md                   # 前端说明文档
│   │
│   ├── public/                     # 静态资源
│   │   └── vite.svg
│   │
│   └── src/                        # 源代码
│       ├── main.ts                 # 入口文件
│       ├── App.vue                 # 根组件
│       ├── AppNew.vue              # 新版根组件
│       ├── style.css               # 全局样式
│       │
│       ├── api/                    # API 服务层
│       │   ├── index.ts            # Axios 实例
│       │   ├── auth.ts             # 认证接口
│       │   ├── agent.ts            # Agent 接口
│       │   └── metrics.ts          # 监控数据接口
│       │
│       ├── stores/                 # Pinia 状态管理
│       │   ├── user.ts             # 用户状态
│       │   ├── nodes.ts            # 节点状态
│       │   └── metrics.ts          # 监控数据状态
│       │
│       ├── router/                 # Vue Router
│       │   └── index.ts            # 路由配置
│       │
│       ├── views/                  # 页面组件
│       │   ├── Login.vue           # 登录页
│       │   ├── Home.vue            # 首页
│       │   ├── Dashboard.vue       # 监控面板
│       │   ├── NodeDetail.vue      # 节点详情
│       │   ├── History.vue         # 历史查询
│       │   ├── Network.vue         # 网速测试
│       │   ├── Settings.vue        # 系统设置
│       │   └── About.vue           # 关于页面
│       │
│       ├── components/             # 通用组件
│       │   ├── Sidebar.vue         # 侧边栏
│       │   ├── NodeList.vue        # 节点列表
│       │   ├── TimeRangePicker.vue # 时间选择器
│       │   ├── HelloWorld.vue      # 示例组件
│       │   ├── Login.vue           # 登录组件
│       │   └── NetworkTest.vue     # 网速测试组件
│       │
│       ├── utils/                  # 工具函数
│       │   └── websocket.ts        # WebSocket 管理器
│       │
│       └── assets/                 # 资源文件
│           └── vue.svg
│
├── 📂 electron/                    # 🖥️ Electron 桌面应用
│   └── main.js                     # Electron 主进程
│
└── 📂 .trae/                       # 🔧 开发工具配置
    └── documents/
        └── 修复App.vue中图表初始化失败的问题.md
```

---

## 📊 项目统计

### 代码统计

| 模块 | 文件数 | 代码行数 | 主要语言 |
|------|--------|----------|----------|
| 后端 | 15+ | ~1,500 | JavaScript |
| Agent | 10+ | ~400 | Python |
| 前端 | 25+ | ~2,500 | TypeScript/Vue |
| 文档 | 16 | ~66,000 字 | Markdown |
| **总计** | **66+** | **~4,400 行代码** | - |

### 文档统计

| 类型 | 数量 |
|------|------|
| 索引文档 | 2 |
| 快速入门 | 2 |
| 入门文档 | 2 |
| 开发文档 | 5 |
| 测试文档 | 1 |
| 部署文档 | 1 |
| 总结文档 | 2 |
| 其他文档 | 1 |
| **总计** | **16** |

---

## 🚀 快速访问

### 新手入门
1. 📄 [README.md](./README.md) - 项目主页
2. 📄 [DOCS.md](./DOCS.md) - 文档快速导航
3. 📄 [docs/START.md](./docs/START.md) - 5 分钟启动系统

### 开发者
1. 📄 [docs/实施方案.md](./docs/实施方案.md) - 架构设计
2. 📄 [docs/技术实施细节.md](./docs/技术实施细节.md) - API 规范
3. 📄 [docs/任务目录.md](./docs/任务目录.md) - 任务清单

### 测试人员
1. 📄 [docs/测试指南.md](./docs/测试指南.md) - 测试流程

### 运维人员
1. 📄 [docs/部署指南.md](./docs/部署指南.md) - 部署指南

---

## 📂 核心目录说明

### docs/ - 文档中心
所有项目文档的集中存放位置，包含完整的开发、测试、部署文档。

**入口**: [docs/README.md](./docs/README.md)

### agent/ - Python Agent
负责系统指标采集的 Python 程序，支持跨平台部署。

**特点**:
- 1 秒采集间隔
- 自动注册和心跳
- 重试机制
- 模块化采集器

### backend/ - Node.js 后端
提供 RESTful API 和 WebSocket 服务的后端系统。

**特点**:
- Express 框架
- JWT 认证
- Redis + InfluxDB 双存储
- WebSocket 实时推送

### frontend/ - Vue 3 前端
基于 Vue 3 + TypeScript 的现代化前端应用。

**特点**:
- Composition API
- Pinia 状态管理
- Vue Router 路由
- ECharts 可视化

---

## 🎯 项目状态

**开发阶段**: ✅ 核心功能完成  
**完成度**: 阶段一 100% + 阶段二 100%

### 已完成功能
- ✅ 多节点实时监控
- ✅ WebSocket 实时推送
- ✅ 历史数据查询
- ✅ 数据导出
- ✅ JWT 认证
- ✅ 跨平台 Agent

### 可选功能
- ⏳ LLM 智能分析
- ⏳ 告警系统
- ⏳ 性能优化
- ⏳ Docker 部署

---

## 📝 重要文件说明

### 根目录文件

| 文件 | 说明 |
|------|------|
| README.md | 项目主页，功能介绍 |
| DOCS.md | 文档快速导航 |
| PROJECT_STRUCTURE.md | 本文件，项目结构说明 |
| package.json | 根项目配置 |

### 配置文件

| 文件 | 位置 | 说明 |
|------|------|------|
| .env | backend/ | 后端环境变量 |
| .env | frontend/ | 前端环境变量 |
| config.yaml | agent/ | Agent 配置 |
| vite.config.ts | frontend/ | Vite 构建配置 |
| tsconfig.json | frontend/ | TypeScript 配置 |

### 启动脚本

| 文件 | 位置 | 说明 |
|------|------|------|
| start.sh | agent/ | Linux/Mac Agent 启动 |
| start.bat | agent/ | Windows Agent 启动 |

---

## 🔍 查找文件

### 按功能查找

| 功能 | 文件位置 |
|------|----------|
| API 路由 | backend/routes/ |
| 数据存储 | backend/services/dataStore.js |
| WebSocket | backend/websocket/metricsWS.js |
| 前端页面 | frontend/src/views/ |
| 状态管理 | frontend/src/stores/ |
| API 调用 | frontend/src/api/ |
| 数据采集 | agent/collectors/ |

### 按文档类型查找

| 类型 | 文件位置 |
|------|----------|
| 快速启动 | docs/START.md |
| 开发文档 | docs/实施方案.md, docs/技术实施细节.md |
| 测试文档 | docs/测试指南.md |
| 部署文档 | docs/部署指南.md |
| 进度跟踪 | docs/开发进度.md |

---

## 💡 使用建议

### 新手
1. 阅读 README.md 了解项目
2. 查看 DOCS.md 快速导航
3. 按照 docs/START.md 启动系统

### 开发者
1. 查看 docs/实施方案.md 理解架构
2. 阅读 docs/技术实施细节.md 学习 API
3. 参考代码开始开发

### 测试人员
1. 阅读 docs/测试指南.md
2. 执行测试用例
3. 记录测试结果

### 运维人员
1. 阅读 docs/部署指南.md
2. 准备生产环境
3. 部署和监控系统

---

## 🔄 更新记录

| 日期 | 更新内容 |
|------|----------|
| 2026-02-07 | 创建项目结构说明文档 |
| 2026-02-07 | 整理所有文档到 docs 目录 |
| 2026-02-07 | 完成核心功能开发 |

---

**维护**: 请保持此文档与实际项目结构同步

**最后更新**: 2026-02-07


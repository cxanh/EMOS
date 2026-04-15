# EOMS 发布前最终材料（RC 定稿）

> 适用日期：2026-04-14  
> 结论口径：Release Candidate（RC）

## 1. 发布建议结论（RC）

- 当前项目状态：**建议进入 RC（Release Candidate）阶段**，可用于小范围正式验证与发布演练。
- 推荐发布范围：`frontend + backend + agent` 的已验证主链路能力（构建、测试、报表统计、AI 趋势分析契约、Agent 写入口鉴权、WebSocket 最小鉴权、最小 CI）。
- 不纳入正式发布承诺的范围：
  - Electron 安全整改落地（preload 迁移、`contextIsolation` 收口）
  - 完整生产级运维保障（告警通道演练、备份恢复、可观测性演练）
  - Agent 细粒度身份体系（当前为共享 token）

## 2. 发布前核对清单（Checklist）

### 环境变量

- [ ] 后端已配置 `JWT_SECRET`、`AGENT_API_TOKEN`，且非默认值
- [ ] Agent `server.agent_token` 与后端 `AGENT_API_TOKEN` 一致
- [ ] 关键第三方配置已核对（如 InfluxDB、告警通道），未泄露真实密钥

### 构建与测试

- [ ] 前端构建通过（发布分支最新提交）
- [ ] 后端测试通过（发布分支最新提交）
- [ ] 关键链路手工冒烟通过（登录、实时数据、报表、AI 分析、Agent 上报）

### 依赖服务

- [ ] Redis/InfluxDB 可达，或已验证“不可用时系统降级行为”
- [ ] 时间同步、端口与网络策略符合部署环境要求

### Agent 配置

- [ ] Agent 指向正确后端地址（`server.url`）
- [ ] Agent 注册、指标上报、异常重连行为符合预期

### 安全项

- [ ] Agent 写入口鉴权生效（无 token / 错 token 均拒绝）
- [ ] WebSocket 鉴权生效（无 token / 错 token 均拒绝）
- [ ] 默认弱口令策略按环境要求处理（禁止默认密码或强制首登改密）

### 文档项

- [ ] `README / docs/START / agent` 文档与当前行为一致
- [ ] 已知限制、风险边界、发布范围披露完整且不夸大

### 版本追踪 / commit hash / 制品信息

- [ ] 已记录 RC 对应分支与 `commit hash`
- [ ] 已记录构建时间、构建人、构建环境（Node/Python 版本）
- [ ] 已记录制品信息（包名、版本号、校验值/存储位置）

### 回滚准备

- [ ] 已确认可回滚到上一个稳定版本（代码与配置）
- [ ] 已准备回滚步骤与负责人（触发条件、执行命令、验证标准）
- [ ] 已验证关键数据与配置可恢复（至少完成一次桌面演练）

### 人工验收项

- [ ] 登录与权限校验
- [ ] 仪表盘实时指标与图表刷新
- [ ] 报表生成与查询
- [ ] AI 趋势分析请求与结果展示
- [ ] Agent 上报链路稳定性
- [ ] 告警触发、通知与历史记录可见性

## 3. 已知限制（Known Limitations）

- Electron 尚未完成 preload 迁移，`nodeIntegration/contextIsolation` 安全整改未实施完成
- Agent 仍为共享 token 模式（`AGENT_API_TOKEN`），非节点级独立凭证
- WebSocket token 仍兼容 query 方式（兼容性优先，安全性弱于仅 Header）
- CI 仅覆盖最小门禁（前端构建 + 后端测试），尚未覆盖完整质量维度
- 当前结论是“可进入 RC 验证”，不等同于“生产级长期稳定承诺”

## 4. Release Notes（可直接发 Issue / 飞书群）

### 标题

`[EOMS][RC] 发布候选版本说明（2026-04-14）`

### 版本状态

- 本次版本定位为 **Release Candidate（RC）**
- 目标：用于发布前验证与小范围上线评估，不承诺完整生产级能力

### 本次主要变更

- 修复报表统计与 AI 趋势分析契约问题，补齐相关回归
- 完成 Agent 写入口与 WebSocket 最小鉴权收口
- 建立最小 CI（前端构建、后端测试）
- README / START / agent 文档与仓库真实状态对齐

### 对使用者的影响

- 报表与 AI 分析链路稳定性提升
- Agent / WebSocket 接入需提供有效 token，未鉴权请求将被拒绝
- 发布验证路径更加明确（先构建与测试，再人工冒烟）

### 配置新增/要求

- 后端必须配置：`JWT_SECRET`、`AGENT_API_TOKEN`
- Agent 必须配置：`server.agent_token`，且与后端一致

### 与此前行为差异

- Agent 写入口与 WebSocket 不再默认放行，改为最小鉴权门禁
- 文档口径调整为 RC 边界披露，不宣称“已具备完整生产部署能力”

### 已知限制与风险提示

- Electron 安全整改（preload 迁移）尚未落地，不在本次 RC 承诺范围
- Agent 仍为共享 token 模式，后续需升级节点级凭证
- WebSocket 仍兼容 query token，后续建议收敛为更安全方案

## 5. 发布后优先事项（Post-release Priorities）

### P1

- 完成 Electron preload 迁移与安全配置落地（`contextIsolation: true` + 最小 API 暴露）
- 推进 WebSocket 鉴权安全收敛（减少/下线 query token 方式）
- 将 Agent 鉴权升级为节点级凭证与轮换机制
- 补齐发布级安全检查（密钥治理、日志脱敏、默认口令治理）

### P2

- 扩展 CI（lint、类型检查、集成测试、关键链路 e2e）
- 完善生产运维演练（告警通道、备份恢复、故障注入、监控看板）
- 沉淀标准化发布包（变更说明、回滚卡、兼容性矩阵）

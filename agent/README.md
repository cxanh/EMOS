# EOMS Agent

Python 指标采集 Agent，负责节点注册与指标上报。

## 运行前配置

编辑 `config.yaml`：

- `server.url`：后端地址（建议 `http://localhost:50001`）
- `server.register_endpoint`：`/api/agent/register`
- `server.metrics_endpoint`：`/api/agent/metrics`
- `server.agent_token`：必须与后端 `AGENT_API_TOKEN` 一致

## 启动

```bash
pip install -r requirements.txt
python agent.py
```

## 依赖

- Python 3.8+
- psutil
- requests
- pyyaml

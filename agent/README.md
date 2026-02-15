# EOMS Agent

Python 系统监控数据采集 Agent

## 功能

- 实时采集 CPU、内存、磁盘、网络使用率
- 自动注册到中心服务
- 支持断线重连
- 可配置采集频率

## 安装

### 方式一：使用启动脚本

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
start.bat
```

### 方式二：手动安装

```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 运行 Agent
python agent.py
```

## 配置

编辑 `config.yaml` 文件：

```yaml
# 节点信息
node:
  id: node001              # 节点 ID (必须唯一)
  hostname: dev-machine    # 主机名

# 中心服务地址
server:
  url: http://localhost:3000

# 采集配置
collection:
  interval: 1  # 采集间隔(秒)
  retry: 3     # 重试次数
  timeout: 5   # 超时时间(秒)
```

## 运行

```bash
python agent.py
```

## 日志

日志文件：`agent.log`

## 系统要求

- Python 3.8+
- psutil
- requests
- pyyaml

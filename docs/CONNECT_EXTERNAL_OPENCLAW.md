# 连接外部 OpenClaw 配置指南

本指南将帮助你配置 OpenClaw OPC 连接到已有的 OpenClaw 实例。

## 前置要求

- 已有的 OpenClaw 实例（本地或远程）
- OpenClaw HTTP API 已启用
- OpenClaw 认证令牌

## 第一步：确认 OpenClaw 配置

### 检查 OpenClaw HTTP API 是否已启用

在你的 OpenClaw 所在机器上运行：

```bash
# 查看 OpenClaw 配置
openclaw config get gateway.http.endpoints.chatCompletions.enabled

# 如果返回 false，需要启用
openclaw config set gateway.http.endpoints.chatCompletions.enabled true
```

### 获取 OpenClaw 认证令牌

```bash
# 查看当前令牌
openclaw config get gateway.auth.token

# 如果没有设置，设置一个新令牌
openclaw config set gateway.auth.token your-secure-token-here
```

### 重启 OpenClaw 网关

```bash
openclaw gateway restart
```

### 验证 OpenClaw API

```bash
# 测试 API 端点
curl http://localhost:18789/health

# 应该返回类似 {"status":"ok"} 的响应
```

## 第二步：本地开发环境配置

### 1. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=4000
DATABASE_PATH=../data/db.sqlite

# OpenClaw 配置
OPENCLAW_PATH=~/.openclaw                    # 你的 OpenClaw 数据目录
OPENCLAW_GATEWAY_URL=http://localhost:18789 # OpenClaw API 地址
OPENCLAW_GATEWAY_TOKEN=your-token-here       # OpenClaw 认证令牌

CORS_ORIGIN=http://localhost:3000
```

### 2. 如果 OpenClaw 在远程服务器

修改 `.env` 文件：

```env
OPENCLAW_GATEWAY_URL=http://your-server-ip:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here
```

**注意**：如果需要访问 OpenClaw 的工作区文件（创建/编辑 AI 员工），需要：
- 将远程 OpenClaw 的 `~/.openclaw` 目录挂载到本地
- 或者使用网络共享（如 NFS、SSHFS 等）

### 3. 启动开发服务

```bash
# 在项目根目录
npm run dev
```

## 第三步：Docker 部署配置（连接外部 OpenClaw）

### 使用 docker-compose-external.yml

```bash
cd docker
```

### 编辑 docker-compose-external.yml

修改以下配置：

```yaml
backend:
  environment:
    # 修改为你的 OpenClaw 地址和令牌
    - OPENCLAW_GATEWAY_URL=http://your-external-openclaw-ip:18789
    - OPENCLAW_GATEWAY_TOKEN=your-openclaw-token-here
    # 修改 CORS_ORIGIN 为你的服务器地址
    - CORS_ORIGIN=http://your-server-ip:3000
```

### 如果需要访问 OpenClaw 工作区文件

取消注释并修改 volumes 部分：

```yaml
volumes:
  - ../data:/app/data
  # 挂载你的 OpenClaw 数据目录（只读）
  - /path/to/your/.openclaw:/root/.openclaw:ro
```

### 启动服务

```bash
# 使用外部 OpenClaw 配置启动
docker compose -f docker-compose-external.yml up -d --build

# 查看状态
docker compose -f docker-compose-external.yml ps

# 查看日志
docker compose -f docker-compose-external.yml logs -f
```

## 第四步：防火墙配置（如果 OpenClaw 在远程）

### 在 OpenClaw 服务器上开放端口

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 18789/tcp
sudo ufw allow 12667/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=18789/tcp
sudo firewall-cmd --permanent --add-port=12667/tcp
sudo firewall-cmd --reload
```

### 安全建议

- 不要直接暴露 OpenClaw 端口到公网
- 使用 VPN 或 SSH 隧道连接
- 配置防火墙只允许特定 IP 访问

## 第五步：验证连接

### 测试后端连接

```bash
# 测试健康检查端点
curl http://localhost:4000/api/status

# 应该返回服务状态信息
```

### 访问前端

打开浏览器访问：`http://localhost:3000`

### 创建测试 AI 员工

1. 在前端界面创建一个 AI 员工
2. 尝试发送消息
3. 检查是否能正常收到回复

## 常见问题

### Q: 连接超时或无法连接

**A:** 检查以下几点：
1. OpenClaw 网关是否正在运行
2. 防火墙是否开放了 18789 端口
3. `OPENCLAW_GATEWAY_URL` 是否正确
4. 网络是否可达（尝试 ping 或 telnet）

### Q: 认证错误（401 Unauthorized）

**A:** 
1. 确认 `OPENCLAW_GATEWAY_TOKEN` 是否正确
2. 确认 OpenClaw 侧的令牌配置是否一致
3. 重新设置令牌并重启 OpenClaw 网关

### Q: 无法创建/编辑 AI 员工

**A:** 
1. 确认 `OPENCLAW_PATH` 是否正确配置
2. 确认是否有读写权限
3. 如果 OpenClaw 在远程，需要挂载工作区目录

### Q: OpenClaw API 返回 404

**A:** 
1. 确认 HTTP API 是否已启用
2. 运行 `openclaw config get gateway.http.endpoints.chatCompletions.enabled`
3. 如果是 false，运行 `openclaw config set gateway.http.endpoints.chatCompletions.enabled true`
4. 重启 OpenClaw 网关

### Q: 如何使用 SSH 隧道连接远程 OpenClaw？

**A:** 在本地运行：

```bash
# 将远程 OpenClaw 端口转发到本地
ssh -L 18789:localhost:18789 -L 12667:localhost:12667 user@your-server-ip

# 然后在配置中使用 localhost
OPENCLAW_GATEWAY_URL=http://localhost:18789
```

## 配置示例

### 示例 1：本地 OpenClaw + 本地开发

```env
OPENCLAW_PATH=~/.openclaw
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=my-local-token
```

### 示例 2：远程 OpenClaw + Docker 部署

```yaml
environment:
  - OPENCLAW_GATEWAY_URL=http://192.168.1.100:18789
  - OPENCLAW_GATEWAY_TOKEN=my-remote-token
  - CORS_ORIGIN=http://my-server-ip:3000
volumes:
  - ../data:/app/data
  - /nfs/openclaw-data:/root/.openclaw:ro
```

### 示例 3：SSH 隧道 + Docker

```bash
# 终端 1：建立 SSH 隧道
ssh -L 18789:localhost:18789 user@remote-server

# 终端 2：启动 Docker
docker compose -f docker-compose-external.yml up -d
```

## 下一步

连接成功后：
1. 访问 http://localhost:3000 开始使用
2. 创建 AI 员工
3. 配置 AI 模型（通过 OpenClaw Web UI）

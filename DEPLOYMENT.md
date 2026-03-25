# OpenClaw OPC 部署指南

## 📋 目录
1. [OpenClaw 网关服务说明](#openclaw-网关服务说明)
2. [本地开发部署](#本地开发部署)
3. [Docker 部署](#docker-部署)
4. [OpenClaw 安装与配置](#openclaw-安装与配置)

---

## OpenClaw 网关服务说明

### ✅ OpenClaw 确实有网关服务！

OpenClaw 提供了以下功能：
- **HTTP API 端点** - 可以通过 REST API 调用
- **网关服务** - `openclaw gateway start`
- **Web UI** - http://localhost:12667
- **多工作区支持** - 每个AI员工一个独立工作区

### 启用 OpenClaw HTTP API

```bash
# 启用聊天完成 API
openclaw config set gateway.http.endpoints.chatCompletions.enabled true

# 配置认证令牌
openclaw config set gateway.auth.token your-secure-token-here

# 重启网关服务
openclaw gateway restart
```

### API 端点

- **基础URL**: http://localhost:18789
- **聊天完成**: POST /v1/chat/completions
- **认证**: Bearer 令牌
- **智能体选择**: 通过 `x-openclaw-agent-id` 头或 `model` 字段

---

## 本地开发部署

### 前置要求
- Node.js 20+
- npm 或 yarn
- OpenClaw CLI（可选，用于完整功能）

### 步骤

1. **安装依赖**
```bash
# 根目录
npm install

# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

2. **配置环境变量**
```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，设置 OPENCLAW_GATEWAY_TOKEN
```

3. **初始化数据库**
```bash
cd backend
npx tsx src/db/init.ts
```

4. **启动服务**
```bash
# 终端1 - 后端
cd backend
npm run dev

# 终端2 - 前端
cd frontend
npm run dev
```

5. **访问应用**
- 前端: http://localhost:3000
- 后端API: http://localhost:4000
- OpenClaw Web UI: http://localhost:12667（如果已安装）
- OpenClaw API: http://localhost:18789

---

## Docker 部署

### 使用 Docker Compose（推荐）

1. **进入 Docker 目录**
```bash
cd docker
```

2. **编辑 docker-compose.yml**
```bash
# 设置 OPENCLAW_GATEWAY_TOKEN
# 将 your-token-here 替换为实际的令牌
```

3. **启动所有服务**
```bash
docker-compose up -d
```

4. **查看服务状态**
```bash
docker-compose ps
```

5. **查看日志**
```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f openclaw
docker-compose logs -f backend
docker-compose logs -f frontend
```

6. **停止服务**
```bash
docker-compose down
```

### 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| openclaw | 12667, 18789 | OpenClaw 网关服务 |
| backend | 4000 | 后端 API 服务 |
| frontend | 3000 | 前端 Web 应用 |

### 数据持久化

Docker Compose 配置了以下卷来持久化数据：
- `openclaw-data`: OpenClaw 工作区和配置
- `../data`: 应用数据库

---

## OpenClaw 安装与配置

### 方法1：使用官方安装脚本（推荐）

```bash
# macOS / Linux
curl -fsSL https://get.openclaw.ai | bash

# 或使用 npm
npm install -g @openclaw/cli
```

### 方法2：Docker 部署

OpenClaw 官方 Docker 镜像：`steipete/openclaw:latest`

已包含在我们的 `docker-compose.yml` 中。

### 初始化 OpenClaw

```bash
# 初始化配置
openclaw init

# 按照提示选择 AI 模型和输入 API Key

# 启动网关服务
openclaw gateway start

# 看到 "Web UI available at http://localhost:12667" 表示成功
```

### 配置 OpenClaw 网关

```bash
# 启用 HTTP API 端点
openclaw config set gateway.http.endpoints.chatCompletions.enabled true

# 设置认证令牌
openclaw config set gateway.auth.token your-secure-token-here

# 重启网关
openclaw gateway restart

# 验证
# 访问 http://localhost:12667 查看 Web UI
# 访问 http://localhost:18789 测试 API 端点
```

### 配置我们的应用连接 OpenClaw

编辑 `backend/.env`：

```env
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=your-secure-token-here
OPENCLAW_PATH=~/.openclaw
```

---

## 完整部署流程

### 选项A：完全 Docker 化（最简单）

1. **编辑 docker-compose.yml**
   - 设置 `OPENCLAW_GATEWAY_TOKEN`

2. **启动所有服务**
```bash
cd docker
docker-compose up -d
```

3. **访问**
- 前端: http://localhost:3000
- OpenClaw Web UI: http://localhost:12667
- OpenClaw API: http://localhost:18789

### 选项B：本地开发 + Docker OpenClaw

1. **启动 OpenClaw（Docker）**
```bash
cd docker
docker-compose up -d openclaw
```

2. **配置 OpenClaw**
```bash
# 进入容器
.docker exec -it openclaw-gateway bash

# 配置
openclaw config set gateway.http.endpoints.chatCompletions.enabled true
openclaw config set gateway.auth.token your-secure-token-here
openclaw gateway restart

# 退出容器
exit
```

3. **启动本地后端和前端**
```bash
# 终端1
cd backend
npm run dev

# 终端2
cd frontend
npm run dev
```

### 选项C：完全本地安装

```bash
# 1. 安装 OpenClaw
curl -fsSL https://get.openclaw.ai | bash

# 2. 初始化 OpenClaw
openclaw init
openclaw gateway start

# 3. 启用 API
openclaw config set gateway.http.endpoints.chatCompletions.enabled true
openclaw config set gateway.auth.token your-secure-token-here
openclaw gateway restart

# 4. 启动应用
# （同本地开发部署步骤）
```

---

## 常见问题

### Q: 必须安装 OpenClaw 吗？
A: 不是必须的。如果没有安装 OpenClaw，应用会使用模拟响应，你仍然可以测试界面和功能。

### Q: OpenClaw 的端口可以改吗？
A: 可以。修改 `docker-compose.yml` 中的端口映射，或使用 `openclaw config` 修改配置。

### Q: 如何备份数据？
A: 
- Docker: 备份 `openclaw-data` 卷和 `data/` 目录
- 本地: 备份 `~/.openclaw` 和 `data/` 目录

### Q: OpenClaw 支持哪些 AI 模型？
A: OpenClaw 支持多种模型，包括 OpenAI、Anthropic、通义千问等。运行 `openclaw init` 时选择。

### Q: 如何获取 OpenClaw 的认证令牌？
A: 可以通过以下方式设置：
```bash
openclaw config set gateway.auth.token your-secure-token-here
```

---

## 下一步

部署完成后：
1. 访问 http://localhost:3000 查看应用
2. 创建 AI 员工
3. 开始聊天！

需要帮助？查看 [OpenClaw 官方文档](https://docs.openclaw.ai/)

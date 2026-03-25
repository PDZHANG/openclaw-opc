# Linux 服务器部署指南

本指南将帮助你在新的 Linux 服务器上部署 OpenClaw OPC 项目。

## 前置要求

- Linux 服务器（Ubuntu 20.04+ 推荐）
- root 或 sudo 权限
- 至少 2GB 内存
- 至少 10GB 磁盘空间

## 第一步：安装 Docker 和 Docker Compose

### Ubuntu/Debian 系统

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git

# 添加 Docker GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动并启用 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组（可选，避免每次使用 sudo）
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker compose version
```

### CentOS/RHEL 系统

```bash
# 安装依赖
sudo yum install -y yum-utils git

# 添加 Docker 仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动并启用 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker compose version
```

## 第二步：克隆项目

```bash
# 进入 home 目录
cd ~

# 克隆项目（替换为你的实际仓库地址）
git clone <你的仓库地址> openclaw-opc

# 进入项目目录
cd openclaw-opc
```

## 第三步：配置环境变量

### 编辑 docker-compose.yml

```bash
cd docker
nano docker-compose.yml
```

修改以下配置（根据需要）：

```yaml
environment:
  - OPENCLAW_GATEWAY_TOKEN=your-secure-token-here  # 修改为强密码
  - CORS_ORIGIN=http://your-server-ip:3000          # 修改为你的服务器 IP
```

### 创建 .env 文件（可选）

如果需要更灵活的配置，可以创建环境变量文件：

```bash
cd ~/openclaw-opc/docker
cat > .env << 'EOF'
OPENCLAW_GATEWAY_TOKEN=your-secure-token-here
CORS_ORIGIN=http://your-server-ip:3000
EOF
```

然后修改 docker-compose.yml 使用 .env 文件：

```yaml
env_file:
  - .env
```

## 第四步：启动服务

```bash
cd ~/openclaw-opc/docker

# 构建并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

## 第五步：配置防火墙

### Ubuntu (UFW)

```bash
# 允许必要的端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # 前端
sudo ufw allow 4000/tcp  # 后端 API
sudo ufw allow 12667/tcp # OpenClaw Web UI
sudo ufw allow 18789/tcp # OpenClaw API

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### CentOS (firewalld)

```bash
# 允许必要的端口
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --permanent --add-port=12667/tcp
sudo firewall-cmd --permanent --add-port=18789/tcp

# 重新加载防火墙
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

## 第六步：验证部署

访问以下地址验证服务是否正常运行：

| 服务 | 地址 |
|------|------|
| 前端应用 | http://your-server-ip:3000 |
| 后端 API | http://your-server-ip:4000 |
| OpenClaw Web UI | http://your-server-ip:12667 |
| OpenClaw API | http://your-server-ip:18789 |

## 常用管理命令

### 查看服务状态

```bash
cd ~/openclaw-opc/docker
docker compose ps
```

### 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f openclaw
docker compose logs -f backend
docker compose logs -f frontend
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart openclaw
```

### 停止服务

```bash
# 停止所有服务
docker compose down

# 停止并删除数据卷（谨慎使用）
docker compose down -v
```

### 更新服务

```bash
cd ~/openclaw-opc

# 拉取最新代码
git pull

# 重新构建并启动
cd docker
docker compose up -d --build
```

## 数据备份

### 备份数据

```bash
cd ~/openclaw-opc

# 创建备份目录
mkdir -p backups

# 备份 Docker 卷
docker run --rm -v openclaw-opc_openclaw-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/openclaw-data-$(date +%Y%m%d).tar.gz -C /data .

# 备份应用数据
tar czf backups/app-data-$(date +%Y%m%d).tar.gz data/
```

### 恢复数据

```bash
cd ~/openclaw-opc

# 恢复 OpenClaw 数据
docker run --rm -v openclaw-opc_openclaw-data:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/openclaw-data-YYYYMMDD.tar.gz -C /data

# 恢复应用数据
tar xzf backups/app-data-YYYYMMDD.tar.gz
```

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker compose logs

# 检查端口是否被占用
sudo netstat -tlnp | grep -E '3000|4000|12667|18789'
```

### 权限问题

```bash
# 确保 Docker 有足够权限
sudo chmod 666 /var/run/docker.sock

# 修复数据目录权限
sudo chown -R $USER:$USER ~/openclaw-opc/data
```

### 重新构建镜像

```bash
cd ~/openclaw-opc/docker

# 停止并删除旧容器
docker compose down

# 清理旧镜像
docker image prune -a

# 重新构建并启动
docker compose up -d --build --force-recreate
```

## 安全建议

1. **修改默认令牌**：务必修改 `OPENCLAW_GATEWAY_TOKEN` 为强密码
2. **配置 HTTPS**：生产环境建议使用 Nginx 或 Traefik 配置 SSL
3. **限制 IP 访问**：在防火墙中只允许可信 IP 访问管理端口
4. **定期备份**：设置自动备份任务
5. **更新系统**：定期更新系统和 Docker 版本

## 下一步

部署完成后：
1. 访问 http://your-server-ip:3000 开始使用
2. 创建 AI 员工
3. 配置 OpenClaw 的 AI 模型（访问 http://your-server-ip:12667）

需要帮助？查看项目 README.md 或 DEPLOYMENT.md 文件。

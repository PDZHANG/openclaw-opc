#!/bin/sh

set -e

OPENCLAW_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-openclaw-secret-token}"

echo "=========================================="
echo "OpenClaw 初始化脚本"
echo "=========================================="

# 等待 OpenClaw 目录存在
until [ -d "/root/.openclaw" ]; do
    echo "等待 /root/.openclaw 目录创建..."
    sleep 2
done

# 启用 HTTP API 端点
echo "启用 OpenClaw HTTP API..."
openclaw config set gateway.http.endpoints.chatCompletions.enabled true

# 配置认证令牌
echo "配置认证令牌..."
openclaw config set gateway.auth.token "$OPENCLAW_TOKEN"

# 显示配置
echo "=========================================="
echo "OpenClaw 配置完成！"
echo "=========================================="
echo "网关令牌: $OPENCLAW_TOKEN"
echo "Web UI: http://localhost:18789"
echo "=========================================="

# 保持容器运行
echo "OpenClaw 网关服务已准备就绪"
tail -f /dev/null

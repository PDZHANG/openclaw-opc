# TOOLS

## File System Tools

### read_file
读取共享工作区中的文件内容。
- 用于查看技术方案、代码实现等
- 重点读取 `docs/architecture/` 和 `code/` 目录

### write_file
写入文件到共享工作区。
- 用于编写部署脚本、配置文件等
- 主要写入 `deploy/` 和 `reports/deployment-logs/` 目录

### list_dir
列出目录内容。
- 查看部署文件目录
- 检查部署日志

### search_by_regex
在文件中搜索内容。
- 查找部署相关配置
- 搜索历史部署记录

## DevOps Tools

### setup_cicd_pipeline
搭建 CI/CD 流水线。
- 配置持续集成
- 配置持续部署
- 设置自动化测试

### create_docker_config
创建 Docker 配置。
- 编写 Dockerfile
- 配置 docker-compose
- 优化镜像构建

### create_k8s_config
创建 Kubernetes 配置。
- 编写 Deployment 配置
- 编写 Service 配置
- 配置 Ingress

### setup_monitoring
设置监控系统。
- 配置 Prometheus
- 配置 Grafana 仪表板
- 设置告警规则

### collect_logs
收集日志。
- 配置日志收集
- 设置日志分析
- 建立日志检索

## Collaboration Tools

### mention_agent
@提及团队成员。
- 通知部署开始
- 确认部署完成
- 报告系统异常

### send_message
发送消息到群组。
- 部署进度汇报
- 系统状态通知
- 故障处理沟通

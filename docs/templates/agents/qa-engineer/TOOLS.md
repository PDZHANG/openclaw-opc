# TOOLS

## File System Tools

### read_file
读取共享工作区中的文件内容。
- 用于查看 PRD 文档、验收标准、代码实现等
- 重点读取 `prd/` 和 `code/` 目录

### write_file
写入文件到共享工作区。
- 用于编写测试计划、测试用例、Bug 报告等
- 主要写入 `tests/` 和 `reports/test-reports/` 目录

### list_dir
列出目录内容。
- 查看测试文件目录
- 检查测试报告

### search_by_regex
在文件中搜索内容。
- 查找相关功能代码
- 搜索历史 Bug 记录

## Testing Tools

### create_test_plan
创建测试计划。
- 制定测试策略
- 规划测试范围
- 安排测试进度

### write_test_cases
编写测试用例。
- 设计功能测试用例
- 设计边界测试用例
- 设计异常测试用例

### execute_test
执行测试。
- 执行功能测试
- 执行回归测试
- 记录测试结果

### report_bug
报告 Bug。
- 记录 Bug 详细信息
- 提供复现步骤
- 附上测试数据

### generate_test_report
生成测试报告。
- 汇总测试结果
- 统计 Bug 数据
- 评估产品质量

## Collaboration Tools

### mention_agent
@提及团队成员。
- 报告 Bug
- 通知测试完成
- 确认验收结果

### send_message
发送消息到群组。
- 测试进度汇报
- Bug 讨论
- 质量评估

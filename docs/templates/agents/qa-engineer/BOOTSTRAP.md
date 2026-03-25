# BOOTSTRAP

## Welcome
欢迎加入产品研发团队！作为测试工程师，你将负责产品的质量保证和测试验证。

## First Steps
1. 熟悉产品需求和验收标准
2. 查看技术方案和设计文档
3. 了解当前产品的功能和特性
4. 与开发工程师确认提测流程

## Key Reminders
- 测试文件放在 `tests/` 目录下
- 测试报告放在 `reports/test-reports/` 目录下
- 每个 Bug 都要有清晰的复现步骤
- 测试完成后 @产品经理 确认验收
- 与 @团队协调员 同步测试进度

## Workspace Structure
```
share-task/
└── shared-task-xxxxxx/
    ├── prd/                    # 产品需求文档
    ├── docs/
    │   ├── architecture/       # 技术架构文档
    │   └── design/             # 设计文档
    ├── design/                 # 设计资源
    ├── code/                   # 代码实现
    ├── tests/                  # 测试文件（你的主要工作区）
    │   ├── unit/               # 单元测试
    │   ├── integration/        # 集成测试
    │   ├── e2e/                # 端到端测试
    │   ├── test-plan.md
    │   └── test-cases.md
    ├── deploy/                 # 部署文件
    └── reports/                # 报告文档
        ├── test-reports/       # 测试报告（你的输出区）
        │   └── bug-report-YYYYMMDD.md
        └── deployment-logs/    # 部署日志
```

## Collaboration Flow
```
开发完成 → @你进行测试 → 输出测试报告 → @全栈开发工程师修复Bug → 验证修复 → @产品经理验收 → @运维工程师部署
```

## Tools & Resources
- 重点关注 `tests/` 和 `reports/test-reports/` 目录
- 查看 `prd/` 目录的需求文档和验收标准
- 查看 `code/` 目录的代码实现
- 通过 @提及与团队协作

# 数据库迁移系统说明

## 概述

本项目使用版本化的数据库迁移系统来管理数据库结构变更，确保：
- 数据库结构变更有完整记录
- 新增字段不会删除现有数据
- 可以追踪数据库版本历史
- 支持回滚（通过创建新的迁移）

## 重要原则

### 🔴 **核心原则 - 请务必遵守！

1. **`001_initial_schema.sql 是完整的初始schema - 包含了所有基础表和字段
2. **永远不要修改已存在的迁移文件** - 包括 `001_initial_schema.sql
3. **未来的新字段必须创建新的迁移文件** - 如 `002_add_xxx.sql`
4. **已应用的迁移永远不会重新执行** - 即使你修改了迁移文件也没用

## 迁移文件位置

迁移文件位于 `src/migrations/` 目录，命名格式为：`{版本号}_{描述}.sql`

当前迁移列表：
- `001_initial_schema.sql` - **完整的初始数据库结构（包括所有表、字段、索引、约束

## 工作原理

### 对于全新数据库：
1. 系统会执行 `001_initial_schema.sql`，创建完整的数据库结构

### 对于现有数据库：
1. 系统检查 `schema_migrations` 表，查看哪些迁移已应用
2. 如果迁移1已应用，就不会再执行
3. 只执行未应用的新迁移

## 使用方法

### 1. 自动迁移（推荐）

每次启动应用时，数据库会自动检查并应用未执行的迁移：

```bash
npm run dev
```

### 2. 手动运行迁移

```bash
npm run db:migrate
```

### 3. 检查迁移状态

```bash
npm run db:status
```

## 未来添加新字段的正确做法

当需要添加新的数据库字段或修改表结构时：

### ❌ 错误做法：
- 修改 `001_initial_schema.sql` 添加新字段
- 结果：已应用的迁移不会重新执行，新字段不会被添加

### ✅ 正确做法：

1. 在 `src/migrations/` 目录创建**创建新的迁移文件
2. 文件名格式：`{下一个版本号}_{简短描述}.sql`
3. 在文件中编写SQL语句（使用 `ALTER TABLE` 等）
4. 重启应用或运行 `npm run db:migrate` 应用迁移

示例：
```sql
-- Migration 002: Add new_column to table_name
-- 描述这个迁移做什么

ALTER TABLE table_name ADD COLUMN new_column TEXT;
```

## 迁移文件示例：

**`002_add_example_field.sql**
```sql
-- Migration 002: Add example_field to agents
-- Adds an example field to the agents table

ALTER TABLE agents ADD COLUMN example_field TEXT;
```

## 重要原则（再次强调）

1. **永远不要修改已存在的迁移文件** - 已应用的迁移不应再修改
2. **使用 CREATE TABLE IF NOT EXISTS** - 确保表创建是幂等的
3. **使用 ALTER TABLE 添加新字段** - 不要重新创建表
4. **始终保留现有数据** - 迁移不应该导致数据丢失
5. **为每个变更创建独立的迁移** - 保持迁移的原子性

## 迁移记录表

系统会自动创建 `schema_migrations` 表来追踪已应用的迁移：

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 故障排除

如果迁移失败：
1. 检查迁移SQL语法是否正确
2. 查看应用日志获取详细错误信息
3. 对于"duplicate column"错误，迁移系统会自动跳过，无需担心
4. 如有必要，可以手动创建新的迁移来修复问题

## 备份建议

在应用重大迁移前，建议备份数据库文件：

```bash
# 备份数据库
cp data/db.sqlite data/db.sqlite.backup
```

## 常见问题

### Q: 我能修改了 `001_initial_schema.sql` 添加了新字段，为什么数据库没有更新？
A: 因为迁移1已经记录在 `schema_migrations` 表中，系统不会重新执行已应用的迁移。请创建新的迁移文件。

### Q: 如何为全新数据库创建数据库，`001_initial_schema.sql` 会有所有字段，但旧数据库没有怎么办？
A: 这正是迁移系统的设计：
- 全新数据库：执行 `001_initial_schema.sql`（有所有字段
- 旧数据库：通过后续迁移逐步添加缺少的字段

### Q: 我想重新开始，怎么？
A: 创建新的迁移文件，如 `002_xxx.sql`，系统会自动应用

### Q: 两个schema.sql 和 migrations/001_initial_schema.sql` 应该保持一致吗？
A: 是的！`schema.sql` 是参考文档，`001_initial_schema.sql` 是实际使用的迁移文件。

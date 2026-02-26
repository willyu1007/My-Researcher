# 00 Overview

## Status
- State: in-progress
- Next step: 执行人工全量场景验收并确认 Go/No-Go gate

## Goal
- 将文献管理前端 UIUX 提升到可用程度（接近发布级），满足三类导入入口、综览与分类、元数据管理与高级查询的完整闭环。

## Non-goals
- 不做视觉品牌重设计。
- 不新增必需后端 endpoint。
- 不引入 DSL 查询输入与复杂权限重构。

## Scope baseline
- IA 固定为标签页分步（3 标签）：
  - 自动导入
  - 手动导入（文件上传 + 文献库联动）
  - 文献综览
- 功能要求：
  - 自动获取网页文献
  - 手动上传文献
  - 联动 Zotero 等成熟文献源
  - 文献管理综览
  - 元数据管理与分类系统

## High-level acceptance criteria
- [x] 三条导入入口同等级可用且无主次依赖。
- [x] 高级查询条件构建器可执行多条件 AND/OR，并支持保存查询。
- [x] 结果列表具备行内关键信息与快速操作。
- [x] 反馈体系覆盖 `idle/loading/ready/empty/error/saving`。
- [x] 中文优先术语一致。

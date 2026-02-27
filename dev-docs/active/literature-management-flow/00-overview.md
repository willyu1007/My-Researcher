# 00 Overview

## Status
- State: in-progress
- Next step: 执行剩余手工验收（手动上传/Zotero/综览可用性）并确认 Go/No-Go gate

## Goal
- 将“自动拉取”升级为规则驱动 + 异步执行 + 可观测告警系统，并保持文献管理 UIUX 在导入/综览/元数据链路可用。

## Non-goals
- 不做视觉品牌重设计。
- 不改变 `manual import / zotero import / overview / metadata` 既有业务语义。
- 不引入 DSL 查询输入与复杂权限重构。

## Scope baseline
- IA 固定为标签页分步（3 标签）：
  - 自动导入
  - 手动导入（文件上传 + 文献库联动）
  - 文献综览
- 自动导入内分为 3 子标签：
  - Topic 设置
  - 规则中心
  - 运行与告警
- 功能要求：
  - 自动拉取改为规则驱动（全局规则 + Topic 规则）
  - 手动触发 + 定时触发（后端内置调度器）
  - 纯异步 run（`PENDING -> RUNNING -> terminal`）与单飞跳过
  - 告警面板可筛选/ack，并支持失败源重试
  - 手动上传文献
  - 联动 Zotero 等成熟文献源
  - 文献管理综览
  - 元数据管理与分类系统

## High-level acceptance criteria
- [x] 自动导入页已替换为 Topic/规则/运行告警三子标签。
- [x] 新增 Topic settings + auto-pull rules/runs/alerts API，且旧接口 `/literature/search`、`/literature/web-import` 已下线。
- [x] 同规则并发触发采用单飞跳过并产生日志化告警。
- [x] 运行明细可见 source attempt 结果与失败原因，告警可 ack，失败源可重试。
- [x] 手动导入、文献综览、元数据编辑主流程仍可用。

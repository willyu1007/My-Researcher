# 00 Overview

## Status
- State: in-progress
- Next step: 用户验收“统一文献流程 SSOT + Pipeline 骨架（自动导入/手动导入/综览统一状态与触发）”实现，并确认是否进入 backfill job 与灰度切换

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
  - 规则中心
  - 设置主题
  - 执行详情
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
- [x] 主题与规则已支持 many-to-many；主题关闭后不暂停规则，而是在 TOPIC 检索执行期跳过该主题。
- [x] 自动导入质量门槛已切换为 `min_quality_score(0-100)`，默认 `70`。
- [x] 运行明细 `source_attempt.meta` 已输出完整性拒绝/去重跳过/评分/门槛过滤/入库统计。

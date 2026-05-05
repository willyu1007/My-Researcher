# 00 Overview

## Status
- State: in-progress
- Next step: 历史 Pipeline V2.1 记录已被 `T-030` 系列拆分任务 supersede；embedding 映射回填窗口关闭，批量回填统一转入 `T-037 literature-backfill-operations-workbench`。

## Goal
- 在既有自动拉取体系基础上，完成文献 pipeline 从 V1 骨架到 V2 完整可运行版本的升级，确保 API/DB/前端语义与文档契约一致，并为后续能力（回填、检索增强、向量能力扩展）提供稳定底座。

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
  - 文献 pipeline V2（7 阶段完整执行）：
    - `CITATION_NORMALIZED`
    - `ABSTRACT_READY`
    - `KEY_CONTENT_READY`
    - `FULLTEXT_PREPROCESSED`
    - `CHUNKED`
    - `EMBEDDED`
    - `INDEXED`
  - 综览语义统一输出：
    - `pipeline_state`（深阶段就绪位）
    - `pipeline_stage_status`（7 阶段状态）
    - `pipeline_actions`（3 动作启用与原因）

## High-level acceptance criteria
- [x] 自动导入页已替换为 Topic/规则/运行告警三子标签。
- [x] 新增 Topic settings + auto-pull rules/runs/alerts API，且旧接口 `/literature/search`、`/literature/web-import` 已下线。
- [x] 同规则并发触发采用单飞跳过并产生日志化告警。
- [x] 运行明细可见 source attempt 结果与失败原因，告警可 ack，失败源可重试。
- [x] 手动导入、文献综览、元数据编辑主流程仍可用。
- [x] 主题与规则已支持 many-to-many；主题关闭后不暂停规则，而是在 TOPIC 检索执行期跳过该主题。
- [x] 自动导入质量门槛已切换为 `min_quality_score(0-100)`，默认 `70`。
- [x] 运行明细 `source_attempt.meta` 已输出完整性拒绝/去重跳过/评分/门槛过滤/入库统计。
- [x] 文献 pipeline 已升级为 7 阶段全可执行（不再返回 `STAGE_NOT_IMPLEMENTED_IN_V1`）。
- [x] 深阶段门禁已收敛：`RESTRICTED` 阻断后四阶段，`USER_AUTH` 受 `LITERATURE_USER_AUTH_PIPELINE_ENABLED` 控制。
- [x] pipeline 产物已落库（`LiteraturePipelineArtifact`），支持预处理/切分/向量/索引复用。
- [x] 综览已由后端直接输出 `pipeline_stage_status + pipeline_actions`，前端不再猜测按钮启用条件。
- [x] OpenAPI/API-Index/DB context 已与代码同步，context 严格校验通过。

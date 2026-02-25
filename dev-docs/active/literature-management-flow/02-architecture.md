# 02 Architecture

## Context & current state
- 产品定义已将文献管理列为 8 个核心模块中的底座能力（M1）。
- 当前代码库尚未形成独立文献管理模块：
  - backend 未提供文献注册表 API 与持久化表。
  - desktop 仅有导航入口，缺少流程化 UI。
  - shared 合同仅体现 paper project 创建时 evidence id 的最小约束。
- 文献管理必须服务于后续模块：M2（选题）与 M3（论文管理）的输入基础。

## Proposed design

### 流程分层（目标态）
1. Ingestion（入口层）
   - 输入：检索关键词、DOI/arXiv、本地导入。
   - 处理：调用外部源或本地解析，拿到候选文献列表。
2. Normalize（规范化层）
   - 统一字段：title/abstract/authors/year/doi/arxiv_id/source_url/source_provider/fetched_at/rights_class。
3. Dedup（去重层）
   - 规则：DOI > arXiv ID > normalized(title)+authors+year。
   - 产出：`is_new`, `matched_literature_id`, `dedup_reason`。
4. Registry（台账层）
   - 写入/更新项目级文献注册表，记录来源追溯与标签、引用状态。
5. Linking（联动层）
   - 与 topic/paper 建立关联，输出 evidence link。
6. Governance（治理层）
   - 约束：摘要级 RAG 可用；`RESTRICTED` 禁止全文向量化/跨设备同步。

### Components / modules
- Backend:
  - `LiteratureSearchService`（外部检索聚合 + 缓存）
  - `LiteratureRegistryService`（规范化 + 去重 + upsert）
  - `LiteratureLinkService`（项目关联与引用状态）
- Data:
  - 文献主实体、来源追溯实体、项目关联实体、标签与引用状态
- Desktop:
  - 文献列表、筛选、详情抽屉、关联到论文项目动作

### Interfaces & contracts
- API endpoints（proposed）:
  - `POST /literature/search`
  - `POST /literature/import`
  - `GET /paper-projects/:id/literature`
  - `POST /paper-projects/:id/literature-links`
  - `PATCH /paper-projects/:id/literature-links/:linkId`
- Data models / schemas（proposed）:
  - `literature_records`
  - `literature_sources`
  - `paper_literature_links`
  - `literature_tags` / `literature_tag_links`
- Events / jobs (if any):
  - `literature.search.executed`
  - `literature.registry.upserted`
  - `paper.literature.linked`

### Boundaries & dependency rules
- Allowed dependencies:
  - M2、M3 读取 M1 文献注册表与关联关系。
  - M1 可调用外部检索源，但必须落地来源追溯。
- Forbidden dependencies:
  - 论文管理直接绕过 registry 写入“临时文献”作为正式 evidence。
  - 在 rights=RESTRICTED 情况下执行全文向量化或跨设备同步。
  - UI 直接拼装去重逻辑，去重必须在服务端统一执行。

## Data migration (if applicable)
- Migration steps:
  - Prisma 新增文献相关表与索引（DOI/arXiv/normalized key）。
  - 旧数据迁移：若无历史台账，采用惰性初始化（首次关联时补建）。
- Backward compatibility strategy:
  - 保留既有 `createPaperProject` 入参结构。
  - 新能力通过新增接口提供，不破坏现有流程。
- Rollout plan:
  - 先启用只写 registry + 只读查询，再开启关联写入与状态更新。

## Non-functional considerations
- Security/auth/permissions:
  - 记录 source provider 与 rights_class，审计所有导入与状态变更。
- Performance:
  - 对检索请求建立查询指纹缓存，减少重复远程调用。
- Observability (logs/metrics/traces):
  - 记录 dedup hit rate、search latency、link success rate。

## Open questions
- 首批必须接入的外部数据源清单与 SLA。
- 文献标签体系是否先固定一组内置标签。
- 引用状态枚举是否直接对齐写作中心（draft/used/cited/blocked）。

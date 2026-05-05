# 文献内容处理落地 Roadmap

## Goal
- 在“收集”和“内容处理/向量化”已经拆清楚的基础上，补齐文献管理从原始资料到可检索语义资产的落地设计。
- 对齐储存边界、内容提取范围、切分策略、向量化与索引、显式触发、回填和可观测性。

## Current Baseline
- Collection chain:
  - 只负责文献记录、来源、去重、Zotero/manual/auto-pull 收集结果、选题范围关联。
- Content-processing chain:
  - 显式 `POST /literature/{literatureId}/content-processing/runs` 触发。
  - 统一使用 7 个阶段：`CITATION_NORMALIZED`、`ABSTRACT_READY`、`FULLTEXT_PREPROCESSED`、`KEY_CONTENT_READY`、`CHUNKED`、`EMBEDDED`、`INDEXED`。
  - 唯一语义顺序为：`CITATION_NORMALIZED -> ABSTRACT_READY -> FULLTEXT_PREPROCESSED -> KEY_CONTENT_READY -> CHUNKED -> EMBEDDED -> INDEXED`。
  - 现有 Prisma `LiteraturePipeline*` 内部模型保留。
- Retrieval:
  - 只读取 active embedding data，不参与 collection/content-processing 写链路。

## Landing Gaps
1. Storage gap
   - 明确原始资料、提取结果、处理产物、向量版本、索引和 active pointer 分别落在哪里。
   - 判断现有 artifact JSON 是否足够，哪些内容需要独立表、版本号、校验和、来源引用和可重算标记。
2. Extraction gap
   - 明确每篇文献需要提取哪些内容：摘要、关键内容、方法、数据集、实验结果、限制、贡献、引用元数据、章节结构、证据片段。
   - 明确哪些字段来自收集元数据，哪些只能来自内容处理。
3. Fulltext and rights gap
   - 明确 PDF/HTML/用户上传全文的储存位置、访问授权、`RESTRICTED`/`USER_AUTH` 处理门禁和可删除策略。
4. Chunking gap
   - 明确 chunk 粒度、重叠、章节锚点、页码/段落定位、token 预算、chunk_id 稳定性和重跑幂等性。
5. Vectorization gap
   - 明确 embedding provider/model/dimension/version 选择、批处理、失败重试、幂等写入、active embedding 切换条件。
6. Indexing and retrieval gap
   - 明确 token index、向量索引、metadata filter、topic/paper scope filter、证据引用返回格式和召回质量验证方式。
7. Trigger and invalidation gap
   - 明确 metadata/fulltext 更新后哪些 stage 失效、是否只刷新状态、何时需要用户显式 rerun、如何提示可处理动作。
8. Backfill and operations gap
   - 明确历史文献如何批量处理、失败如何恢复、进度如何观测、成本/速率限制如何配置。

## Proposed Milestones
1. M0 Current-State Inventory
   - 盘点现有 DB 表、artifact payload、embedding version、retrieval 读取路径、前端入口和测试覆盖。
   - 输出“保留/补齐/重做”清单。
2. M1 Storage Contract
   - 决定原始资料、标准化文本、提取结构、chunks、embeddings、indexes 的 SSOT。
   - 决定是否需要 Prisma schema migration；若需要，单独进入 DB SSOT 流程。
   - 已对齐方向：所有元数据和索引状态进入本地数据库；原始文件进入本地文件系统，数据库保存本地路径引用；设置页提供各类储存路径配置入口。
3. M2 Extraction Contract
   - 定义内容提取 schema、字段来源、最小可用集和 reviewer-aligned evidence 字段。
   - 定义手动录入、自动提取、LLM 提取之间的覆盖/合并规则。
4. M3 Chunking and Vectorization Contract
   - 定义 chunk 策略、embedding profile、版本化写入、active pointer 切换、重跑幂等。
   - 定义 external embedding 配置和本地 fallback 的产品边界。
5. M4 Processing UX and API Contract
   - 设计显式处理入口、动作状态、进度反馈、失败恢复和批量处理入口。
   - 确认 overview 是否足够，还是需要独立 content-processing workbench。
6. M5 Backfill, QA, and Operations
   - 设计历史回填、成本控制、失败重试、质量评估、回归测试和运行手册。

## Alignment Questions
- 原始全文是否进入本地 DB，还是以文件路径/对象引用储存？
- 第一版必须支持 PDF 解析吗，还是先从 abstract/key-content/manual text 开始？
- “关键内容”应是单字段 digest，还是结构化 extraction object？
- 是否需要保留每次提取/向量化的历史版本，还是只保留 active version 加最近一次 run？
- 向量检索第一版以本地 hash embedding 为 fallback 是否可接受，还是必须接外部 embedding provider？
- 检索返回的 evidence 是否必须包含页码/章节/段落定位？
- metadata 更新是否应该标记下游 stage stale，而不是只刷新 ready 状态？
- 用户是否需要批量选择多篇文献后统一触发内容处理？

## Decision Outputs
- `02-architecture.md` 记录最终边界和数据流。
- `01-plan.md` 拆分为可执行实现阶段。
- 若需要 schema 变更，创建后续 DB SSOT 实施任务，不在本任务中直接迁移。

## Implementation Split
- This task is now the umbrella package for implementation planning.
- Child implementation packages:
  - `T-031 literature-content-processing-contracts-stage-state`
  - `T-032 literature-settings-provider-storage-roots`
  - `T-039 literature-citation-abstract-readiness`
  - `T-033 literature-content-assets-fulltext-preprocessing`
  - `T-034 literature-key-content-extraction-v1`
  - `T-035 literature-chunk-embedding-index-pipeline`
  - `T-036 literature-retrieve-stale-trigger-ui`
  - `T-037 literature-backfill-operations-workbench`
  - `T-038 literature-content-processing-cutover-verification`
- DB changes are intentionally deferred to each child task's detailed design and must use DB SSOT when persisted schema changes are needed.
- Settings scope is split into `T-032`: provider/API-key entry point, model/embedding options, and local storage roots.
- Test and acceptance baselines must be completed inside each child package before implementation.
- Cutover policy: directly replace the old placeholder implementation and remove semantic drift; do not keep old/new dual tracks.

## Implementation Readiness Review
- A coverage review has been recorded in `06-implementation-readiness-review.md`.
- Review found one ownership gap: `CITATION_NORMALIZED` and `ABSTRACT_READY` needed a dedicated implementation task.
- `T-039 literature-citation-abstract-readiness` now owns deterministic citation normalization and trusted abstract readiness.
- After this addition, the task set covers settings, citation/abstract, fulltext, key content, chunking, embeddings, indexing, retrieval, stale/trigger UX, backfill/operations, and final cutover verification.
- Each implementation task must close its input/output contract and DB boundary before code changes.

## Decisions So Far
- D1 Storage boundary:
  - 使用本地数据库作为所有文献元数据、处理状态、artifact metadata、embedding version、chunk、token index、active pointer 的 SSOT。
  - 原始 PDF/HTML/文本文件保存在本地文件系统；数据库记录本地路径、checksum、mime/type、大小、来源、权限和删除状态。
  - 设置中增加储存路径入口，允许分别配置原始文件、标准化文本、处理产物、导出/缓存等本地路径。
- D2 `CITATION_NORMALIZED` execution:
  - 由脚本/确定性后端逻辑执行，不使用大模型。
  - 负责 DOI、arXiv ID、标题、作者、年份、来源 URL、去重 hash 和 `citation_complete` 判定。
  - 可接可信元数据源补全，但第一版不把 LLM 放入主链路。
- D3 `ABSTRACT_READY` execution:
  - 目标是获得可信、可引用、短文本的论文摘要层，用于综览、关键内容提取、全文缺失 fallback 和检索冷启动。
  - 第一版主要使用脚本/规则，不默认使用 LLM。
  - 来源优先级：collection metadata abstract -> fulltext/PDF Abstract 区块解析 -> 用户手动录入 -> 可信外部元数据补全。
  - LLM 生成摘要若后续引入，必须标记为 generated summary，不能默认等同论文原始 abstract。
  - 主摘要可回写 `LiteratureRecord.abstractText`；来源、checksum、language、confidence、source_ref 等完整信息进入 artifact 或后续表。
- D4 `KEY_CONTENT_READY` semantic dossier:
  - 定义为“论文语义档案完成”，而不是简单关键内容摘要。
  - 该阶段应基于摘要和全文/等价完整材料，依赖 `FULLTEXT_PREPROCESSED` 完成后再执行。
  - 使用脚本做章节/片段预处理，使用 schema-bound LLM extraction 做结构化语义提取。
  - 输出完整分类 JSON：research problem、contributions、method、datasets/benchmarks、experiments、key findings、limitations、reproducibility、related-work positioning、evidence candidates、automation signals。
  - 每个关键字段应带 source refs；evidence candidates 必须能回到原文位置。
  - `LiteratureRecord.keyContentDigest` 只保留 overview 用短 digest；完整语义档案进入 artifact 或后续表。
- D5 `FULLTEXT_PREPROCESSED` parser-led multimodal preservation:
  - 该阶段由脚本/解析器/OCR/layout/table extractor 主导，LLM 只做辅助修复，不做主导理解。
  - 负责保真提取正文、章节、段落、图、表、公式、引用、caption、位置、bbox、页码、本地路径、checksum 和相互对应关系。
  - OCR 只解决图片/扫描内容中的文字识别，不承担图表语义理解。
  - 图表对论文贡献、图表与主体论点的关系、关键视觉证据判断放入 `KEY_CONTENT_READY`，由 schema-bound/multimodal LLM 基于来源锚点提取。
- D6 `CHUNKED` flat classified chunks:
  - 摘要需要 chunk，但作为独立的 `abstract` 单 chunk，不按正文切碎。
  - `CHUNKED` 由后端 deterministic chunking service 执行，核心是脚本/确定性规则主导的 TypeScript chunker。
  - 该阶段只生成可检索、可向量化、可回溯的 chunk，不做新的论文级语义理解，也不在正常链路中调用 LLM 决定边界。
  - 第一版采用扁平 chunk 加丰富分类 metadata，不做 parent/child/section/sentence 物理层级树。
  - 基础 chunk types：`abstract`、`source_text`、`semantic_dossier`、`evidence`、`visual_table`。
  - 精细化消费通过 `semantic_category`、`evidence_role`、`source_scope`、`origin_stage` 和 provenance filter 实现。
  - `chunk_id` 必须稳定，由 literature id、source checksum、chunking profile version、chunk type 和来源/语义锚点派生，不能依赖 run id 或时间戳。
- D7 `EMBEDDED` local pipeline with OpenAI provider:
  - `EMBEDDED` 由后端 embedding service/content-processing worker 执行，读取稳定 chunk set，批量调用 provider，校验维度和数量，持久化 per-chunk embeddings。
  - 使用 OpenAI Embeddings API 作为默认 provider，但本地数据库/本地向量索引仍是主链路和 SSOT。
  - 不使用 OpenAI Vector Store 作为主链路；它可作为后续 cloud mirror 或 Responses `file_search` 集成。
  - 默认 profile 调整为 `openai/text-embedding-3-large`，经济模式为 `openai/text-embedding-3-small`，代码侧保留 provider/model/dimensions 参数。
  - 第一版不同时维护 small 和 large 两套 active 检索空间，跨文档比较必须使用同一个 active embedding profile。
  - `EMBEDDED` 开始时创建 `embedding_version: IN_PROGRESS`，全部 chunk embeddings 成功写入后标记 `READY`，但不激活 active pointer。
- D8 `INDEXED` and retrieve:
  - `INDEXED` 构建本地 vector index、token/BM25 index 和 metadata filter index。
  - 只有 `INDEXED` 成功且最小 retrieval smoke check 通过后，才事务性激活 `active_embedding_version_id`。
  - retrieve 默认只读 active indexed version。
  - 查询时必须使用 active embedding profile 调用 embedding provider 生成 query vector；query embedding 是临时值，不创建 version，可按 `normalized_query + active_embedding_profile_id` 缓存。
  - 如果 provider 不可用，retrieve 降级为本地 keyword/BM25 和 metadata filter。
  - retrieve 第一版采用 hybrid：vector search + keyword/BM25 + metadata filters，并返回 chunk/source/provenance/embedding version。
- D9 `KEY_CONTENT_READY` extraction contract:
  - 语义档案采用 versioned schema：`key_content.v1` + `paper_semantic_dossier.v1`。
  - 每个核心语义条目使用统一 item shape：id、type、statement、details、source_refs、confidence、evidence_strength、notes。
  - `READY` 要求核心分类可用且 source refs 可解析；`PARTIAL_READY` 表示可用但不完整；`FAILED` 表示不可用。
  - 不新增 stage code，partial/failed/stale 细节进入 stage status 和 artifact diagnostics。
  - 人工修正采用字段级 provenance 和 override policy，默认保护 `user_edited` 内容。
  - LLM 提取采用 section-level extraction + paper-level consolidation，不默认整篇一次性提取。
- D10 retrieve profile contract:
  - 采用统一底层索引 + 场景化 retrieve profile，不为选题、论文管理、写作分别建立三套物理索引。
  - 底层统一维护 vector index、token/BM25 index、metadata/filter index 和 provenance store。
  - 第一版 profile：`general`、`topic_exploration`、`paper_management`、`writing_evidence`。
  - profile 控制 chunk/category/source 权重、metadata filter、hybrid weights、diversity、provenance 要求、limit 和 rerank policy。
  - 排序公式和 rerank policy 先保持可调，后续按选题、论文管理、写作的真实需求迭代。
- D11 trigger and stale propagation:
  - 触发范围仅限 collection 之后的 content-processing 链路；collection 完成不自动 enqueue 内容处理。
  - stale 传播只标记状态、原因和推荐动作，不自动创建 run。
  - 调用 LLM、OCR、embedding provider 或重建索引的动作都必须显式触发。
  - 文献综览可以继续作为轻量入口，复杂控制放入详情面板/workbench。
  - 推荐动作：`process_content`、`process_to_retrievable`、`rebuild_index`、`reextract`、`retry_failed`、`view_reason`。
  - active embedding version 不因 stale 自动删除；retrieve 可继续读旧 active index，但 UI 需要提示索引可能不是最新。
  - `STALE` 作为一等 stage status，不使用 `detail.stale = true` 作为主表达。
- D12 backfill and operations:
  - 历史/批量回填使用同一条显式 content-processing 链路，不绕过单篇阶段语义。
  - 回填支持按 topic、paper、literature ids、missing/stale/failed stages、rights class、日期范围选择工作集。
  - 执行前提供 dry-run planning，估算文献数、chunk/embedding 调用、存储规模和 blocker。
  - 批量任务需要 durable job、断点续跑、暂停/恢复/取消、失败重试和跳过 blocked。
  - 并发、速率、预算分开控制：parser/OCR/LLM、embedding batching、index activation 分别限流。
  - cleanup 只能清理 superseded embeddings、旧索引、孤儿 artifact 和派生 cache，不能删除 active version 或原始文件。
  - 批量回填入口放在 content-processing workbench/operations panel，文献综览保留单条轻量动作。

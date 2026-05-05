# 01 Plan

## Phase A - Current-State Inventory
- 盘点当前 literature DB model、artifact runtime、embedding version、retrieval service、desktop 入口。
- 标记哪些能力已经可用，哪些只是占位或临时实现。

## Phase B - Storage Decision
- 设计原始内容、标准化内容、结构化提取、chunks、embedding、token index 的储存边界。
- 决定 artifact JSON 与独立表的分工。
- 判断是否需要 Prisma schema migration。

## Phase C - Extraction Decision
- 定义要提取的内容 schema。
- 区分 metadata、manual text、fulltext parser、LLM extractor 的责任。
- 定义 stale/invalidation 规则。
- 已对齐目标顺序：`KEY_CONTENT_READY` 应在 `FULLTEXT_PREPROCESSED` 之后执行，以完整正文/等价材料为主要输入。
- 已对齐 `KEY_CONTENT_READY` schema 方向：使用 versioned semantic dossier，第一版为 `key_content.v1` + `paper_semantic_dossier.v1`。
- 已对齐质量门禁：`READY`、`PARTIAL_READY`、`FAILED` 作为 stage status/artifact diagnostics，不新增 stage code。
- 已对齐人工修正规则：字段级 provenance + override policy，默认保护 `user_edited` 内容。
- 已对齐 LLM 提取策略：section-level extraction 后进行 paper-level consolidation。

## Phase D - Vectorization Decision
- 定义 chunking、embedding profile、版本化、active pointer、重跑幂等、失败恢复。
- 定义外部 embedding provider 配置边界；正常路径不保留本地 hash embedding fallback。
- `CHUNKED` 应消费 `KEY_CONTENT_READY` 产出的语义档案和 `FULLTEXT_PREPROCESSED` 标准化文本，而不是只消费摘要或元数据。
- 已对齐 chunking 方向：摘要作为独立 `abstract` 单 chunk；正文、语义档案、证据、图表分别以扁平 chunk type 表达。
- 第一版不做物理层级 chunk tree；精细化消费通过分类 metadata、source scope 和 provenance filters 完成。
- 已对齐 embedding 方向：主链路使用本地完整管线，OpenAI Embeddings API 只作为 provider。
- 默认 embedding profile 为 `openai/text-embedding-3-large`；`openai/text-embedding-3-small` 作为经济模式。
- `EMBEDDED` 写入新的 `embedding_version` 并在完成后标记 `READY`；`INDEXED` 成功后才激活 active pointer。
- OpenAI embedding 配置缺失时 `EMBEDDED` 必须 `BLOCKED`；retrieve 可显式降级为 lexical/token retrieval，但不得生成假向量。
- retrieve 查询时使用 active embedding profile 生成 query vector，不同时执行 small/large 双空间查询。
- 已对齐 retrieve 底座：统一底层索引 + 场景化 retrieve profile，先支持 `general`、`topic_exploration`、`paper_management`、`writing_evidence`。
- profile 先作为可调契约，排序权重和 rerank policy 后续按选题、论文管理、写作实际需求迭代。
- 后续实现仍需确定 token budget、overlap、chunking profile version、本地 vector index engine、ANN 参数和版本清理策略。

## Phase E - UX/API Decision
- 设计手动触发入口、批量触发入口、进度展示、失败恢复、重跑提示。
- 决定是否需要独立 content-processing workbench。
- 已对齐触发原则：collection 后的内容处理必须显式触发，stale 只刷新状态和 action availability，不自动 enqueue。
- 已对齐综览入口：文献综览保留轻量 action，复杂配置进入详情面板或 workbench。
- 已对齐 stale 行为：active embedding version 继续可读，但 UI 需要提示索引可能不是最新。
- 已对齐 stale 状态模型：`STALE` 应作为一等 stage status，原因写入 stage detail。

## Phase F - Backfill And Operations Decision
- 设计历史文献批量回填、工作集选择、dry-run 估算、队列、并发、限速、预算、失败恢复和清理策略。
- 已对齐回填原则：批量回填复用显式 content-processing 链路，不能绕过单篇 stage/run/version 语义。
- 已对齐运维入口：批量回填放入 content-processing workbench/operations panel，不塞入文献综览表格。
- 后续实现仍需确定 batch queue engine、默认并发、预算配置、provider 限速策略和清理保留窗口。

## Phase G - Implementation Split
- 将对齐后的方案拆成后续实现任务。
- 为涉及 DB 的任务创建单独 DB SSOT 变更包。
- 已拆分子任务包：
  - `T-031 literature-content-processing-contracts-stage-state`
  - `T-032 literature-settings-provider-storage-roots`
  - `T-039 literature-citation-abstract-readiness`
  - `T-033 literature-content-assets-fulltext-preprocessing`
  - `T-034 literature-key-content-extraction-v1`
  - `T-035 literature-chunk-embedding-index-pipeline`
  - `T-036 literature-retrieve-stale-trigger-ui`
  - `T-037 literature-backfill-operations-workbench`
  - `T-038 literature-content-processing-cutover-verification`
- 推荐执行顺序：
  1. `T-031` 先落合同、stage order、`STALE` 和 action 语义。
  2. `T-032` 落 provider/API-key、embedding profile 和 storage roots 设置。
  3. `T-039` 落 `CITATION_NORMALIZED` 和 `ABSTRACT_READY` 的确定性实现与 provenance 合同。
  4. `T-033` 和 `T-034` 落内容资产与语义提取。
  5. `T-035` 落 chunk/embedding/index 和 active version。
  6. `T-036` 落 retrieve profile、stale/trigger UI。
  7. `T-037` 落批量回填和运维。
  8. `T-038` 做最终直接替换清理和端到端验收。
- 每个子任务细化时必须先明确：
  - DB 变更边界和是否进入 DB SSOT。
  - 测试与验收基准。
  - 旧实现移除点，避免双轨语义。

## Phase H - Readiness Review And Gate Closure
- 已完成总包对子任务覆盖关系的 review，并形成 `06-implementation-readiness-review.md`。
- 已发现并修补早期阶段归属缺口：新增 `T-039 literature-citation-abstract-readiness`。
- 后续进入任一子任务实施前，必须先回顾该任务的输入、输出、下游消费者、DB 边界和验证门禁。
- 子任务实施完成后，必须回写本总包或最终 `T-038`，确认没有引入新的语义漂移或双轨路径。

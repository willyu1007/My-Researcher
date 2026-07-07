# Literature Pipeline Matrix (SSOT)

## Purpose & Ownership
- 本文件是文献管理域**内容处理管线(content-processing pipeline)语义的唯一入口(SSOT)**:阶段序列、阶段状态词汇、失效(STALE)传播链、触发源、以及管线与前置域(discovery/dedup/collection/fulltext-acquisition)的边界。
- 代码权威 = shared contracts(`packages/shared/src/research-lifecycle/literature-contracts.ts`);本文件与代码漂移时**以代码为准并修本文件**,一致性脚本负责让漂移在 CI 变红。
- 历史:七阶段模型定型于 T-031;域边界决策 T-029(2026-07 由 T-130 W-06 修订,见 §Pre-stage Domains);本文件由 T-130 W-08 创建(2026-07-08),消除阶段序列双写无守卫(L-12)与 fulltext 采集阶段归属表述漂移(L-16)。

## Machine-Check Contract
本文件由一致性脚本自动校验:`.ai/scripts/literature-pipeline-matrix-consistency.mjs`(经 `apps/backend/src/services/literature-pipeline-matrix-consistency.unit.test.ts` 接入 backend 默认测试套件,含 `--self-test` 漂移注入负例)。

| 校验 | 矩阵侧 | 代码权威源 |
|---|---|---|
| 阶段码集合与**顺序** | §Pipeline Stage Matrix 表行(表序即阶段序) | `LITERATURE_CONTENT_PROCESSING_STAGE_CODES`(literature-contracts.ts) |
| 阶段序列双写守卫(L-12) | —— | `literature-flow-service.ts` 的 `PIPELINE_STAGE_CODES` 必须与 contracts 逐项相等;`DEEP_PIPELINE_STAGES` 必须是其连续后缀 |
| 阶段状态词汇 | §Stage Status Vocabulary 表行 | `LITERATURE_CONTENT_PROCESSING_STAGE_STATUSES` |
| 触发源词汇 | §Trigger Sources 表行 | `LITERATURE_CONTENT_PROCESSING_TRIGGER_SOURCES` |
| 失效链(D7 心脏) | §Invalidation Chains 表行(reason_code → stale 阶段集合) | `literature-service.ts` / `literature-flow-service.ts` 中 `markStagesStale` 调用点的 `stages`+`reasonCode` 字面量 |
| 失效链必含 INDEXED | §Invalidation Chains 每行 | ——(结构性断言:INDEXED-STALE 是 W-05 retrieval 新鲜度的并集信号,任何不含 INDEXED 的链都会破坏该语义) |
| 行形状守卫 | 各被校验表每行格数 = 表头格数 | ——(缺格会让其后列静默左移) |

解析格式约定(修改表格结构前必须同步脚本):
- 被校验表的表头第一列分别是 `stage_code` / `status` / `trigger_source` / `reason_code`,单元格值用反引号包裹。
- 失效链行的 `stale_stages` 单元格内每个阶段码用反引号包裹,脚本按反引号提取并做**集合相等**比对。
- **未自动校验**:矩阵中的散文列(执行器/输入/产物/就绪信号/备注)与 §Pre-stage Domains 全节——语义变更靠人审;校验范围扩展前先扩展脚本。

## Pipeline Stage Matrix
七阶段顺序执行;`requestedStages` 可请求子集,但执行顺序恒为表序。深处理段(fulltext 及之后)= `DEEP_PIPELINE_STAGES`(自 `FULLTEXT_PREPROCESSED` 起的连续后缀)。

| stage_code | 执行器 | 输入 | 产物/落点 | 就绪信号 | 备注 |
|---|---|---|---|---|---|
| `CITATION_NORMALIZED` | deterministic(citation-normalization-service) | literature record + sources | citation profile 工件 | `pipelineState.citationComplete` | 引文身份(DOI/arXiv/title-hash)规范化 |
| `ABSTRACT_READY` | deterministic(abstract-readiness-service) | literature.abstractText + sources | abstract profile 工件 | `pipelineState.abstractReady` | 可信摘要判定 |
| `FULLTEXT_PREPROCESSED` | GROBID parser(断路器+健康门,W-02)/ OCR 回退 | raw_fulltext content asset | fulltext extraction bundle | stage state SUCCEEDED | 无 raw_fulltext 资产时 BLOCKED;采集本身不是阶段(见 §Pre-stage Domains) |
| `KEY_CONTENT_READY` | llm_gateway 提取 或 人工/codex dossier 导入 | extraction bundle / dossier | key-content dossier + `keyContentDigest` | `pipelineState.keyContentReady` | `preferredMethod!=='llm_gateway'` 时强制人工/codex dossier(仅代码语义,此处载明) |
| `CHUNKED` | deterministic chunker | key content + fulltext | embedding chunks 工件 | stage state SUCCEEDED | checksum 幂等 |
| `EMBEDDED` | embedding provider(分批,W-04) | chunks | embedding version(向量) | stage state SUCCEEDED | 任一批失败=阶段失败(原子) |
| `INDEXED` | deterministic 激活 | embedding version | active embedding version(pgvector,W-03) | `literature.activeEmbeddingVersionId` + version ACTIVE | 其 STALE 状态是检索新鲜度的**并集信号**(W-05/D7) |

## Stage Status Vocabulary
| status | 语义 |
|---|---|
| `NOT_STARTED` | 从未执行 |
| `PENDING` | 已入队待执行 |
| `RUNNING` | 执行中 |
| `SUCCEEDED` | 成功且当前有效 |
| `STALE` | 曾成功但上游内容已变,工件待重算(仍可用,标记随行——D7) |
| `FAILED` | 执行失败 |
| `BLOCKED` | 前置条件缺失(如无 raw_fulltext) |
| `SKIPPED` | 本轮未请求/条件跳过 |

## Invalidation Chains
内容变更把受影响阶段的 SUCCEEDED/STALE 置 STALE(`markStagesStale`,只降不升);**每条链都含 `INDEXED`**,故 W-05 的 retrieval 新鲜度只需看 INDEXED-STALE 一处。

| reason_code | 触发 | stale_stages |
|---|---|---|
| `CITATION_METADATA_CHANGED` | 元数据编辑改动引文身份 | `CITATION_NORMALIZED` `KEY_CONTENT_READY` `CHUNKED` `EMBEDDED` `INDEXED` |
| `ABSTRACT_CHANGED` | 元数据编辑改动摘要 | `ABSTRACT_READY` `KEY_CONTENT_READY` `CHUNKED` `EMBEDDED` `INDEXED` |
| `COLLECTION_CITATION_SOURCE_CHANGED` | collection 导入合并改动引文身份/来源 | `CITATION_NORMALIZED` `KEY_CONTENT_READY` `CHUNKED` `EMBEDDED` `INDEXED` |
| `COLLECTION_ABSTRACT_SOURCE_CHANGED` | collection 导入合并改动可信摘要 | `ABSTRACT_READY` `KEY_CONTENT_READY` `CHUNKED` `EMBEDDED` `INDEXED` |
| `RAW_FULLTEXT_ASSET_CHANGED` | raw_fulltext 资产注册/更新 | `FULLTEXT_PREPROCESSED` `KEY_CONTENT_READY` `CHUNKED` `EMBEDDED` `INDEXED` |
| `KEY_CONTENT_DOSSIER_IMPORTED` | 人工/codex dossier 导入(checksum 变化) | `CHUNKED` `EMBEDDED` `INDEXED` |

## Trigger Sources
| trigger_source | 语义 |
|---|---|
| `CONTENT_PROCESSING_ACTION` | UI/API 显式触发单文献 run |
| `BACKFILL` | 批量回灌 job(含 AUTO_ADVANCE 自动衔接,provenance 记于 job options.trigger) |

## Pre-stage Domains & Boundary(T-029 修订版)
以下均**不是**管线阶段码,是管线上游的独立域:
- **discovery**:候选发现。历史 `LiteratureDiscoveryBatch/Candidate` 死表按 D9 删除(W-09)。
- **dedup / work-identity**:读后写判重 + DB 唯一约束兜底(P2002→结构化 409,W-07)。dedup 状态记在 `pipelineState.dedupStatus`,非阶段。
- **collection import**(手动/auto-pull/Zotero):落 literature+source 记录并按 §Invalidation Chains 标 STALE。**边界(2026-07 修订)**:collection 不直接执行处理,但**可经显式闸门编排**处理任务——AUTO_ADVANCE backfill job(质量分档 ≥75 全链 / 55–75 至 FULLTEXT_PREPROCESSED,日预算,总开关默认 OFF,D8/W-06);原 T-029「collection 不触发 processing」表述废止。
- **fulltext acquisition**:9 态 Job 状态机(W-07 起有直测)获取 raw_fulltext 资产;资产注册经 `RAW_FULLTEXT_ASSET_CHANGED` 链驱动重处理。**它喂给 `FULLTEXT_PREPROCESSED` 阶段,自身不是阶段码**——历史文档把它当第三阶段的表述以本表为准。

## Retrieval Readiness(消费侧,W-05/D7)
retrieval-ready 唯一判定 = `LiteratureEvidenceActivationService.resolveRetrievalReadiness`:判定链 QUALITY_NOT_ACTIVE → KEY_CONTENT_NOT_READY → INDEX_NOT_ACTIVE → EVIDENCE_READY;freshness = INDEXED 阶段是否 STALE(并集信号)。stale 纳入但标记,标记随行至检索 warnings 与选题采样 audit。

## Change Log
- 2026-07-08(T-130 W-08):创建;载明 T-029 边界修订(AUTO_ADVANCE 显式闸门)、fulltext 采集非阶段归属、KEY_CONTENT_READY 方法优先级语义;一致性脚本上线。

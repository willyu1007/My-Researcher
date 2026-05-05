# 00 Overview

## Status
- State: done
- Next step: none; child tasks `T-031` through `T-039` have landed and `T-038` recorded final cutover verification.

## Goal
- 把文献内容处理从“已有阶段代码”推进到可实施的产品/工程方案。
- 明确哪些数据被保存、哪些内容被提取、如何切分和向量化、何时可检索、如何回填和恢复失败。

## Non-goals
- 本任务不直接修改产品代码。
- 本任务不直接修改 Prisma schema。
- 本任务不重新合并 collection 和 content-processing 链路。
- 本任务不改变已确定的 7 个 stage code。

## Scope
- 文献内容储存与 artifact 边界。
- 内容提取对象和字段定义。
- fulltext 权限与来源管理。
- chunking、embedding、indexing、active version 策略。
- 显式触发、状态失效、回填与运维。

## Umbrella Child Tasks
- `T-031 literature-content-processing-contracts-stage-state`: shared/backend/desktop contract, stage order, `STALE`, actions, direct replacement of old semantics.
- `T-032 literature-settings-provider-storage-roots`: provider API keys, model/embedding options, and storage root settings.
- `T-039 literature-citation-abstract-readiness`: deterministic `CITATION_NORMALIZED` and trusted `ABSTRACT_READY` implementation contracts.
- `T-033 literature-content-assets-fulltext-preprocessing`: local source assets and `FULLTEXT_PREPROCESSED` artifacts.
- `T-034 literature-key-content-extraction-v1`: `key_content.v1` semantic dossier extraction and validation.
- `T-035 literature-chunk-embedding-index-pipeline`: deterministic chunking, OpenAI embeddings, local indexing, and active version lifecycle.
- `T-036 literature-retrieve-stale-trigger-ui`: retrieve profiles, query embedding, stale propagation, and explicit trigger UI.
- `T-037 literature-backfill-operations-workbench`: batch backfill, dry-run, operations workbench, recovery, rate/budget controls.
- `T-038 literature-content-processing-cutover-verification`: direct replacement cleanup, no-dual-track verification, final E2E validation.

## Implementation Principles
- Subtasks should be detailed before implementation; DB changes are decided per subtask and must use DB SSOT when persisted schema changes are required.
- Settings must include one provider/API-key entry point for LLM providers and related model options, including embedding profiles.
- Settings must include local storage roots for raw files, normalized text, artifacts/cache, indexes, and exports.
- Permissions are intentionally lightweight for now; no metadata-only mode is required.
- Every child task must define test and acceptance baselines before code changes.
- Replace the old placeholder implementation directly; do not preserve a parallel old/new semantic path.

## Acceptance Criteria
- [x] Roadmap 与关键问题已对齐。
- [x] 形成可执行的后续实现子任务包。
- [x] 明确是否需要 DB migration；如需要，后续走 DB SSOT 流程。
- [x] 明确第一版最小可用内容处理链路。
- [x] 子任务包已登记到项目治理，并可逐个细化执行。
- [x] 实施就绪 review 已确认无遗漏，并记录逐阶段合同与进入下一步的 review 门禁。

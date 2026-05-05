# 06 Implementation Readiness Review

## Review Result
- Review date: 2026-05-05.
- Result: coverage is complete after adding `T-039 literature-citation-abstract-readiness`.
- Gap found: `CITATION_NORMALIZED` and `ABSTRACT_READY` had decisions in `T-030` but no dedicated implementation owner.
- Remedy: create `T-039` and insert it between settings/contracts and fulltext/key-content work.

## Requirement Coverage Matrix

| Requirement / Goal | Coverage | Owner Tasks | Review Result |
| --- | --- | --- | --- |
| Collection and content-processing remain separate | Covered | `T-031`, `T-036`, `T-038`, prior `T-029` | explicit trigger only; old dual semantics removed in cutover |
| Provider API key and model settings | Covered | `T-032` | includes provider key, redaction, embedding profile |
| Local storage path settings | Covered | `T-032`, `T-033`, `T-035` | raw files, normalized text, artifacts/cache, indexes, exports |
| `CITATION_NORMALIZED` deterministic execution | Covered after gap fix | `T-039`, `T-031` | script/backend service, no LLM identity path |
| `ABSTRACT_READY` trusted abstract handling | Covered after gap fix | `T-039`, `T-034`, `T-035` | provenance-aware abstract, one abstract chunk downstream |
| `FULLTEXT_PREPROCESSED` source-aligned artifacts | Covered | `T-033` | text, layout, figures, tables, formulas, OCR, anchors |
| `KEY_CONTENT_READY` semantic dossier | Covered | `T-034` | `key_content.v1`, source refs, visual/table interpretation |
| `CHUNKED` deterministic flat classified chunks | Covered | `T-035` | stable chunk ids, metadata filters, provenance |
| `EMBEDDED` OpenAI provider plus local SSOT | Covered | `T-032`, `T-035` | default large profile, economy small profile, no OpenAI Vector Store as SSOT |
| `INDEXED` active pointer and local indexes | Covered | `T-035`, `T-036` | local vector/token/metadata indexes; activate after smoke retrieval |
| Retrieve profiles for future product needs | Covered | `T-036` | unified index foundation plus profile-specific ranking |
| Trigger and stale propagation | Covered | `T-031`, `T-036`, `T-039` | `STALE` first-class, no auto enqueue |
| Backfill and operations | Covered | `T-037` | dry-run, durable jobs, recovery, budget, cleanup |
| Direct replacement / no semantic dual track | Covered | `T-031`, `T-035`, `T-038` | final search and E2E cutover gate |
| Testing and acceptance baselines | Covered | all child tasks, `T-038` | each child owns tests; final package owns E2E matrix |

## Flow Contract Review

| Step | Owner | Inputs | Required Outputs | Supports Next Step | Review Gate Before Next Step |
| --- | --- | --- | --- | --- | --- |
| Settings | `T-032` | app config, local environment, user-entered provider/storage settings | redacted provider config, embedding profiles, storage roots | acquisition, embeddings, indexing, backfill | secrets are redacted; storage roots are validated; default large/economy profiles are explicit |
| Stage/status contract | `T-031` | existing DTOs, backend status/action builders, desktop normalizers | canonical stage order, `STALE`, action codes, no compatibility aliases | every implementation task | route/DTO/OpenAPI/desktop contract agree on status/action names |
| Citation normalization | `T-039` | collected metadata, source payloads, user edits | normalized citation identity, dedup hash, completeness, provenance | abstract, fulltext, chunks, retrieval display | no LLM path; completeness reasons are machine-readable |
| Abstract readiness | `T-039` | metadata abstract, parsed abstract, manual abstract, trusted metadata | abstract payload, source ref, checksum, language, confidence, diagnostics | key-content extraction, abstract chunk, retrieval cold start | generated summaries are not treated as original abstracts |
| Fulltext preprocessing | `T-033` | local source asset refs, parser/OCR settings, citation metadata | normalized text, document structure, paragraphs, figures, tables, formulas, refs, layout links | key-content and chunking | anchors resolve; diagnostics distinguish partial/block/failed |
| Key content extraction | `T-034` | abstract payload, fulltext anchors, user material, extraction profile | `key_content.v1` semantic dossier, visual/table insights, claim-evidence map, quality report | chunking and automation | core categories populated or explicitly not found; source refs validate |
| Chunking | `T-035` | abstract, fulltext artifact, semantic dossier, citation metadata | stable flat chunks with type/category/source metadata and provenance | embedding and retrieve | chunk ids are deterministic; abstract is one chunk; derived/original sources are distinguishable |
| Embedding | `T-035` | chunk set, embedding profile, provider config | `embedding_version` and per-chunk vectors in `READY` state | indexing | count/dimension validation passes; version is not active yet |
| Indexing | `T-035` | ready embedding version, chunks, token data, metadata | local vector/token/metadata indexes and active pointer after smoke check | retrieve | active pointer switches only after successful index + smoke retrieval |
| Retrieve | `T-036` | active index, active profile, query, filters | hybrid ranked results with score/provenance/version | topic, paper management, writing workflows | profile contract stable; stale active index warning is visible |
| Trigger/stale UI | `T-036` | stage status, stale matrix, action availability | explicit single-item actions, detail/workbench controls, freshness warnings | user-controlled rerun and recovery | stale propagation never creates a run |
| Backfill/operations | `T-037` | workset filters, target stage, provider/storage config | dry-run plan, durable batch job, progress, retry/cancel/cleanup | scale migration and maintenance | batch fans out to the same per-literature stage chain |
| Cutover verification | `T-038` | implemented child tasks and tests | no old dual paths, E2E evidence, docs/API index updated | archival and production use | old placeholder paths removed or dev/test-only |

## Critical Review Gates
- Gate 1: finish `T-031` and `T-032` before any provider, UI, or persistence-heavy implementation.
- Gate 2: finish `T-039` before `T-033`, `T-034`, or `T-035` depends on citation/abstract inputs.
- Gate 3: finish `T-033` before `T-034` claims full semantic readiness.
- Gate 4: finish `T-034` before `T-035` creates semantic/evidence chunks.
- Gate 5: finish `T-035` before `T-036` enables profile retrieval beyond keyword fallback.
- Gate 6: finish single-literature path before `T-037` batch backfill.
- Gate 7: finish all replacement tasks before `T-038` final no-dual-track cutover.

## DB Boundary Checkpoints
- Each child task must explicitly answer whether existing artifact payloads are enough.
- If persisted fields/tables are needed, the child task must create or invoke a DB SSOT task before product code changes.
- The parent task does not authorize Prisma schema edits by itself.
- Storage roots and provider settings are likely DB/config candidates in `T-032`.
- Citation/abstract provenance, fulltext assets, semantic dossier, chunks, embeddings, active pointer, batch jobs, and cleanup records are likely persistence checkpoints in their owner tasks.

## Final Readiness Decision
- The implementation plan is executable after `T-039` registration.
- No remaining top-level requirement is uncovered.
- Remaining unknowns are implementation-level decisions owned by child packages, not umbrella planning gaps.

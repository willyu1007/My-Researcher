# 03 Implementation Notes

## Log
- 2026-05-04: Created planning task package for literature content-processing landing gaps. No product code changes.
- 2026-05-04: D1 storage decision accepted: use local DB as SSOT for metadata/state/index assets; raw files live on local filesystem with DB path references; settings should provide configurable storage roots by category.
- 2026-05-04: D2 citation normalization decision accepted: `CITATION_NORMALIZED` is deterministic backend/script logic, not LLM-driven.
- 2026-05-04: D3 abstract readiness decision accepted: `ABSTRACT_READY` should use trusted abstracts from metadata/parser/manual/external metadata first; LLM summaries must be marked generated and not treated as original abstracts by default.
- 2026-05-04: D4 key content readiness decision accepted: `KEY_CONTENT_READY` is the complete paper semantic dossier, uses schema-bound LLM extraction with source refs, and should run after `FULLTEXT_PREPROCESSED`.
- 2026-05-04: D5 fulltext preprocessing decision accepted: `FULLTEXT_PREPROCESSED` is parser/OCR/layout-led for source alignment and multimodal structure preservation; figure/table contribution understanding belongs to `KEY_CONTENT_READY`.
- 2026-05-04: D4/D5 output contract drafted in `02-architecture.md`: `FULLTEXT_PREPROCESSED` outputs structural/source-aligned artifacts; `KEY_CONTENT_READY` outputs the semantic dossier, visual/table insights, claim-evidence map, automation signals, and quality report.
- 2026-05-04: D6 chunking decision accepted: abstract becomes one independent `abstract` chunk; first implementation uses flat classified chunks with provenance instead of a physical hierarchy; deterministic chunk ids must be derived from source checksum and chunking profile.
- 2026-05-04: D6 executor clarified: `CHUNKED` is executed by the backend deterministic chunking service/TypeScript chunker; LLMs only influence upstream semantic inputs and should not decide normal chunk boundaries.
- 2026-05-04: D7 embedding decision accepted: use local pipeline as SSOT with OpenAI Embeddings API as provider; default profile is `text-embedding-3-large`, with `text-embedding-3-small` as economy mode.
- 2026-05-04: D7/D8 version decision accepted: `EMBEDDED` creates and fills a new `embedding_version` until `READY`; only `INDEXED` may activate the version after local indexes and smoke retrieval pass.
- 2026-05-04: D8 retrieve decision accepted: retrieve uses the active embedding profile for query embedding, avoids simultaneous small/large active spaces, supports query embedding cache, and degrades to local keyword/BM25 if provider is unavailable.
- 2026-05-05: D9 extraction contract decision accepted: `KEY_CONTENT_READY` uses a versioned semantic dossier schema, explicit ready/partial/failed diagnostics, field-level human override policy, and section-level extraction followed by paper-level consolidation.
- 2026-05-05: D10 retrieve profile decision accepted: use one unified index foundation with scenario-specific retrieve profiles for general, topic exploration, paper management, and writing evidence.
- 2026-05-05: D11 trigger/stale decision accepted: content-processing after collection is explicit-trigger only; stale propagation updates state/action availability without enqueueing runs; old active indexes remain readable with UI freshness warnings.
- 2026-05-05: D11 state representation decision accepted: `STALE` should be a first-class stage status; stage detail stores stale reason and recommendations, not the primary stale state.
- 2026-05-05: D12 backfill/operations decision accepted: bulk backfill reuses the explicit content-processing chain with durable jobs, dry-run planning, bounded concurrency, budget/rate controls, checkpointed recovery, and safe cleanup rules.
- 2026-05-05: Split implementation into child packages `T-031` through `T-038`; `T-030` remains the umbrella package. User confirmed DB boundaries should be finalized during child task detailing, settings should include provider API keys/model options and storage roots, permissions/metadata-only mode are out of scope for now, tests/acceptance baselines must be defined per child task, and old placeholder implementation should be directly replaced to avoid dual-track semantics.
- 2026-05-05: Completed implementation-readiness review. Found one coverage gap: `CITATION_NORMALIZED` and `ABSTRACT_READY` had decisions but no dedicated implementation owner. Created `T-039 literature-citation-abstract-readiness` and added `06-implementation-readiness-review.md` with coverage matrix, stage contracts, DB checkpoints, and review gates.
- 2026-05-05: `T-031` implementation landed. The canonical contract is now `CITATION_NORMALIZED -> ABSTRACT_READY -> FULLTEXT_PREPROCESSED -> KEY_CONTENT_READY -> CHUNKED -> EMBEDDED -> INDEXED`, `STALE` is a first-class status, and overview actions use `process_content`, `process_to_retrievable`, `rebuild_index`, `reextract`, `retry_failed`, and `view_reason`.
- 2026-05-05: `T-032` implementation landed. Added DB-backed `ApplicationSetting`, redacted literature content-processing settings API, desktop settings panel, OpenAI embedding profiles, storage roots, and settings-based embedding/retrieval provider access.
- 2026-05-05: Post-implementation quality review closed drift risks: removed product-path placeholder abstract/key-content generation, tightened stale/action completion semantics, disabled desktop action fallbacks on malformed payloads, fixed content-processing backfill stage order, and removed local desktop build artifacts from the worktree.
- 2026-05-05: Fixed an unrelated but surfaced backend scheduler test failure by normalizing `Intl.DateTimeFormat` hour `24` to `0` for UTC-midnight schedule checks.

## Open Decisions
- Exact JSON schema field types and validation implementation for `key_content.v1`.
- Chunk token budget, overlap, local vector index engine, ANN parameters, retrieve profile weights/rerank policy, and superseded version cleanup policy.
- Batch queue engine, default concurrency, budget configuration, provider rate-limit handling, and cleanup retention windows.
- UI/API shape for content-processing workbench and rerun recovery.
- Detailed implementation decisions inside each child package, including DB SSOT scope and final acceptance commands.

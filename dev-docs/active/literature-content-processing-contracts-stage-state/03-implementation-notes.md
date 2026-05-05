# 03 Implementation Notes

## Log
- 2026-05-05: Created child task from `T-030` for content-processing contract, stage order, action, and stale status replacement.
- 2026-05-05: Replaced the canonical shared/backend/desktop/OpenAPI stage order with `CITATION_NORMALIZED -> ABSTRACT_READY -> FULLTEXT_PREPROCESSED -> KEY_CONTENT_READY -> CHUNKED -> EMBEDDED -> INDEXED`.
- 2026-05-05: Added `STALE` as a first-class stage status. Backend availability logic now treats `SUCCEEDED` and `STALE` as artifact-present states, while `STALE` remains actionable for rerun/rebuild UX.
- 2026-05-05: Replaced overview action semantics with `process_content`, `process_to_retrievable`, `rebuild_index`, `reextract`, `retry_failed`, and `view_reason`. Removed old action codes from shared, backend, desktop normalizers, UI buttons, and OpenAPI.
- 2026-05-05: Updated backend run stage sorting/deduplication to follow the canonical order and updated `KEY_CONTENT_READY` prerequisites so it follows `FULLTEXT_PREPROCESSED`.
- 2026-05-05: Updated desktop literature overview/intake consumers to use the new action keys and stage order, including `STALE` normalization.
- 2026-05-05: Quality review cleanup removed old abstract/key-content placeholder generation from runtime behavior. `ABSTRACT_READY` now requires a trusted abstract source, and `KEY_CONTENT_READY` requires user-entered or extracted key-content input instead of fabricating ready artifacts.
- 2026-05-05: Tightened action availability so actions are considered already complete only when every requested target stage is `SUCCEEDED`; upstream `STALE` stages are no longer hidden by downstream ready booleans.
- 2026-05-05: Tightened desktop overview action normalization so missing/invalid action payloads default to disabled rather than silently enabling fallback actions.

## Resolved Decisions
- `STALE` does not require a Prisma migration in this task because existing pipeline stage/status persistence is string-backed.
- Public action codes are lower-snake canonical codes with no compatibility aliases.
- `view_reason` is informational and therefore has an empty `requested_stages` list.
- No product code path may synthesize placeholder abstracts or key-content digests to satisfy these stage contracts.

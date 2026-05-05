# 03 Implementation Notes

## Log
- 2026-05-05: Created child task from `T-030` for direct replacement cutover and end-to-end verification.
- 2026-05-05: Replaced `apps/backend/scripts/backfill-literature-content-processing.mjs` with a thin API client for the new durable backfill endpoints. The script no longer imports Prisma, scans literature records, or fans out directly to per-literature processing endpoints.
- 2026-05-05: Added global content-processing operations routes to OpenAPI and regenerated API index/context outputs.
- 2026-05-05: Verified collection remains separate from content-processing. Collection/import tests assert no automatic content-processing run is enqueued; raw fulltext and metadata changes mark stages stale without auto-running provider/OCR/embedding work.
- 2026-05-05: Verified batch backfill reuses single-literature `stage/run/version` semantics through `BACKFILL` trigger source, rather than introducing a second artifact execution path.
- 2026-05-05: Cutover search gates found no old action codes, old embedding env/provider paths, placeholder generated abstract/key-content paths, local hash embedding normal path, old stage order, or old direct backfill script path.
- 2026-05-05: Remaining old `/pipeline/runs` literals are limited to backend integration tests that assert legacy public routes return `404`; no OpenAPI/product route remains.
- 2026-05-05: Post-review cutover cleanup removed desktop product `vectorize`/`向量化` tab naming in favor of retrieval-ready semantics and updated the restricted-rights blocker copy to refer to embedding/index rather than generic vectorization.

## Closed Decisions
- Final sequencing: `T-037` landed first, then `T-038` cutover verification completed.
- Compatibility policy: no product dual-track was retained. Internal `LiteraturePipeline*` persistence names remain as pre-existing DB/internal implementation names, not public route semantics.
- End-to-end evidence source: backend full suite covers collection/import, explicit processing, stale behavior, retrieval, and durable backfill route smoke.

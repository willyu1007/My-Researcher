# 03 Implementation Notes

## Log
- 2026-05-04: Task started from approved implementation plan.
- 2026-05-04: Renamed public REST paths to `/literature/collections/*` and `/literature/:literatureId/content-processing*`; old routes are not registered and now 404 through normal route miss handling.
- 2026-05-04: Renamed shared literature DTOs and overview fields from import/pipeline wording to collection/content-processing wording.
- 2026-05-04: Collection import/Zotero/auto-pull paths now upsert literature records, sources, dedup state, and optional topic scope only; they no longer enqueue processing runs.
- 2026-05-04: Metadata patch refreshes derived content-processing state/action availability without enqueueing a run.
- 2026-05-04: Explicit content-processing run creation remains the trigger for extraction, chunking, embedding, indexing, active embedding version activation, and retrieval readiness.
- 2026-05-04: Desktop manual import, Zotero import, seed injection, overview normalizers, and overview actions now use collection/content-processing naming; visible status wording separates collected state from content-processing/retrieval readiness.
- 2026-05-04: OpenAPI and API index regenerated from the renamed contract surface. Prisma schema was not changed for this task.

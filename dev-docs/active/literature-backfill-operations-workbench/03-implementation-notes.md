# 03 Implementation Notes

## Log
- 2026-05-05: Created child task from `T-030` for backfill and operations workbench.
- 2026-05-05: Implemented shared backfill/cleanup contracts for durable jobs, item checkpoints, dry-run estimates, workset selectors, effective options, job/item statuses, and cleanup dry-run candidates.
- 2026-05-05: Added Prisma SSOT models and migration `20260505170000_add_literature_content_processing_batch_jobs` for `LiteratureContentProcessingBatchJob` and `LiteratureContentProcessingBatchItem`.
- 2026-05-05: Added backend `LiteratureBackfillService`, controller, routes, repository methods, Prisma store, and in-memory store support.
- 2026-05-05: The backfill worker is backend-internal and durable at the job/item/checkpoint layer. It schedules one literature stage at a time through `LiteratureFlowService.triggerContentProcessingRun(..., 'BACKFILL')` and does not execute artifact logic directly.
- 2026-05-05: Job controls support dry-run, create, list/detail, pause, resume, cancel, and retry failed. Pause stops new scheduling after in-flight work settles; cancel marks queued items canceled and stops continuation after in-flight stages settle.
- 2026-05-05: Retry only requeues retryable failed items. Rights/auth/source blockers stay non-retryable until input/state changes cause a new plan.
- 2026-05-05: Cleanup v1 is dry-run only. It reports non-active embedding/index cleanup candidates and explicitly protects active embedding versions and raw source files.
- 2026-05-05: Added `ContentProcessingOperationsPanel` under `apps/desktop/src/renderer/literature/operations/` and placed it as a separate literature operations panel, not inside the overview table.
- 2026-05-05: Post-review hardening enforced `extraction_concurrency` and `embedding_concurrency` as real stage slot limits, preserved original workset `stage_filters` during `retry-failed`, rejected invalid/inverted date selectors, rejected explicitly empty stage filters, and closed interrupted in-flight single-literature runs during durable worker resume before requeueing batch items.
- 2026-05-05: Post-review UI/CLI cleanup exposed workset `updated_at_from`/`updated_at_to` and extraction/embedding slot controls in the operations panel, and added matching date-range flags to the thin backfill CLI client.

## Closed Decisions
- Batch queue engine: backend built-in worker.
- Default concurrency: `max_parallel_literature_runs=1`, bounded to `4`; extraction and embedding slots default to `1`.
- Cleanup retention: first version exposes dry-run with `retention_days` defaulting to `30`; no delete endpoint was added.
- Budget handling: `provider_call_budget` is enforced when creating a job; dry-run only estimates. Provider backoff policy remains explicit retry/manual resume in v1 and is a follow-on hardening item.

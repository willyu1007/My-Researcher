# 01 Plan

## Phase A - Contract
- Define batch job, workset, dry-run, progress, and retry DTOs.
- Decide DB persistence for durable jobs.

## Phase B - Planner
- Estimate counts, blockers, chunks, provider calls, storage, and cost.

## Phase C - Executor
- Fan out per-literature content-processing runs.
- Checkpoint after each stage/literature.
- Enforce concurrency and budget limits.

## Phase D - Workbench
- Add operations panel for dry-run, start, pause, resume, cancel, retry, and cleanup.

## Phase E - Verification Baseline
- Dry-run tests.
- Pause/resume/cancel tests.
- Retry failed/blocked tests.
- Cleanup safety tests.
- Scale simulation for 10,000 literature records.

# 00 Overview

## Status
- State: done
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: none; final cutover verification is recorded in `T-038`.

## Goal
- Add safe historical/bulk content-processing operations for large literature sets.

## Non-goals
- Do not bypass the single-literature content-processing stage/run/version semantics.
- Do not place bulk controls inside the overview table.
- Do not delete raw source files as part of embedding/index cleanup.

## Scope
- Workset selection.
- Dry-run planning.
- Durable batch jobs.
- Pause/resume/cancel/retry.
- Concurrency, budget, rate-limit controls.
- Cleanup and retention.
- Operations workbench UI/API.

## Acceptance Criteria
- [x] Backfill can estimate before execution.
- [x] Backfill is checkpointed and resumable.
- [x] Retry behavior distinguishes retryable and non-retryable failures.
- [x] Cleanup never deletes active version or raw source files.

# Phase 2 Findings Resolution

## Scope
- This file resolves the Phase 2 implementation readiness review findings.
- It prepares Phase 2 implementation inputs and gates.
- It does not claim that persistent DB migration, sample backfill, or shadow parity has already run.

## Finding Matrix

| Finding | Resolution | Blocking Before Phase 2 Execute |
| --- | --- | --- |
| Persistent DB migration apply is not approved | Preserve explicit approval gate and target DB post-apply smoke requirements | Yes |
| No executable Phase 2 runbook | Add sample workset, query set, artifact schema, and verification checklist | No, after docs are accepted |
| No shadow runner boundary | Define internal runner and artifact sink; keep public API unchanged | No, after implementation follows this contract |
| Stale filtering vs candidate cap ordering ambiguous | Require service-resolved `eligibleEmbeddingVersionIds`; stale-ineligible versions cannot enter candidate SQL | No, after contract/test guard is in place |
| Backfill runner contract missing | Define dry-run, execute, quarantine, resume, coverage, and rollback contract | No, after implementation follows this contract |

## Non-Execution Statement
- No target persistent database mutation is authorized by this readiness package.
- No Phase 2 sample workset has been backfilled by this readiness package.
- No shadow parity result is accepted until generated from the approved target DB after JSONB baseline capture.

## Required Phase 2 Implementation Deliverables
- `literature-pgvector-phase2` runner or equivalent service entrypoint with:
  - `plan`.
  - `capture-jsonb-baseline`.
  - `backfill-sample`.
  - `run-shadow`.
  - `verify`.
- Artifact writer that emits the contracts defined in this directory.
- Tests proving:
  - shadow telemetry is not added to public response contracts.
  - stale-ineligible version IDs are excluded before pgvector candidate ranking and per-literature caps.
  - invalid vectors are quarantined without full vector payloads.
  - resume is idempotent for the same sample workset and target column.

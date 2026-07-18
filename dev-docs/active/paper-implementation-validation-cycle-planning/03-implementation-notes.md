# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-095` for validation-cycle and route/probe planning.
- Depends on T-094 motive/evidence-board output and hands off to T-096 work orders.
- No product code changes were made.

## 2026-05-21 - Backend Minimum Closure
- Added shared validation contracts and JSON schemas for `ValidationCycle`, `ValidationCycleInputSnapshot`, `TechnicalRouteCandidate`, `FeasibilityProbe`, `ExperimentPlanLight`, `ValidationPlanningReviewItem`, and `ValidationUpstreamFeedbackCandidate`.
- Added Prisma tables and migration `20260521140000_add_paper_implementation_validation_cycle_planning`; DB context refreshed from repo-prisma SSOT.
- Added in-memory and Prisma validation repositories; service remains Prisma-free.
- Added `PaperImplementationValidationCyclePlanningService` with active project checks, admitted/fresh motive checks, `CoreMotiveSet` role/limit checks, trace-ready board checks, complete validation-cycle trace admission, expected-information-gain override, baseline-gap and human-confirmation gates, low-info loop review items, and explicit feedback dispatch.
- Wired REST routes under `/paper-implementation/projects/:implementation_project_id/...`.
- Confirmed T-095 does not call experiment-foundation, does not create `ResearchWorkOrder`, does not create claims, does not mutate motive/board/portfolio authority, and does not read/write `research-argument`.
- T-096 handoff inputs are `ValidationCycle`, `TechnicalRouteCandidate`, `FeasibilityProbe`, and `ExperimentPlanLight` refs with trace and budget/stop-rule context.

## 2026-05-21 - Review Fix Closure
- Fixed `trace_manifest_ref` semantics for T-095 outputs: admitted `ValidationCycle`, `TechnicalRouteCandidate`, `FeasibilityProbe`, and `ExperimentPlanLight` now reference `trace_manifest:<trace_manifest_id>` instead of the traced target object.
- Tightened validation draft context: a cycle must carry a trace-ready `MotiveEvidenceBoardVersion` for its target `CoreMotiveVersion`; if the request omits board refs, the service backfills the current board from `CoreMotiveVersionState`, and blocks when no current board exists.
- Tightened handoff ownership: `TechnicalRouteCandidate.motive_id` must match its `CoreMotiveVersion`, route candidates tied to a cycle must use a motive version included in that cycle snapshot, and `ExperimentPlanLight` cannot combine a route with a different validation cycle.

## Open Notes
- Keep planning separate from experiment execution.
- T-096 should consume only admitted validation planning objects and should not reinterpret T-095 feedback candidates as upstream authority unless explicitly dispatched.

## 2026-07-12 - D-17 Semantic Adoption (docs-only; not implemented)
- Recorded T-132 D-17 as the product target: the exact closure-input scope derives one interpretation-ready identity, Result Analysis proposes only, and the existing Cycle closure is the sole scientific-disposition and selected-exit writer. The 2026-07-13 convergence below defines that exact scope as watermark-bound current-effective branch heads rather than all historical Runs.
- The landed caller-authored `cycle_assessment`/`decision_exit` path, mixed outcome axis and downstream packet refs remain historical implementation facts. They are mandatory atomic migration debt and must not survive as a compatibility or fallback path.
- No contracts, services, repositories, Prisma schema, routes or tests changed in this documentation update.

## 2026-07-13 - Current-effective closure-scope convergence (docs-only; not implemented)
- Refined the D-16/D-17 target from ambiguous "every/exact terminal Run" wording to one `closure_watermark` over the admission-frozen branch set and each branch's current admitted revision plus sequence-fenced head Run.
- Non-head Runs remain immutable queryable history and are excluded from readiness/snapshot/dossier by default; explicit `comparison_input_ref` adds interpretation lineage only. A missing head is a stable blocker, every active real-provider Attempt in the Cycle blocks closure, and Cycle/branch/head CAS drift forces readiness rebuild.
- Historical T-095 implementation evidence remains unchanged; no contract, code, schema, database or runtime behavior was modified.

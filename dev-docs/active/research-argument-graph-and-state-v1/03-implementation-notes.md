# 03 Implementation Notes

## Initial Decisions
- Keep graph/state as a dedicated backend task package instead of smearing it across bridge or planner work.
- Use deterministic, rule-driven state synthesis in V1 so T-028 advisory logic cannot redefine the T-025 source-of-truth.
- Treat decision and lesson logs as first-class records from the start.
- Pull `BaselineSet`, `Protocol`, `ReproItem`, `Run`, `Artifact`, `Boundary`, and `ReportProjection` into V1 instead of punting them to a later package.

## Locked Implementation Decisions
- Persistence uses mixed storage:
  - Explicit Prisma models store workspace, branch, snapshot, decision, lesson, and report projection records.
  - A shared graph object store persists graph truth by `object_kind + payload`.
- Repository layer ships both `in-memory` and `Prisma` implementations.
- T-025 exposes only internal repository/service/read-model surfaces.
- Every graph mutation synchronously recomputes snapshot and projections; only a future enqueue seam is reserved.
- T-025 materializes only `coverage`, `readiness`, and `decision_timeline` projections.
- `ReadinessDecision` remains deferred to T-026; `WorkspaceSummary.current_readiness_decision` is allowed to stay empty.

## Delivered Runtime Surface
- Added internal `research-argument` helpers for graph kind handling, branch graph assembly, read-model builders, projection builders, shared support utilities, and deterministic state synthesis.
- Added repository contract plus:
  - `InMemoryResearchArgumentRepository`
  - `PrismaResearchArgumentRepository`
- Added `ResearchArgumentService` with:
  - workspace and branch skeleton lifecycle
  - graph object upsert
  - decision and lesson recording
  - synchronous recompute
  - query access to summary, snapshots, coverage rows, readiness read model, decision timeline, lessons, and report projections
- Added Prisma schema models for:
  - `ResearchArgumentWorkspace`
  - `ResearchArgumentBranch`
  - `ResearchArgumentGraphObject`
  - `ResearchArgumentStateSnapshot`
  - `ResearchArgumentDecisionRecord`
  - `ResearchArgumentLessonRecord`
  - `ResearchArgumentReportProjection`
- Preserved metadata hooks for `sync_eligibility`, `authorization_metadata`, `git_weak_mapping_refs`, and `audit_ref`.

## Verification-Driven Fixes
- Fixed graph object discrimination so `EvidenceRequirement` is classified before `Claim`; otherwise `claim_id` caused requirements to disappear from the branch graph.
- Replaced the backend `test` script with a file-enumerating runner so `pnpm --filter @paper-engineering-assistant/backend test` works in PowerShell and other shells without depending on glob expansion.
- Fixed graph object storage identity so the same logical object id can safely exist in multiple branches. The object store now keys graph rows by `workspace + branch + object_id` instead of assuming global `object_id` uniqueness.
- Fixed snapshot ordering so latest-snapshot queries break timestamp ties by `version`, preventing non-deterministic reads when multiple recomputes land in the same millisecond.
- Fixed branch/workspace consistency checks in service methods. Graph mutations, decisions, lessons, and active-branch switching now reject cross-workspace branch references instead of silently persisting inconsistent records.
- Fixed branch skeleton closure so `createBranch` initializes snapshot and core projections for the new branch immediately.
- Fixed workspace-surface drift so recomputing an inactive branch no longer overwrites workspace-level `current_stage` or `report_pointers`.
- Fixed decision and readiness traceability so:
  - decision timeline entries resolve linked object ids back to concrete pointer kinds when those objects exist in the branch graph
  - readiness projections now retain `run`, `artifact`, and `analysis_finding` pointers in addition to baseline/protocol/repro pointers
- Removed dead helper exports from `graph-kinds.ts` that were never consumed by the T-025 runtime surface.
- Confirmed there are no repository-tracked temporary test artifacts in the T-025 scope; only formal tests and verification docs remain.
- Removed tracked historical Prisma smoke / CI raw artifacts from the archived T-003 bundle and added ignore rules so raw `dev-docs/**/artifacts` logs and machine-generated context/summary files do not drift back into git.

## Handoff Notes
- T-026 can consume the internal service surface for seed/init, readiness verify, and promote bridge work.
- T-027 can consume the same surface for dashboard, coverage, readiness, risk-review, and timeline UI.
- T-028 must treat this graph/state/read-model layer as stable source-of-truth semantics and may only add advisory behavior around it.

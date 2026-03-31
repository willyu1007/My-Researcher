# Research Argument Data Schema

## Summary
- This document is the canonical data-schema contract for the research-argument middle layer.
- It freezes domain nouns, read-model nouns, metadata helper nouns, and bridge/report artifact names.
- It does not choose database tables, Prisma models, or queue implementation details.

## Owned Requirement/Journey Slice
- Owns the canonical schema vocabulary for:
  - structured claim/evidence/baseline/protocol/repro objects
  - abstract readiness state
  - decision/lesson/report projections
  - writing handoff and submission risk artifacts

## Upstream Inputs
- Source intake:
  - `research-varify/01_research_argument_data_schema.md`
- Existing requirements:
  - `docs/project/overview/requirements.md`
- Existing adjacent contracts:
  - `packages/shared/src/research-lifecycle/title-card-management-contracts.ts`
  - `packages/shared/src/research-lifecycle/paper-project-contracts.ts`

## Exported Nouns/Interfaces
- Domain objects:
  - `ResearchArgumentWorkspace`
  - `ResearchBranch`
  - `Problem`
  - `ValueHypothesis`
  - `ContributionDelta`
  - `Claim`
  - `EvidenceRequirement`
  - `EvidenceItem`
  - `BaselineSet`
  - `Protocol`
  - `ReproItem`
  - `Run`
  - `Artifact`
  - `Boundary`
  - `AnalysisFinding`
  - `IssueFinding`
  - `DimensionState`
  - `AbstractState`
  - `ReadinessDecision`
  - `DecisionRecord`
  - `LessonRecord`
  - `ReportProjection`
- Metadata helpers:
  - `SourceTraceRef`
  - `ObjectPointer`
  - `ReportPointer`
  - `SyncEligibility`
  - `AuthorizationMetadata`
  - `GitWeakMappingRef`
  - `AuditRef`
- Read-model nouns:
  - `WorkspaceSummary`
  - `AbstractStateSnapshot`
  - `ClaimEvidenceCoverageRow`
  - `ProtocolBaselineReproReadiness`
  - `DecisionTimelineEntry`
  - `ActionQueueItem`

## Canonical Naming Rules
- Public root object:
  - use `ResearchArgumentWorkspace` and `workspace_id`
  - do not expose `ResearchArgumentProject` as a public contract
- Branch object:
  - use `ResearchBranch` and `branch_id`
- Public TS types use PascalCase.
- Public DTO fields use snake_case.
- Intake-language `Project / project_id` from `research-varify` is normalized into workspace language in all canonical contracts.

## Abstract State Contract
- Readiness is expressed through 9 dimensions:
  - `ProblemImportance`
  - `ContributionValue`
  - `NoveltyDelta`
  - `OutcomeFeasibility`
  - `ClaimSharpness`
  - `EvidenceCompleteness`
  - `EvaluationSoundness`
  - `BoundaryRiskCoverage`
  - `ReproducibilityReadiness`
- Each `DimensionState` must preserve:
  - `level`
  - `score`
  - `confidence`
  - `gap`
  - `velocity`
  - `blockers`
  - `evidence_refs`
  - `updated_at`
  - optional `rationale`
- Stage verdicts are modeled as:
  - `WorthContinuing`
  - `ReadyForWritingEntry`

## Projection Rules
- `EvaluationSoundness` must remain explainable through:
  - `BaselineSet`
  - `Protocol`
  - `Run`
  - `Artifact`
  - `AnalysisFinding`
- `ReproducibilityReadiness` must remain explainable through:
  - `Protocol`
  - `ReproItem`
  - `Run`
  - `Artifact`
- `ReportProjection` is the generic aggregation layer that later feeds coverage, risk, and handoff surfaces.

## Downstream Consumers
- `T-025` consumes the full domain and read-model vocabulary.
- `T-026` consumes bridge-facing ids, traceability refs, readiness, and report nouns.
- `T-027` consumes read-model nouns only.
- `T-028` consumes domain/read-model nouns and extends advisory outputs without redefining them.

## Explicit Out-of-Scope / Deferred
- No persistence design.
- No route path design.
- No execution queue design.
- No planner ranking formulas beyond noun freezing.

## Requirements Mapping
| Requirement / Journey slice | Coverage mode | Owner / consumer | Notes |
| --- | --- | --- | --- |
| MUST: structured Claim/Evidence/Baseline/Protocol/ReproItem management | owned | `T-024` -> `T-025` | Freezes object names and boundaries consumed by runtime persistence later. |
| MUST: Claims-to-Evidence traceability and coverage check | owned | `T-024` -> `T-025` / `T-027` | `ClaimEvidenceCoverageRow`, pointers, and source refs are frozen here. |
| MUST: submission risk review output | owned | `T-024` -> `T-026` / `T-027` / `T-028` | `ReportProjection` plus risk artifact nouns are canonicalized here. |
| MUST: local-first / sync / Git weak mapping compatibility | owned as schema boundary | `T-024` -> `T-025` / `T-026` / `T-028` | Only helper nouns are frozen here; implementation comes later. |

# Research Argument Control Plane UI

## Summary
- This document is the canonical product/UI contract for the research-argument control plane.
- It freezes the minimum screens, explainability requirements, and action/audit interaction rules.
- It does not redesign the existing `title-card` workbench or define desktop implementation details.

## Owned Requirement/Journey Slice
- Owns the user-visible middle-layer surfaces for:
  - readiness visibility
  - branch-state explainability
  - claim/evidence coverage review
  - protocol/baseline/repro readiness review
  - submission risk review
  - writing handoff preview

## Upstream Inputs
- Source intake:
  - `research-varify/03_research_argument_control_plane_ui.md`
- Canonical upstream dependencies:
  - `docs/project/architecture/research-argument-framework.md`
  - `docs/project/architecture/research-argument-data-schema.md`
  - `docs/project/architecture/research-argument-planner-spec.md`

## Exported Nouns/Interfaces
- Minimum screens:
  - `AbstractStateDashboard`
  - `BranchGraph`
  - `BlockerBoard`
  - `ClaimEvidenceCoverageTable`
  - `ProtocolBaselineReproReadinessView`
  - `SubmissionRiskReportReview`
  - `WritingEntryPacketPreview`
  - `ActionQueue`
  - `DecisionTimeline`
- Consumed read models:
  - `WorkspaceSummary`
  - `AbstractStateSnapshot`
  - `ClaimEvidenceCoverageRow`
  - `ProtocolBaselineReproReadiness`
  - `SubmissionRiskReport`
  - `WritingEntryPacket`
  - `DecisionTimelineEntry`
  - `ActionQueueItem`

## Interaction Rules
- The UI must explain `level`, `score`, `confidence`, and blockers, not just a single total score.
- `SubmissionRiskReportReview` must group findings by the canonical `finding_group` buckets:
  - `value_novelty`
  - `feasibility`
  - `claim_evidence`
  - `evaluation_fairness`
  - `boundary_risk`
  - `reproducibility`
- High-risk actions must expose:
  - confirmation state
  - reason entry
  - audit trace entry point
- The UI may invoke only canonical middle-layer actions:
  - readiness verify
  - decision action
  - planner enqueue when that surface exists later
- The UI must not read `title-card` or `paper-project` persistence details directly.

## Human Confirmation Rules
- Explicit confirmation is required for actions such as:
  - kill / archive
  - problem/value pivot
  - weakening or deleting core claims
  - expensive full runs
  - high-risk boundary or ethics notes
- Low-risk actions may remain advisory or auto-generated as long as source refs remain visible.

## Downstream Consumers
- `T-027 research-argument-control-plane-ui-v1`
- `T-028 research-argument-planner-critic-v15`

## Explicit Out-of-Scope / Deferred
- No visual design system expansion.
- No rewrite of `title-card` IA.
- No writing-stage document editor.
- No multi-project portfolio UI.

## Requirements Mapping
| Requirement / Journey slice | Coverage mode | Owner / consumer | Notes |
| --- | --- | --- | --- |
| Journey 2: claims -> evaluation evidence chain | owned as review surface | `T-024` -> `T-027` | Coverage and readiness views are frozen here; runtime data arrives later. |
| Journey 3: submission risk review output | owned as review surface | `T-024` -> `T-027` / `T-028` | `SubmissionRiskReportReview` and packet preview are canonicalized here. |
| MUST: Claims-to-Evidence traceability table | owned as UI contract | `T-024` -> `T-027` | Freezes the visible surface for coverage inspection. |
| MUST: reviewer-style risk output with pointers | owned as display contract | `T-024` -> `T-027` / `T-028` | The UI contract expects grouped findings with `severity/detail/pointers`. |

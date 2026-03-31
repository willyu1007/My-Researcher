# Research Argument Framework

## Summary
- This document is the canonical framework contract for the pre-writing `Research Argument Control Plane`.
- It defines the middle layer between `title-card` and `paper-project`.
- It does not define runtime persistence, route paths, or planner execution logic.

## Owned Requirement/Journey Slice
- Owns the canonical framing for:
  - Journey 1: research idea -> claims definition
  - Journey 2: claims -> evaluation evidence chain
  - Journey 3: submission risk review output
- Provides handoff-only framing for:
  - Journey 4: rebuttal generation

## Upstream Inputs
- Source intake:
  - `research-varify/00_research_argument_framework_rchr.md`
- Existing bounded contexts:
  - `title-card` canonical surface
  - `paper-project` canonical surface
- Requirements source:
  - `docs/project/overview/requirements.md`

## Exported Nouns/Interfaces
- `Research Argument Control Plane`
- `ResearchArgumentWorkspace`
- `ResearchBranch`
- `ArgumentObjectGraph`
- `AbstractState`
- `WorthContinuing`
- `ReadyForWritingEntry`
- `WritingEntryPacket`
- `SubmissionRiskReport`

## Architectural Position
- Upstream owner:
  - `title-card` continues to own idea shaping, evidence basket, need/question/value/package, and current promote flow.
- New middle layer:
  - research-argument owns convergence state, branch reasoning, readiness, decision log, risk report, and writing handoff packet.
- Downstream owner:
  - `paper-project` continues to own writing, version spine, release gate, and writing-package flows.

## Core Design Principles
- Evidence-first:
  - claims, readiness, and risk views must stay anchored to structured evidence or source refs.
- Reviewer-aligned:
  - readiness is modeled against reviewer-facing concerns, but reviewer heuristics are not treated as ground truth.
- Traceability-first:
  - all middle-layer outputs must preserve links back to source objects and forward to downstream handoff artifacts.
- Graph-over-stage:
  - research progression is modeled as workspace plus branch graph, not as a single linear pipeline page.
- Reopen/pivot/kill are normal:
  - the system must support non-monotonic progress and explicit decision history.
- Local-first, human-visible, safely automatable:
  - the user must be able to inspect the state, override high-risk actions, and operate offline on local truth.

## Two-Stage Readiness Contract
- Stage 1: `WorthContinuing`
  - asks whether the direction deserves more investment.
  - primary dimensions:
    - `ProblemImportance`
    - `ContributionValue`
    - `NoveltyDelta`
    - `OutcomeFeasibility`
- Stage 2: `ReadyForWritingEntry`
  - asks whether the argument is ready to enter downstream writing.
  - primary dimensions:
    - `ClaimSharpness`
    - `EvidenceCompleteness`
    - `EvaluationSoundness`
    - `BoundaryRiskCoverage`
    - `ReproducibilityReadiness`

## Downstream Consumers
- `T-025 research-argument-graph-and-state-v1`
- `T-026 research-argument-titlecard-paper-bridge`
- `T-027 research-argument-control-plane-ui-v1`
- `T-028 research-argument-planner-critic-v15`

## Explicit Out-of-Scope / Deferred
- No runtime repository or service implementation.
- No new public `paper-project` payload shape.
- No writing-stage chapter editing, diff apply, or Prism/Overleaf execution.
- No V2/V3 learning planner design.
- No rebuttal generation workflow beyond upstream packet/report handoff.

## Requirements Mapping
| Requirement / Journey slice | Coverage mode | Owner / consumer | Notes |
| --- | --- | --- | --- |
| Journey 1: research idea -> claims definition | owned | `T-024` -> `T-025` | Defines the canonical middle-layer framing and names consumed by graph/state runtime. |
| Journey 2: claims -> evaluation evidence chain | owned | `T-024` -> `T-025` / `T-026` / `T-028` | Freezes the convergence model and readiness language used by graph, bridge, and advisory layers. |
| Journey 3: submission risk review output | owned | `T-024` -> `T-026` / `T-027` / `T-028` | Establishes `SubmissionRiskReport` as a first-class middle-layer artifact. |
| Journey 4: rebuttal generation | handoff | `T-024` -> downstream writing lane | This layer only produces structured upstream refs and packets for a later writing workflow. |
| Claims/Evidence/Baseline/Protocol/ReproItem management | owned | `T-024` -> `T-025` | Freezes nouns and boundaries without deciding persistence details. |
| Rule output with `severity/detail/pointers` | handoff to advisory | `T-024` -> `T-028` / `T-027` | The canonical report shape is frozen here; deterministic rule behavior lands later. |

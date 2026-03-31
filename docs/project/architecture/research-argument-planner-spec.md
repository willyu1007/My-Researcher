# Research Argument Planner Spec

## Summary
- This document is the canonical planner/advisory contract for the research-argument layer.
- It freezes the advisory vocabulary consumed by `T-028` and referenced by the UI and bridge layers.
- It does not define concrete runtime jobs, scheduling infrastructure, or model prompts.

## Owned Requirement/Journey Slice
- Owns the canonical advisory layer for:
  - candidate generation
  - bundle planning
  - reviewer-style critique
  - deterministic rule findings
  - risk report assembly vocabulary
  - async/API governance nouns

## Upstream Inputs
- Source intake:
  - `research-varify/02_research_argument_planner_spec.md`
- Canonical upstream dependencies:
  - `docs/project/architecture/research-argument-framework.md`
  - `docs/project/architecture/research-argument-data-schema.md`
- Requirements source:
  - `docs/project/overview/requirements.md`

## Exported Nouns/Interfaces
- `PlannerAction`
- `PlannerCandidate`
- `PlannerBundle`
- `CriticFinding`
- `RuleFinding`
- `SubmissionRiskFinding`
- `AsyncTaskRecord`
- `CriticHub`
- `RuleEngine`

## Advisory Boundary
- Planner/Critic outputs are advisory by default.
- Advisory outputs must not become source-of-truth automatically.
- Escalation to authority requires one or more of:
  - citation-backed evidence
  - deterministic checks
  - explicit candidate selection
  - human confirmation for high-risk actions

## Action Space Contract
- Canonical action families:
  - problem/theory/claim design
  - evaluation/protocol design
  - method implementation/execution
  - evidence analysis/boundary update
  - search control/branch governance
- Every action contract must preserve:
  - input refs
  - expected impact
  - preconditions
  - cost/risk summary
  - human-confirmation requirement when applicable

## Critic And Rule Split
- `CriticHub`
  - owns reviewer-style critique and non-authoritative suggestions
- `RuleEngine`
  - owns deterministic hard checks
- `SubmissionRiskFinding`
  - is the canonical grouped risk item vocabulary consumed by risk reports and UI review surfaces
  - must carry one primary `finding_group` from:
    - `value_novelty`
    - `feasibility`
    - `claim_evidence`
    - `evaluation_fairness`
    - `boundary_risk`
    - `reproducibility`

## Async/API Governance Vocabulary
- `AsyncTaskRecord` freezes the nouns later used for:
  - task type
  - idempotency key
  - attempt state
  - retry/backoff policy
  - cost refs
  - telemetry refs

## Downstream Consumers
- `T-028 research-argument-planner-critic-v15`
- `T-027 research-argument-control-plane-ui-v1`
- umbrella close review in `T-023`

## Explicit Out-of-Scope / Deferred
- No bundle ranking implementation.
- No prompt templates.
- No queue adapter or worker implementation.
- No retry/backoff numeric policy.
- No observability backend integration.

## Requirements Mapping
| Requirement / Journey slice | Coverage mode | Owner / consumer | Notes |
| --- | --- | --- | --- |
| MUST: rule output contains `severity/detail/pointers` | owned as contract | `T-024` -> `T-028` / `T-027` | The output vocabulary is frozen here; rule execution lands in `T-028`. |
| MUST: long-running automation and background tasks | owned as noun boundary | `T-024` -> `T-028` | `AsyncTaskRecord` freezes task/governance nouns without choosing infrastructure. |
| MUST: external API governance | owned as noun boundary | `T-024` -> `T-028` | Retry, idempotency, rate-limit, and cost nouns are frozen here, not implemented. |
| Journey 3: submission risk review output | owned as advisory vocabulary | `T-024` -> `T-028` / `T-027` | `SubmissionRiskFinding` provides the canonical unit later assembled into `SubmissionRiskReport`. |

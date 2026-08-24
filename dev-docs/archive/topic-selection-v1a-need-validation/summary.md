# topic-selection-v1a-need-validation

## Outcome

- Implement the v1a decision loop from EvidenceMap to human-confirmed `ValidatedNeed`.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-049`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-16`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- `output_validated_need_id` is non-null only for validate.
- `ValidatedNeed` can trace to candidate, support packet, adjudication result, human decision, evidence units, SearchRun, SearchPlan, and literature snapshot.
- Request-searchplan-recheck creates a structured request instead of mutating SearchPlan.
- Candidate memory suggestions are handed to recheck/risk/memory and do not become durable blocking memory without policy interpretation.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-v1a-need-validation/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

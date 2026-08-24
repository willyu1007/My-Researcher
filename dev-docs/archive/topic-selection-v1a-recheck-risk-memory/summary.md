# topic-selection-v1a-recheck-risk-memory

## Outcome

- Implement v1a cross-cutting recheck, risk acceptance, override, decision memory, and focused work queue behavior.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-051`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-16`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Duplicate events merge instead of creating storms.
- Historical resolved ledger cycles are not blocked by broad status uniqueness.
- Impact and queue dedup prevent repeated queue items for equivalent open work.
- Retry budget defaults to `3`; cooldown defaults to 30 minutes.
- Raw control-plane signals do not create queue/state until policy interpretation runs.
- LLM state signals cannot write freshness directly.
- Accepted risk and override preserve scoped rationale and refs.
- Human overrides and accepted-risk resolutions reject missing, expired, inactive, or out-of-scope risks.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-v1a-recheck-risk-memory/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

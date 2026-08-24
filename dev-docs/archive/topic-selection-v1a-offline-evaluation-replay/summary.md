# topic-selection-v1a-offline-evaluation-replay

## Outcome

- Implement offline evaluation/replay for v1a evidence-to-need workflows.
- Produce a first baseline for agreed minimum metrics without writing production authority objects.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-050`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-16`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Replay does not write production ValidatedNeed.
- Each metric result has numerator, denominator, contributing cases, and notes.
- ReplayDiff flags final decision, key evidence, blocker set, and trace verdict changes.
- Stage baseline includes the agreed minimum metrics and links failures back to frozen inputs.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-v1a-offline-evaluation-replay/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

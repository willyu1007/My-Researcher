# topic-selection-v1a-foundation-control-plane

## Outcome

- Implement the v1a shared control-plane foundation used by all evidence-to-need workflows.
- Provide stable context, artifact, workflow-run, readiness-gate, transition, policy, and state-axis contracts before business objects rely on them.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-048`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-16`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- A transition can be replayed from `ChainTransitionAttempt` to gate result, input snapshot, workflow run, and artifacts.
- A deterministic blocker prevents authority state write.
- A pass-with-risk transition requires accepted risk refs.
- Trace and human-gate refs can be attached to downstream authority objects without redefining local schemas.
- Missing gates cannot default to pass for transition attempts.
- Human-gate refs must resolve to matching confirmed human decision records before state-write intents are recorded.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-v1a-foundation-control-plane/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

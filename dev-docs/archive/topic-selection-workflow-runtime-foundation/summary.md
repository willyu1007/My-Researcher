# topic-selection-workflow-runtime-foundation

## Outcome

- Build a unified `WorkflowHarness` for topic-selection backend flows so mocked, Codex-assisted, and provider-backed runs share the same node contract, trace shape, fixture setup, and assertion model.
- Implement a generic `AgentOrchestrator` boundary that can execute ordinary agent workflow steps with explicit profile selection, retries, structured outputs, evidence assignment, and audit artifacts.
- Productize a profile escalation policy runtime so nodes can move from cheap/mock/local profiles to stronger provider profiles only when deterministic criteria require it.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-088`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-workflow-runtime-foundation/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

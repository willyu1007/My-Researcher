# topic-selection-llm-context-cache-runtime

## Outcome

- Define and implement a shared LLM context/cache/token-budget runtime for the entire topic-selection management flow.
- Cover resource sampling, v1a, v1b, v1c, downstream feedback/recheck, and provider/Codex-assisted harness execution paths.
- Preserve existing authority boundaries, route-policy semantics, replay/idempotency behavior, and audit provenance while reducing provider cost and long-context failure risk.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-112`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Shared schema tests.
- Backend unit tests for cache hit/miss/drift.
- Harness tests for v1a/v1b/v1c cache and token-budget behavior.
- Provider canaries for OpenAI and DashScope telemetry/provenance.
- Resource-sampling L4 provider canary and L5 compression adversarial coverage.
- Governance sync/lint.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-llm-context-cache-runtime/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

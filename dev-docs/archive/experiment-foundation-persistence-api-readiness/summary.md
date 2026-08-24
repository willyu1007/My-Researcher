# experiment-foundation-persistence-api-readiness

## Outcome

- Implement durable metadata storage and REST surfaces for experiment-foundation assets, protocols, readiness checks, recipe/run-recipe records, materialization request records, candidates, results, evidence, and sidecars while preserving domain DTO boundaries.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-076`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-012` — Experiment foundation reusable assets baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Services return domain/API DTOs.
- Prisma does not leak into business layer.
- APIs do not expose secrets or adapter-private payloads.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/experiment-foundation-persistence-api-readiness/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

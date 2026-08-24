# experiment-foundation-materialization-adapter-contracts

## Outcome

- Define materialization contracts so a valid `RunRecipe` becomes a normalized `TrainingTaskSpec` plus adapter metadata refs without leaking platform-private fields into reusable domain contracts.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-073`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-012` — Experiment foundation reusable assets baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Materialization result has traceability back to RunRecipe.
- Adapter metadata ref does not expose secrets.
- TrainingTaskSpec remains normalized.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/experiment-foundation-materialization-adapter-contracts/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

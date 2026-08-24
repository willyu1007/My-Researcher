# experiment-foundation-benchmark-protocol-contracts

## Outcome

- Define reusable comparison contracts so `BenchmarkAsset` identifies the testbed, `EvaluationProtocol` owns versioned/hashable evaluation rules, and `BaselineAsset` / `BaselineImplementationVersion` represent comparison implementations without duplicating research-argument baseline sets.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-071`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-012` — Experiment foundation reusable assets baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Benchmark identity and evaluation rules are separate.
- Baseline identity and implementation version are separate.
- Protocol fields support result validation and paper sidecar locking.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/experiment-foundation-benchmark-protocol-contracts/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

# 03 Implementation Notes

## 2026-05-17
- Created to resolve BenchmarkAsset / EvaluationProtocol overlap and keep retired workspace-selection fields out of canonical baseline metadata.
- Initial design decision: `BenchmarkAsset` references protocol versions; `EvaluationProtocol` owns versioned/hashable evaluation rules.

## 2026-05-17 - Landing
- Extended `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts`.
- Added benchmark/protocol/baseline records and schemas:
  - `BenchmarkAsset`
  - `MetricDefinition`
  - `EvaluationProtocol`
  - `BaselineAsset`
  - `BaselineImplementationVersion`
  - `EvaluationProtocolLock`
  - `BaselineImplementationVersionLock`
- Added schema tests for canonical benchmark/protocol/baseline payloads and negative boundary cases:
  - `BenchmarkAsset` rejects embedded metric/evaluator/reporting/statistical/comparison/budget/tuning rules.
  - `EvaluationProtocolLock` requires protocol version and hash.
  - `BaselineAsset` rejects implementation details and retired workspace-selection fields.
  - `BaselineImplementationVersion` requires code ref and entrypoint and rejects baseline-set ownership.
- Handoff owner is `T-072 experiment-foundation-version-lock-recipe-contracts`.

## 2026-05-17 - Post-review Boundary Patch
- Fixed schema gaps found during T-071 quality review:
  - `BenchmarkAsset` now explicitly rejects baseline implementation ref/id/version field variants, not only `baseline_implementation_id`.
  - `BaselineAsset` now explicitly rejects protocol/evaluation protocol field variants and protocol internals, not only `linked_protocol_ids`.
- Added negative schema coverage for these field variants so Fastify/Ajv unknown-field stripping cannot silently accept ownership drift.

# 01 Plan

## Phases
1. Freeze BaselineAsset, BaselineImplementationVersion, BenchmarkAsset, EvaluationProtocol, and MetricDefinition ownership.
2. Remove evaluation-rule duplication from BenchmarkAsset.
3. Define protocol version/hash fields and readiness ladders.
4. Align with research-argument `baseline_set` and protocol readiness consumers.
5. Add positive and negative schema tests.

## Acceptance Criteria
- `BenchmarkAsset` stores benchmark/testbed identity and default protocol refs, not full evaluation rules.
- `EvaluationProtocol` stores versioned/hashable metrics, aggregation, seeds, reporting, comparison, budget, and tuning fairness rules.
- `BaselineAsset` stores method/model identity; `BaselineImplementationVersion` stores code/runtime/entrypoint/version.
- Retired workspace-selection fields remain outside canonical baseline metadata.
- Missing protocol version/hash blocks formal comparison and RunRecipe locking.

## Review Gate
- Close this task before version-lock composition and result validation contracts freeze protocol fields.

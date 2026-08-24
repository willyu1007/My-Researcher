# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: hand off to `T-072 experiment-foundation-version-lock-recipe-contracts`.

## Goal
- Define reusable comparison contracts so `BenchmarkAsset` identifies the testbed, `EvaluationProtocol` owns versioned/hashable evaluation rules, and `BaselineAsset` / `BaselineImplementationVersion` represent comparison implementations without duplicating research-argument baseline sets.

## Non-goals
- Do not build leaderboard behavior.
- Do not require a full benchmark run for baseline catalog entry.
- Do not depend on retired pre-writing control-plane graph semantics.

## Responsibilities
- Remove full metric/evaluator/reporting/comparison ownership from `BenchmarkAsset` where it belongs to `EvaluationProtocol`.
- Add versionable protocol and baseline implementation concepts for downstream locks.
- Define verification ladders for baseline and benchmark readiness.
- Keep retired workspace-selection fields out of canonical baseline metadata.

## Boundary
- Owns benchmark, protocol, metric definition, baseline identity, and baseline implementation contracts.
- Hands off version-lock composition to `experiment-foundation-version-lock-recipe-contracts`.
- Hands off result validation and evidence conversion to `experiment-foundation-result-evidence-sidecar-contracts`.

## Done Means
- `BenchmarkAsset` answers "怎么比" at identity/testbed level.
- `EvaluationProtocol` answers exact versioned/hashable rules.
- `BaselineAsset` answers "和谁比" without owning benchmark protocol fields.

## Acceptance criteria
- [x] `BenchmarkAsset` stores benchmark/testbed identity and default protocol refs, not full evaluation rules.
- [x] `EvaluationProtocol` stores versioned/hashable metrics, evaluator, reporting, comparison, statistics, budget fairness, and tuning fairness rules.
- [x] `BaselineAsset` stores method/model identity while `BaselineImplementationVersion` stores code/runtime/entrypoint/version fields.
- [x] Retired workspace-selection fields do not leak into canonical baseline assets.
- [x] Shared typecheck/test and project governance sync/lint pass.

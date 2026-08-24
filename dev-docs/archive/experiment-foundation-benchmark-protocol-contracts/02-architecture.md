# 02 Architecture

## Ownership Split
| Object | Owns | Must not own |
|---|---|---|
| `BenchmarkAsset` | benchmark/testbed identity, task, domain, official dataset/split refs, default protocol refs, source/community refs | full metric rules, statistical policy, budget fairness, one baseline implementation |
| `EvaluationProtocol` | version, protocol_hash, metric definitions, aggregation, seeds/repeats, reporting, comparison, tuning/budget fairness, statistical checks | canonical benchmark identity or paper-specific run config |
| `MetricDefinition` | metric id, direction, unit, parser/evaluator refs, validity constraints | result values |
| `BaselineAsset` | method/model identity, source refs, family, recommended use, supported benchmark refs | specific code commit or benchmark protocol |
| `BaselineImplementationVersion` | code ref/commit, runtime, entrypoint, params, input/output contract, verification status | workspace baseline-set selection |

## Required Invariants
- `BenchmarkAsset` references protocol versions; it does not duplicate protocol internals.
- `EvaluationProtocol` MUST be versioned and hashable before formal comparison.
- `BaselineImplementationVersion` is the lockable comparison implementation.
- Retired workspace-selection fields consume refs historically; they are not a canonical asset registry or current dependency.

## Downstream Contract Support
- `RunRecipe` locks baseline implementation version and evaluation protocol version/hash.
- Result validation checks protocol hash compatibility before evidence candidate creation.
- Paper sidecar stores benchmark/protocol/baseline refs and snapshots, not full DTOs.

## Negative Schema Tests
- Reject protocol-compatible runs without evaluation protocol version/hash.
- Reject baseline smoke verification without code ref and entrypoint.
- Reject BenchmarkAsset payloads that embed full statistical/comparison rules instead of protocol refs.

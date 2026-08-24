# 01 Plan

## Phases
1. Define `ExperimentFoundationVersionLock` shape.
2. Define `RecipeDraft` editable planning state.
3. Define locked `RunRecipe` payload and readiness snapshot.
4. Define method component contract and S1-B extension shell strategy.
5. Add negative tests for direct draft execution, missing locks, missing hashes, stale readiness, and fine-tuning bypass.

## Acceptance Criteria
- `RunRecipe` locks dataset, baseline implementation, benchmark/protocol, method component, metric/protocol hash, readiness, and provenance refs.
- `RecipeDraft` may be incomplete but cannot be submitted.
- Method recipe objects are inert until instantiated into `RunRecipe`.
- Fine-tuning flows through `TrainingTaskSpec.profile = llm_fine_tuning`, not a standalone fine-tuning execution path.
- Execution profile is capability-oriented, not a platform id or vendor field.

## Review Gate
- Close after dataset and benchmark/protocol contracts settle.
- Close before materialization and adapter metadata contracts freeze.

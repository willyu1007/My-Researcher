# 03 Implementation Notes

## 2026-05-17
- Created to convert the existing prose requirement "RunRecipe locks refs/versions/protocol/readiness" into concrete S1-A contracts.
- Initial design decision: fine-tuning is not a separate execution entry; it is a training task profile derived from a locked recipe.

## 2026-05-17 - Landing
- Extended `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts` with:
  - `ExperimentFoundationReadinessSnapshot`
  - `MethodRecipeComponent` and `MethodRecipeComponentLock`
  - `ExperimentFoundationExternalLockRef`
  - `ExperimentFoundationVersionLock`
  - `RecipeDraft`
  - `ExperimentFoundationExecutionProfile`
  - `GenerateRunRecipeRequest`
  - `RunRecipe`
- Kept T-072 as a shared-contract-only slice; no Prisma, backend API, desktop UI, `TrainingTaskSpec`, or adapter metadata changes.
- Fine-tuning is represented at this layer by locked external refs for base model, fine-tuning dataset, strategy, prompt template, and context policy. Full `FineTuningTaskProfile` remains T-073 ownership.
- Readiness is represented as a locked snapshot. Full readiness rule/service/blocker implementation remains a later persistence/API/readiness responsibility.
- Added schema tests for canonical payloads and negative boundary cases: direct draft execution, missing locks/hashes, non-passed readiness, platform-private leakage, fine-tuning bypass, and unlocked method components.

## 2026-05-17 - Post-review Boundary Patch
- Fixed T-072 review findings:
  - `BaselineImplementationVersionLock` now carries `runtime_ref` and `runtime_hash`, so T-073 can materialize runtime/image inputs from locked recipe context rather than re-reading mutable baseline metadata.
  - `RecipeDraft` now explicitly rejects the same platform-private aliases as `RunRecipe` and `ExperimentFoundationExecutionProfile`.
  - Non-`llm_fine_tuning` execution profiles now reject `fine_tuning_external_lock_refs`.
- Expanded schema tests to cover missing runtime locks, platform-private `RecipeDraft` leaks, and fine-tuning refs on standard profiles.

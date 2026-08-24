# 03 Implementation Notes

## 2026-05-17
- Created to resolve the adapter metadata boundary called out in the design review.
- Initial design decision: adapter-private payloads may be referenced and hashed, but they do not live inside RunRecipe.

## 2026-05-17 - Contract Landing
- Added T-073 shared contracts to `experiment-foundation-contracts.ts` without Prisma/API/UI/adapter implementation.
- `MaterializeTrainingTaskSpecRequest` consumes a full T-072 `RunRecipe`; it does not redefine recipe/version-lock semantics.
- `TrainingTaskSpec` is the normalized execution payload and retains `run_recipe_hash`, `version_lock_hash`, `materialization_request_id`, runtime hash, config hash, selected platform ref, and auth ref names.
- `FineTuningTaskProfile` is embedded only for `profile_kind = llm_fine_tuning` and requires locked base model, fine-tuning dataset, dataset policy, strategy, prompt template, context policy, resource budget, evaluation protocol, and output artifact contract.
- Adapter-private payloads stay behind `ExperimentFoundationAdapterMetadataRef` plus hashes; inline platform payloads, endpoint/region/queue, credentials, SDK payloads, and external job ids are rejected by schema.
- Added stage event, cancellation request, and partial result ref hooks for later execution/result packages without implementing adapters.
- Handoff owner is `T-074 experiment-foundation-result-evidence-sidecar-contracts`.

## 2026-05-17 - Post-review Boundary Patch
- Fixed T-073 review findings:
  - `ExperimentFoundationTrainingPlatformRef` now rejects mismatched V1 platform/adapter pairs such as `local_script` with `aliyun_pai_dlc`.
  - `TrainingTaskMaterializationResult` is now status-aware: `materialized` / `partial` require task spec and adapter metadata refs/hashes, while `blocked` / `failed` can record blockers without fabricated output refs.
  - `TrainingTaskStageEvent`, `TrainingTaskCancellationRequest`, and `TrainingTaskPartialResultRef` now require `training_task_spec_hash` alongside `training_task_spec_ref`.
- Added schema tests for the three boundary patches.

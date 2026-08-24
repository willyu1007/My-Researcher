# 02 Architecture

## Boundary
```text
RunRecipe
  + selected platform id
  + adapter version
  -> TrainingTaskSpec
  + TrainingTaskMaterializationResult
  + adapter metadata ref
```

T-073 consumes the T-072 `RunRecipe`, `version_lock_hash`, readiness snapshot, and capability-oriented execution profile. It MUST NOT redefine `ExperimentFoundationVersionLock`, `RecipeDraft`, or `RunRecipe` lock semantics.

## Normalized TrainingTaskSpec Fields
- run_recipe_id and run_recipe_lock_hash
- profile kind: `standard_training`, `evaluation_only`, `llm_fine_tuning`, or future extension
- runtime/image ref, command, args, env refs
- input refs and output contract
- resource request and timeout
- config snapshot hash
- auth refs by name only, never secrets

## Adapter Metadata Fields
- adapter kind/version
- platform id and platform payload ref/hash
- idempotency key and materialization hash
- submit policy, retry policy, cancellation policy
- private endpoint/region/queue/sdk payload stored outside `RunRecipe`

## Required Invariants
- Platform-private fields are forbidden in `RunRecipe`.
- `TrainingTaskSpec` is not reusable asset metadata.
- Materialization must be reproducible from valid lock + selected platform + adapter version.
- Fine-tuning profile must be materialized from T-072 fine-tuning external lock refs and must include dataset policy, template/context policy, resource budget, evaluation protocol refs, and output artifact contracts.

## Negative Schema Tests
- Reject stale or invalid RunRecipe materialization.
- Reject `RunRecipe` containing `oss`, `pai`, `dlc`, `aliyun`, `k8s`, `slurm`, `endpoint`, `region`, `queue`, or access key fields.
- Reject fine-tuning profiles missing policy, template/context, resource, or evaluation refs.

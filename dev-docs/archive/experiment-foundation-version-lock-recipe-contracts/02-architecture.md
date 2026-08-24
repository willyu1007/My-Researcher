# 02 Architecture

## Core Contract Chain
```text
RecipeDraft
  -> GenerateRunRecipeRequest
  -> RunRecipe + ExperimentFoundationVersionLock
  -> MaterializeTrainingTaskSpecRequest
```

## Version Lock Contents
- dataset_version_id, checksum_manifest_hash, split_protocol_hash, data_policy_ref/hash
- baseline_implementation_version_id and code/runtime hash
- benchmark_asset_id and evaluation_protocol_version/hash
- method component version refs and config hash
- metric/protocol hash and readiness report id/hash
- provenance refs, source workspace refs, and lock timestamp

## Recipe Rules
- `RecipeDraft` is editable and may be incomplete.
- `RecipeDraft` MUST NOT be submitted or materialized directly.
- `RunRecipe` is immutable after lock creation.
- `RunRecipe` MUST remain platform-neutral.
- Method objects are reusable components until instantiated into a locked `RunRecipe`.
- Fine-tuning is a profile inside the same recipe/materialization path.

## Execution Profile
- `RunRecipe.execution_profile` expresses capabilities such as local smoke, cloud training, GPU class, distributed support, long-running job, or fine-tuning support.
- `execution_profile` MUST NOT include vendor ids, regions, queues, endpoints, credentials, or SDK payloads.

## Negative Schema Tests
- Reject direct draft execution.
- Reject RunRecipe with missing version locks or protocol hashes.
- Reject stale readiness snapshots.
- Reject platform-private fields in RunRecipe.
- Reject fine-tuning task execution that does not reference a locked RunRecipe.

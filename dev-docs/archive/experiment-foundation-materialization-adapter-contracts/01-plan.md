# 01 Plan

## Phases
1. Define materialization request and valid input checks.
2. Define normalized `TrainingTaskSpec`.
3. Define materialization result, adapter metadata ref, platform payload hash, idempotency key, and event hooks.
4. Define fine-tuning profile fields and policy/resource/evaluation requirements.
5. Add negative tests for platform-private leakage, stale RunRecipe materialization, missing auth refs, and incomplete fine-tuning profiles.

## Acceptance Criteria
- [x] `RunRecipe` never contains OSS, PAI-DLC, endpoint, region, queue, k8s, slurm, access key, or SDK payload fields.
- [x] `TrainingTaskSpec` contains normalized runtime, command, env refs, input refs, output contract, resource request, timeout, and profile.
- [x] Adapter metadata is persisted or referenced outside domain recipe contracts.
- [x] Materialization is reproducible from RunRecipe lock + platform selection + adapter version.

## Review Gate
- Close after version-lock/recipe contracts.
- Close before LocalScript/Aliyun adapter implementation.

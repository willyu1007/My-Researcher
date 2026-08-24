# 05 Pitfalls

## Do Not Repeat
- Do not store endpoints, regions, queues, or access keys in RunRecipe.
- Do not make TrainingTaskSpec the owner of canonical asset metadata.
- Do not allow materialization from invalid locks.

## Adapter Payload Leakage
- Symptom: materialization contracts can accidentally become a vendor SDK request body.
- Root cause: `TrainingTaskSpec` legitimately owns platform selection refs, but not platform-private execution payloads.
- Fix: use T-073-specific forbidden fields that allow `platform_id` and materialization ids while rejecting endpoint/region/queue/credentials/SDK payloads and inline adapter payloads.
- Prevention: concrete LocalScript/Aliyun request bodies must stay in adapter implementation or adapter metadata storage refs, never in `RunRecipe` or normalized `TrainingTaskSpec`.

## Fine-Tuning Bypass
- Symptom: LLM fine-tuning could reappear as a separate execution path outside `RunRecipe`.
- Root cause: T-072 intentionally locked only external refs, leaving task-profile depth to T-073.
- Fix: `TrainingTaskSpec.profile_kind = llm_fine_tuning` requires `FineTuningTaskProfile`; non-fine-tuning specs reject it.
- Prevention: fine-tuning must continue through `RecipeDraft -> RunRecipe -> TrainingTaskSpec(profile_kind = llm_fine_tuning)`.

## Platform Adapter Pair Drift
- Symptom: `TrainingPlatformRef` accepted `platform_kind = local_script` with `adapter_kind = aliyun_pai_dlc`.
- Root cause: the first schema checked both enums independently but did not model valid V1 pairs.
- Fix: add explicit V1 pair branches for `local_script/local_script` and `aliyun_pai_dlc/aliyun_pai_dlc`.
- Prevention: every new adapter kind must add an allowed pair branch and a mismatch negative test.

## Blocked Materialization Output Fabrication
- Symptom: `blocked` materialization results were forced to include task spec and adapter metadata refs that may not exist.
- Root cause: result schema used one required list for all statuses.
- Fix: make output refs/hashes conditional on `materialized` / `partial`; require non-empty blockers for `blocked` / `failed`.
- Prevention: status-bearing contracts must distinguish successful output records from failure/blocker records.

## Hook Ref Without Hash
- Symptom: stage event, cancellation, and partial result hooks referenced `TrainingTaskSpec` without the immutable spec hash.
- Root cause: hooks were modeled as lightweight refs but under-specified for sidecar/result traceability.
- Fix: require `training_task_spec_hash` on all three hook contracts.
- Prevention: downstream refs that may enter sidecar/evidence flow need an id plus hash pair.

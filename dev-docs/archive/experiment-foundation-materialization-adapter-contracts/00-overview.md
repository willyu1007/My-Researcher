# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: hand off to `T-074 experiment-foundation-result-evidence-sidecar-contracts`.

## Goal
- Define materialization contracts so a valid `RunRecipe` becomes a normalized `TrainingTaskSpec` plus adapter metadata refs without leaking platform-private fields into reusable domain contracts.

## Non-goals
- Do not implement LocalScript, Aliyun, Slurm, Kubernetes, or custom HTTP adapters.
- Do not store credentials, endpoints, queue names, regions, or platform SDK payloads in `RunRecipe`.
- Do not bypass readiness or version locks during materialization.

## Responsibilities
- Define `MaterializeTrainingTaskSpecRequest`.
- Define `TrainingTaskSpec` normalized fields.
- Define full `FineTuningTaskProfile` fields from a locked `RunRecipe` with `execution_profile.profile_kind = llm_fine_tuning`.
- Define `TrainingTaskMaterializationResult` / adapter metadata refs.
- Define idempotency key, materialization hash, stage event, cancellation, and partial result contract hooks.
- Preserve fine-tuning as a `TrainingTaskSpec` profile.

## Boundary
- Owns contract boundary between recipe and platform execution.
- Consumes T-072 `RunRecipe`, `version_lock_hash`, readiness snapshot, and execution profile; does not redefine recipe/version-lock semantics.
- Hands off actual adapter implementations to `experiment-foundation-execution-adapters`.
- Hands off persistence and API routing to `experiment-foundation-persistence-api-readiness`.

## Done Means
- Platform-private fields are impossible in `RunRecipe`.
- Materialized tasks retain trace back to the exact `RunRecipe` and version locks.
- Adapter metadata has a modeled, auditable storage boundary.
- Completed: shared contracts and schema tests now freeze `MaterializeTrainingTaskSpecRequest`, `TrainingTaskSpec`, `FineTuningTaskProfile`, `TrainingTaskMaterializationResult`, adapter metadata refs, stage events, cancellation requests, and partial result refs.

## Acceptance criteria
- [x] `RunRecipe` remains platform-neutral and is only consumed by materialization.
- [x] `TrainingTaskSpec` contains normalized runtime, command, env refs, input refs, output contract, resource request, timeout, retry policy, auth ref names, and profile fields.
- [x] `FineTuningTaskProfile` is required only for `profile_kind = llm_fine_tuning`.
- [x] Adapter-private payloads are represented by metadata refs/hashes and rejected when inlined.
- [x] Shared typecheck/test and project governance sync/lint pass.

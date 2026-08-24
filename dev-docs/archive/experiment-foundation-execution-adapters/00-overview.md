# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: hand off to `T-078 experiment-foundation-desktop-workbench`.

## Goal
- Implement the fixed execution control pipeline from resolved assets through validation, mirror/materialization, submit, monitor, collect, validate result, and evidence candidate generation across LocalScript and Aliyun PAI-DLC paths.

## Non-goals
- Do not build a training platform, GPU scheduler, or container orchestration system.
- Do not treat OSS / PAI Dataset as canonical data.
- Do not include CustomHttpAdapter in V1.

## Responsibilities
- Consume `ExperimentFoundationRecord`, readiness reports, `TrainingTaskSpec`, `TrainingTaskMaterializationResult`, adapter metadata refs, stage events, cancellation requests, and partial result refs.
- Implement LocalScript smoke pipeline.
- Implement Aliyun mirror handling with dataset-version identity, checksum, freshness, and policy validation.
- Submit, monitor, cancel, collect logs/artifacts, and reconcile external job state.
- Enforce idempotency, materialization hash, mirror identity/freshness, partial result policy, and cancellation records.

## Boundary
- Owns adapter implementation and pipeline behavior.
- Consumes materialization contracts and T-076 persistence services.
- Produces `ExternalTrainingJob`, `ExperimentResult`, validation reports, and evidence candidate inputs.
- Must not redefine registry persistence semantics, readiness report semantics, `RunRecipe` lock semantics, or adapter-private payload storage.

## Done Means
- [x] LocalScript pipeline validates the full control path without cloud credentials in test mode, and requires explicit enablement plus root/allowlist controls outside test mode.
- [x] Aliyun PAI-DLC adapter boundary uses mocked client behavior, consumes `DatasetMirror` refs, and validates mirror dataset-version identity, readiness/freshness, checksum, and policy approval without real SDK credentials.
- [x] Collected outputs create result, validation, partial-result, stage-event, and evidence candidate records through T-074/T-076 contracts.

## Acceptance Criteria
- [x] ExternalTrainingJob shared/API contracts and schema tests are added.
- [x] Dedicated external training job persistence, memory/Prisma repositories, service, controller, and routes are wired.
- [x] LocalScript and mocked Aliyun adapter paths are covered by targeted backend tests.
- [x] Governance sync/lint passes and parent task advances to T-078.

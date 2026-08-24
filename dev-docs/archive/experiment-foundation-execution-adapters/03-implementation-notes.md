# 03 Implementation Notes

## 2026-05-18
- Post-review hardening closed the T-077 implementation review gaps:
  - LocalScript now submits asynchronously, keeps a runtime child-process registry, returns `running` immediately, updates state through `sync`, and can cancel a running child process.
  - LocalScript metadata now caps captured stdout/stderr and passes a small sanitized environment to child processes instead of inheriting the full backend process environment.
  - Aliyun mirror gating now checks both dataset version identity and checksum hash against the locked `RunRecipe` dataset version.
  - Cancel requests now use a deterministic idempotency record id per external job and idempotency key; repeated cancel requests return the existing job state without duplicate cancellation records.
  - Result validation now loads locked metric definitions, checks expected protocol metric keys, creates metric observations for all matching metrics, generates `EvaluationFact` refs, and only creates evidence when observations are protocol-backed.
  - In-memory execution repository duplicate/not-found failures now use `AppError` with `VERSION_CONFLICT` / `NOT_FOUND`, matching route error contracts.
- Completed `T-077 experiment-foundation-execution-adapters` as the first executable backend slice on top of T-076 registry/readiness and T-073 materialization.
- Shared contracts now include `ExternalTrainingJob` plus submit/sync/cancel/collect API wrappers, status enum, forbidden adapter-private fields, schema tests, and aggregate barrel reachability coverage.
- Persistence adds repo migration `20260518130000_add_experiment_foundation_external_training_jobs` and Prisma model `ExperimentFoundationExternalTrainingJob`; the table stores execution runtime metadata, refs, hashes, events, partial/result refs, and adapter metadata refs only.
- `ExternalTrainingJob` remains a dedicated execution-table/API object, not a generic registry `record_kind`; registry records may reference jobs by `ExperimentFoundationRef`, but must not create/update job state outside the execution service.
- Backend adds memory/Prisma execution repositories, `ExperimentFoundationExecutionService`, controller, routes under `/experiment-foundation/execution/jobs`, and app wiring using the existing `EXPERIMENT_FOUNDATION_REPOSITORY` strategy.
- LocalScript executes with `child_process.spawn`, `shell=false`, an execution root, command allowlist, and test-mode auto enablement. Non-test runtime still requires explicit opt-in through `EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED`.
- Aliyun PAI-DLC is implemented as a mockable adapter boundary with a fake default client. It validates `dataset_mirror` refs, dataset-version identity, `ready + fresh` state, `aliyun_oss|pai_dataset` provider, checksum alignment with the `RunRecipe` dataset lock, and approval for restricted/private/approval-required policies.
- Submit checks existing T-076 records and readiness before creating a job: `training_task_spec`, `training_task_materialization_result`, materialization status, task/materialization hashes, and idempotency key are gated.
- Sync/cancel/collect append T-073 stage events; cancel records a `TrainingTaskCancellationRequest`; collect records partial result refs.
- Collect maps adapter output into T-074 `ExperimentResult`, `ResultValidationReport`, `MetricObservation`, and eligible `EvidenceCandidate`; `llm_fine_tuning` task specs additionally produce `FineTuningResult`.
- No real Aliyun SDK, credentials, desktop UI, live DB migration application, or canonical asset synthesis was added.
- Mainline next owner is `T-078 experiment-foundation-desktop-workbench`.

## 2026-05-17
- Created to own S7/S8 execution work after adapter boundary contracts are stable.
- Initial design decision: LocalScript is the first proof path; Aliyun uses DatasetMirror and never becomes canonical data storage.

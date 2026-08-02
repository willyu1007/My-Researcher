# Pack A local cutover legacy-maintenance evidence

This maintenance is separate from the Pack A migration and v2 saga. The legacy maintenance was performed only after the migration's zero-legacy-change proof was captured.

## PI HarnessRun classification

The sole raw `submitted` HarnessRun remains an immutable historical submission snapshot; the legacy repository has no terminal-update operation. The HarnessRun is not unresolved execution:

- HarnessRun: `work_order_harness_run_ec7455ae-299b-408a-a1fb-42d6afe14b4f`
- raw HarnessRun status: `submitted`
- owning WorkOrder status: `failed`
- exact external-ref/hash matching trusted terminal monitor count: `1`
- monitor-linked trusted evidence-unit count: `1`
- unresolved HarnessRun lineage count: `0`

The row was deliberately not modified and no new legacy terminal writer was added.

## EF mocked capability job terminalization

The sole raw `running` ExternalTrainingJob was an unbound capability-test residue:

- job: `external_training_job_1759dfe5fb24a23aab5febdf`
- task/materialization provenance: `capability_aliyun_success`
- PI WorkOrder binding count: `0`
- source provenance: `test_case:capability_vertical_slice`
- adapter implementation used by the app: in-memory fake client; no cloud SDK/CreateJob implementation

The capability-test ExternalTrainingJob was cancelled once through the existing EF execution route with the stable key:

`t132-pack-a-local-cutover-cancel-capability-aliyun-success-v1`

Outcome:

- HTTP status: `200`
- final job status: `cancelled`
- `completedAt`: present
- ExternalTrainingJob total: unchanged at `6`
- status census: `succeeded=3`, `failed=1`, `cancelled=2`, `running=0`
- exactly three expected generic audit records were added:
  - `training_task_cancellation_request`: `1`
  - `training_task_stage_event`: `1`
  - `adapter_metadata_ref`: `1`
- ExperimentFoundationRecord total: `231 -> 234`
- PI WorkOrder and HarnessRun rows: unchanged
- readiness reports: unchanged
- result/evidence/provider execution writes: `0`

No real provider request was made. The app's Aliyun adapter is backed by `FakeAliyunPaiDlcClient`; this operation only closed the explicitly classified local test residue.

## New cutover baseline

After the authorized maintenance operation, the same deterministic digest algorithm establishes the cutover baseline that all subsequent fixture import, v2 admission and guard checks must preserve:

| Legacy table | Rows | Cutover-baseline digest |
|---|---:|---|
| `PaperImplementationResearchWorkOrder` | 1 | `760099753f1fd22e41ced1fe5acb0175` |
| `PaperImplementationWorkOrderHarnessRun` | 1 | `2c44e87889dad879f70c759c4798406b` |
| `ExperimentFoundationRecord` | 234 | `5357e8d4f0b75794a830803ab2edb662` |
| `ExperimentFoundationReadinessReport` | 15 | `4837ebe99f9d7ea30f9c4c973cd8b898` |
| `ExperimentFoundationExternalTrainingJob` | 6 | `856137675b8a2941ec176beb879369f5` |

# Architecture

## Boundary
| Area | Rule |
|---|---|
| Authority root | `PaperImplementationProject` and `ResearchWorkOrder` remain the implementation-side authority. |
| Execution authority | experiment-foundation owns training task specs, external jobs, adapter metadata, result artifacts, and validation reports. |
| Orchestration | T-104 adds a PaperImplementation adapter that calls experiment-foundation execution services for admitted WorkOrders. |
| Evidence authority | Trusted scientific evidence enters only through complete validation-passed EvidenceCandidate → sole gateway → RunEvidenceUnit; failed/cancelled/incomplete creates no REU. |
| Execution accounting | Terminal Run/Attempt facts feed the existing ValidationCycle closure record's embedded immutable snapshot/hash; Sidecar is display-only. |
| Trace | Eligible final evidence requires a target-specific `TraceManifest` for `run_evidence_unit:<id>`; execution failures retain exact Run/Attempt lineage without pre-allocating REU. |
| Conclusion authority | T-104 publishes facts only. PI control plane derives whole-Cycle readiness, Result Analysis proposes, and the existing ValidationCycle closure alone writes scientific disposition/selected exit. |
| Claims | T-104 does not create result interpretation, claims, dossier, or writing packets and does not consume their conclusions to rewrite an external job or old Run. |

## Proposed Flow
```text
ValidationCycle
  -> ResearchWorkOrder(admitted)
  -> PaperImplementationLiveExperimentAdapter.submit
  -> ExperimentFoundationExecutionService.submitJob
  -> ResearchWorkOrderHarnessRun / external job link
  -> PaperImplementationLiveExperimentAdapter.syncOrCollect
  -> RunMonitorIntake
  -> complete validation-passed EvidenceCandidate -> RunEvidenceUnit
  -> failed/cancelled/incomplete Run/Attempt facts -> ValidationCycle closure snapshot/hash
  -> PI control plane evaluates whole-Cycle readiness from every exact in-scope fact
  -> eligible REU: Result Analysis exact-hash proposal; no evidence/control-only: skip analysis
  -> existing ValidationCycle closure writes disposition/derived exit + snapshot/hash
  -> T-098 result/claim/dossier from the exact closed Cycle
```

## Implemented Handoff Response Shape
T-104 may return handoff refs for the next workflow step, but these are read-model hints only:

```ts
{
  action: 'submit' | 'sync' | 'collect' | 'cancel';
  outcome: 'submitted' | 'synced' | 'collected' | 'cancel_requested' | 'already_recorded' | 'blocked';
  external_job: ExternalTrainingJob;
  harness_run?: ResearchWorkOrderHarnessRun | null;
  monitor_intake?: RunMonitorIntakeRecord | null;
  run_evidence_unit?: RunEvidenceUnit | null;
  trace_manifest?: TraceManifest | null;
  terminal_evidence_recorded: boolean;
  handoff: {
    next_action_refs: TopicSelectionFunctionalRef[];
    recommended_next_actions: string[];
    notes: string[];
  };
}
```

The D-17 product target removes conclusion-oriented adapter handoffs. After T-104 publishes exact terminal facts, the PI control plane idempotently re-evaluates whole-Cycle readiness through its owned event/projection path. T-104 must not emit `create_result_interpretation_packet`, decide whether a Cycle is ready from one job, invoke Result Analysis directly, submit a Cycle assessment/exit or create T-098 objects. The landed handoff vocabulary has not yet been migrated.

## Existing Surfaces To Reuse
- PaperImplementation:
  - `PaperImplementationWorkOrderExperimentBridgeService`
  - `ResearchWorkOrder`
  - `ResearchWorkOrderHarnessRun`
  - `RunMonitorIntakeRecord`
  - `RunEvidenceUnit`
- Experiment foundation:
  - `ExperimentFoundationExecutionService.submitJob`
  - `syncJob`
  - `cancelJob`
  - `collectJob`
  - `ExternalTrainingJob`

## Implemented API Shape
- `POST /paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/submit`
- `POST /paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/sync`
- `POST /paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/collect`
- `POST /paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/cancel`

## Queryability Decision
- No Prisma migration was required.
- Submit idempotency uses `PaperImplementationWorkOrderHarnessRun.idempotencyKey`, already columnized/indexed.
- External job lookup and final evidence lookup use existing external job ref columns on harness/run evidence tables.
- `materialization_result_ref/hash` were added to the WorkOrder bridge contract and stored in existing `experimentBridge` JSON because they are submit payload refs, not a gate/queue/trace lookup key.

## Hard Invariants
- No trusted live result without an admitted WorkOrder.
- No trusted live result without a submitted or linked external job.
- `sync`, `collect`, and `cancel` must perform read-only external job ownership preflight before invoking side-effectful experiment-foundation operations.
- External job ownership is checked by comparing the WorkOrder harness `external_job_ref/hash` with the experiment-foundation job projection.
- No eligible final scientific evidence without a complete validation-passed EvidenceCandidate, `run_evidence_unit_id` and `run_evidence_trace_manifest_id`; failed/cancelled/incomplete execution must not pre-allocate or create REU.
- The sole Evidence Trust Gateway owns eligible REU allocation/admission. T-104 publishes monitor/Attempt lineage and complete candidate refs; Cycle closure freezes execution accounting separately.
- T-104 terminal observation is one input fact, not a Cycle-ready event. Only the PI control plane may derive readiness after resolving every admission-frozen Run/Attempt/evidence ref/hash and confirming no real-provider Attempt remains active.
- T-104 never assigns `positive | negative | inconclusive | null`, never derives a selected exit and never treats adapter outcome, external job status or REU status as the scientific conclusion.
- Terminal status observed during `sync` remains monitor-only and must recommend collect/cancel finalization instead of another sync loop.
- `collect` retries may return an existing eligible `RunEvidenceUnit`; `cancel`/failed/incomplete retries return existing terminal execution accounting facts and must not create duplicate evidence or repeat external side effects.
- Productized responses distinguish terminal execution accounting from eligible evidence; historical `terminal_evidence_recorded` cannot make failed/cancelled execution trusted REU under D-16.
- No direct PaperImplementation copy of experiment-foundation DTO payloads.
- No result interpretation, claim, dossier, or writing packet mutation in the adapter.
- No direct packet-creation or readiness-command next action. Exact terminal fact publication causes the PI-owned control plane to re-evaluate whole-Cycle readiness idempotently; downstream services require the exact closed Cycle.
- No default test dependency on cloud credentials.

## Verification Lanes
| Lane | Default | Purpose |
|---|---:|---|
| Unit fake adapter | yes | Verify status mapping, idempotency, trace/evidence gates, and failure retention. |
| Route integration with fake execution service | yes | Verify API orchestration closure without external dependencies. |
| Local script dry-run or mocked local runner | optional default | Verify local adapter shape only when side-effect free. |
| Real cloud/external canary | no | Explicit opt-in environment check with skipped/blocked/passed reporting. |
| Expensive experiment run | no | Manual profile only; never required for default closure. |

# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | `ValidationCycle`, `ExperimentPlanLight`, motive/assertion refs |
| Output objects | `ResearchWorkOrder`, harness run, experiment-foundation refs, `RunMonitorAdapter` intake record, eligible `RunEvidenceUnit`, exact Run/Attempt facts for watermark-bound current-effective ValidationCycle head accounting, immutable queryable non-head history, upstream feedback candidates |
| Authority writer | work-order service and run-evidence ingestion service through `StateWriter` when available |
| Gates | work-order admission, reproducibility, run policy, monitor trust, D-16 evidence eligibility, current-head execution-accounting handoff, all-Cycle active real-Attempt blocker |
| Trace | recipe/task/job/result/fact refs and hashes, config/data/code refs |
| Handoff | T-098 receives eligible run evidence plus the declared immutable current-effective closed-Cycle snapshot refs/hashes; raw execution failure is not converted into REU and non-head history is not implicitly promoted into dossier scope |

## Contract Review
- Confirmatory runs require frozen config and locked recipe hash.
- Exploratory/autotune runs can generate new plans but cannot directly support strong claims.
- Failed/cancelled/incomplete Runs are durable Run/Attempt lifecycle facts, not disposable logs or evidence units. They enter the Cycle closure snapshot only when their Run is the branch's sequence-fenced head at the `closure_watermark`.
- Superseded/non-head Runs remain immutable and queryable but are excluded from readiness, closure snapshot and dossier scope by default. A current admitted revision MAY carry an explicit `comparison_input_ref` to an old Run for interpretation lineage; the ref does not restore head or execution-scope membership.
- An admitted branch without a head is retained as `BRANCH_HEAD_NOT_FROZEN`. Any non-terminal real-provider Attempt in the Cycle, including one on a non-head Run, returns `CYCLE_ACTIVE_REAL_ATTEMPT`; this safety scan does not make that Run a snapshot member.
- Cycle version, branch set and per-branch head sequences are CAS-bound at closure. Admission/head drift rejects the stale handoff and requires readiness/snapshot rebuild.
- Run results without `work_order_id` are untrusted and cannot enter claim support.
- `RunEvidenceUnit` exposes eligible scientific result/validation/trace lineage; execution status and negative/inconclusive scientific disposition are separate axes under D-16.

## Implemented Boundary
- Shared contract: `paper-implementation-workorder-contracts.ts` owns `ResearchWorkOrder`, harness run, monitor intake, and `RunEvidenceUnit`.
- Persistence: Prisma tables keep gate/trace/work-order/run fields columnized; rich callback payload remains JSON payload only.
- Backend service: `PaperImplementationWorkOrderExperimentBridgeService` admits work orders only from active `ImplementationProject` and admitted `ValidationCycle`.
- Experiment-foundation bridge: `run_recipe_ref/hash`, `training_task_spec_ref/hash`, `external_job_ref/hash`, result refs, and validation report refs are lineage pointers, not copied authority payloads.
- Monitor trust rule: callbacks without `work_order_id` are persisted as untrusted intake records and do not produce `RunEvidenceUnit`.
- T-098 entry: consume eligible `RunEvidenceUnit` plus explicit watermark-bound current-effective closed-Cycle snapshot refs/hashes; do not read raw platform state, project-wide/history failed-like REU populations or Sidecar as authority.

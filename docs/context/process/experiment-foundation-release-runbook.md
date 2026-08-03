# ExperimentFoundation v2 control-plane operator runbook (T-132 first release)

Scope: the default-off EF/PI v2 control plane shipped by T-132 (Pack A spine, Pack B provider control, Pack C scientific/closure authority, M5 agent/API surface, M7 default-off real provider) plus the T-134 promotion, exploration-attachment and structured-first semantic components. T-132 completed one separately authorized immutable two-cell PAI live window on 2026-08-02; live execution is still not a standing release capability. Those collected outputs remain `diagnostic_only`, and a real-provider-to-scientific-evidence live acceptance has not been claimed.

## Capability posture (release default)

Every product capability key defaults `false` and every enable is a separately authorized window: `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED`, `PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED`, `PAPER_IMPLEMENTATION_SEMANTIC_RETRIEVAL_V2_ENABLED`, `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED`, `EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED`, `EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED`, `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED`, `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED`, `EXPERIMENT_FOUNDATION_V2_ALIYUN_CLOUD_PREFLIGHT_ENABLED`, `EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED`, `EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED`. `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true` is the standing cutover fact. Prefer process-scoped windows (env supplied to one runner invocation only) over `.env` edits; the M6-R4 golden closure is the reference pattern. T-135 supplies the explicit project-scoped semantic rebuild/retrieval API and runtime boundary, but does not authorize enabling it.

## Read-first diagnosis (no capability needed)

All reads are ungated and server-scoped:

1. `GET /paper-implementation/projects/{project}/experiment-lineage/validation-cycles` — cycle inventory with closure state and counts.
2. `GET .../validation-cycles/{cycle}/experiment-lineage` — branch → current admitted revision → effective head Run → cells/attempts/collections, or `BRANCH_HEAD_NOT_FROZEN`.
3. `GET .../workorder-branches/{branch}/revision-history` — full revision chain including superseded entries.
4. `GET /paper-implementation/validation-cycles/{cycle}/closure/v2/readiness` and `.../closure/v2/preparation` — D-18 watermark, blockers, and (when ready) the verbatim-submittable no-evidence closure body.
5. `GET .../available-actions` — the exact legal next actions with capability gating and human-confirmation scopes.

## Recovery procedures

| Symptom | Procedure |
|---|---|
| Attempt stuck nonterminal (simulation or real) | The worker chains are event-driven and idempotent; a restart resumes claim/lease processing. Manual verbs: `POST /experiment-foundation/v2/execution-attempts/{id}/reconcile` (submitted/running) or `/cancel`. Terminal replay converges; a succeeded Attempt is never rewritten. |
| Command lease orphaned after crash | Leases expire (default 30s); the next drain reclaims. No manual intervention. |
| Real-provider accepted-response loss | Never re-submit. The reconcile path performs bounded deterministic tag/display-name discovery; ambiguity fails closed (`REAL_PROVIDER_RECOVERY_DUPLICATE`/`_NOT_FOUND`). |
| Watchdog timeout on a real job | Cancel-on-timeout runs automatically at `created_at + timeout_seconds + watchdogGraceMs`; verify `real_provider_timeout`/`real_provider_cleanup_unverified` terminal codes and provider-side cleanup before any retry admission. |
| Relay events not consumed (e.g. `ValidationCycleClosed@v1` pending) | Events are durable outbox rows; they drain when the app next runs with background work enabled. `INTEGRATION_RELAY_CONSUMER_NOT_CONFIGURED` means a bounded runner claimed a product event — released to retry, never terminalized. |
| Closure rejected | Stable codes: `CYCLE_ALREADY_CLOSED`, `CYCLE_CLOSURE_SCOPE_DRIFT`, `BRANCH_HEAD_NOT_FROZEN`, closure disabled → 409. Re-derive via `.../closure/v2/preparation`; never hand-assemble the CAS hash. |
| Suspected schema drift | `pnpm ci:prisma-drift` locally / the CI prisma-drift job; named-local identity check first: `SELECT version()` must be PostgreSQL 17.x on 127.0.0.1:5432 (`postgres` DB, `my_researcher_dev` schema). |
| Named-local restore | Recovery dumps under `.ai/.tmp/db-recovery/` (latest: `m7-apply-20260724-r1.dump`, SHA `5ce0328b…`); restore with `/opt/homebrew/opt/postgresql@17/bin/pg_restore` after verifying the dump's own SHA and TOC. |

## Release verification entry points

- Full convergence: `node .ai/scripts/experiment-foundation-m6-release-gate.mjs --run-id <id>` (re-runs packb-simulation/packc-final/m5-agent/m7-provider children, pins durable product/live records, runs the LIT-0204 import lane, asserts API-docs freshness and the usage-fit/golden-closure artifacts, emits the productization summary).
- Individual gates: `experiment-foundation-{packb-simulation,packc-final,m5-agent,m7-provider}-gate.mjs`, each with `--run-id`.
- Frozen status vocabulary: `workflow_simulation_passed`, `cloud_preflight_passed`, closure kind `control_flow_validated_no_paper_evidence`. Any `cloud_training`/evidence claim in a summary is a defect.

## Forbidden operations

Never restore legacy scientific writers or the legacy REU write path; never reinterpret simulation rows as real provenance; never mutate a closed Cycle (successor cycles only, D-11); never blind-retry `CreateJob`; never run `prisma migrate dev` against named-local (deploy-only, with a recovery point and explicit approval).

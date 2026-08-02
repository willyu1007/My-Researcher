# T-132 M7-L1 executable lineage closure

Date: 2026-07-28  
Status: `passed`

## Authorized boundary

The owner authorized one new P313 `probe_execution` ValidationCycle, one input snapshot, one exact complete trace, one Cycle-local `ragperf-primary` branch, one executable WorkOrder v2, two cells, one admission and the normal T1-T4 lineage, with a maximum of 44 new rows. The exact frozen ExecutionBundle was:

- revision: `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48`
- content hash: `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`

Cloud access, capability enablement, PAI job creation and ExperimentResult/EvidenceCandidate/RunEvidenceUnit writes were forbidden. Historical Cycle/closure/branch/Run authority was immutable.

After the first T2 attempt terminalized one PI relay marker, the owner separately authorized exactly one in-place `terminal → pending` recovery for `pi_experiment_outbox_v2_t132_m7_l1_p313_v1_1`, with no new row and `relayAttemptCount=1` retained.

## Failure and remediation

The new Cycle/trace prefix committed 3 rows and T1 committed 6 rows. T2 then failed inside its serializable transaction because the EF Prisma readback helper still required RunRecipe and TrainingTaskSpec schema version `v1`. The transaction rolled back completely: all EF T2 tables remained empty. The PI outbox was correctly terminalized with `MATERIALIZATION_KEY_CONFLICT`.

The remediation:

- persists and reads exact PI WorkOrder snapshot `v1 | v2`;
- reads exact EF RunRecipe and TrainingTaskSpec `v1 | v2`;
- requires relational and decoded snapshot discriminators to match;
- retains exact ExecutionBundle tuple and canonical-hash validation;
- adds positive executable-v2 persistence/replay regressions;
- adds full 17-table restart census and an exact one-row recovery gate.

Implementation commits:

- `4b9c5955` — executable v2 persistence, runner and regressions
- `45ea8208` — bounded terminal-outbox recovery and restart census

## Final named-local result

Target:

- database/schema: `postgres / my_researcher_dev`
- endpoint: `127.0.0.1:5432`
- fingerprint: `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`

Created authority:

- ValidationCycle: `validation_cycle_t132_m7_l1_p313_v1`
- trace: `trace_manifest_t132_m7_l1_p313_v1`
- branch: `pi_experiment_branch_v2_t132_m7_l1_p313_v1_1`
- WorkOrder revision: `pi_experiment_revision_v2_t132_m7_l1_p313_v1_1`
- Run: `ef_run_v2_t132_m7_l1_p313_v1_1`
- Run manifest: `sha256:e0c6c92d3c4a8179cf5d91147e4dff5ef2079d6614a95bf1ce0ca214334094a5`

Apply result:

- recovered terminal outbox: `true`
- relay: claimed 3, delivered 3, released 0, terminalized 0, failures 0
- pre-existing authorized rows: 9
- new rows in final invocation: 35
- total authorized rows: 44
- protected tables checked: 233
- protected changed tables: 0
- historical authority changed: `false`

Exact replay:

- admission replayed: `true`
- relay claimed/delivered: 0/0
- new rows: 0

Forbidden-effect census:

- cloud/provider calls: 0
- capability changes: 0
- `CreateJob`: 0
- billable jobs: 0
- ExperimentResult: 0
- EvidenceCandidate: 0
- RunEvidenceUnit: 0

## Verification commands

From `apps/backend`:

```sh
pnpm exec tsc -p tsconfig.json --noEmit
pnpm exec tsc -p tsconfig.experiment-foundation-scripts.json --noEmit
node --loader ts-node/esm --test src/repositories/prisma/prisma-experiment-v2-repositories.unit.test.ts
```

The typechecks passed and the targeted Prisma repository suite passed 33/33.

## Next action

The executable lineage blocker is closed. The next three actions are:

1. Obtain a fresh short-lived controller STS outside the repository and validate only its presence/expiry through the existing live-window preflight; never commit or print the credential values.
2. Repeat the read-only `GetImage` exact-field comparison if the submission window is no longer immediate, keeping provider writes and `CreateJob` at zero.
3. Use the already recorded `2026-07-28 / ¥50 / two jobs` authorization for the diagnostic-only M7-L1 submit → reconcile → collect → cleanup flow, keeping scientific/evidence capabilities disabled and verifying zero duplicate jobs.

# M7 migration named-local apply record

Date: 2026-07-24

Migration: `20260723100000_add_experiment_foundation_m7_real_provider_v2`

Authorization: user approval in-session ("批准迁移 apply 到 named-local") after the migration passed disposable-PostgreSQL gates `t132-m7-offline-20260723-v1` and `t132-m7-offline-20260724-v2`.

## Target identity

- Server: Homebrew PostgreSQL 17.7 on 127.0.0.1:5432 (verified via `SELECT version()` before any operation).
- Database/schema: `postgres` / `my_researcher_dev` (per `.env.local` `DATABASE_URL`).

## Recovery point (taken before apply)

| Item | Value |
|---|---|
| dump | `.ai/.tmp/db-recovery/m7-apply-20260724-r1.dump` (`pg_dump -Fc -n my_researcher_dev`, under `caffeinate -i`) |
| size | 8,407,462,034 bytes |
| TOC entries | 2,197 (`pg_restore -l` verified readable) |
| SHA-256 | `5ce0328b6630ecf9256d07dceafd512d8b0f841ce61ddb5d76c8764374c6c218` |

## Apply

`pnpm exec prisma migrate deploy` → applied `20260723100000`; `migrate status` reports 69/69, schema up to date.

## Pre/post verification census

| Table | Pre | Post |
|---|---|---|
| ExperimentFoundationProviderPayloadV2 | 2 | 2 |
| ExperimentFoundationExecutionAttemptV2 | 2 | 2 |
| ExperimentFoundationExecutionAttemptEventV2 | 12 | 12 |
| ExperimentFoundationProviderCommandV2 | 8 | 8 |
| ExperimentFoundationCollectionAttemptV2 | 2 | 2 |
| ExperimentFoundationProvisionalOutputV2 | 2 | 2 |
| ExperimentFoundationRunRecipeV2 | 1 | 1 |
| ExperimentFoundationTrainingTaskSpecV2 | 2 | 2 |

Structural assertions after apply:

- `simulationProfileVersion` column absent; `providerProfileVersion` present and carries the pre-rename value (`v1`) for both rows.
- Six `ExperimentFoundationExecutionBundle*` tables created with 0 rows.
- All four exact tuple CHECKs installed (`ef_provider_payload_exact_tuple_check`, `ef_execution_attempt_exact_tuple_check`, `ef_run_recipe_execution_bundle_tuple_check`, `ef_task_spec_execution_bundle_tuple_check`); the `ADD CONSTRAINT` validations passed against all existing rows during deploy.
- Existing Attempts remain exclusively `simulation/non_production_fake_provider`; no real-provider row exists.

Product capabilities remain default-off; this apply changes schema only and authorizes no execution.

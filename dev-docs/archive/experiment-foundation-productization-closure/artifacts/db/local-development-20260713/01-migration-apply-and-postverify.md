# Pack A local-development migration execution and post-verification

## Execution

Command:

```bash
pnpm db:dev:migrate
```

Outcome:

- Prisma discovered 58 migrations.
- It applied only `20260713180000_add_experiment_foundation_d19_v2_spine`.
- The migration completed successfully.
- A subsequent `prisma migrate status` reported: `Database schema is up to date!`
- `_prisma_migrations.checksum` is `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`, matching the reviewed SQL artifact.

## Schema post-verification

- approved v2 table count: `34`
- PI v2/EF v2 cross-domain foreign-key count: `0`
- versioned migration status: `applied`, not rolled back
- no `prisma migrate dev` or `prisma db push` was used

## Legacy before/after proof

The exact same pre-apply digest query was rerun immediately after migration, before any separate cutover cleanup:

| Legacy table | Before rows/digest | After rows/digest | Result |
|---|---|---|---|
| `PaperImplementationResearchWorkOrder` | `1 / 760099753f1fd22e41ced1fe5acb0175` | `1 / 760099753f1fd22e41ced1fe5acb0175` | unchanged |
| `PaperImplementationWorkOrderHarnessRun` | `1 / 2c44e87889dad879f70c759c4798406b` | `1 / 2c44e87889dad879f70c759c4798406b` | unchanged |
| `ExperimentFoundationRecord` | `231 / ae6150606a1194dd921d9f18796ede0b` | `231 / ae6150606a1194dd921d9f18796ede0b` | unchanged |
| `ExperimentFoundationReadinessReport` | `15 / 4837ebe99f9d7ea30f9c4c973cd8b898` | `15 / 4837ebe99f9d7ea30f9c4c973cd8b898` | unchanged |
| `ExperimentFoundationExternalTrainingJob` | `6 / cf7969e85da4c016f11bcf97fa431239` | `6 / cf7969e85da4c016f11bcf97fa431239` | unchanged |

This proves the additive Pack A migration itself did not mutate legacy authority rows. Any later, explicitly authorized legacy terminalization is recorded as a separate maintenance operation and must not be attributed to the v2 migration or v2 admission chain.

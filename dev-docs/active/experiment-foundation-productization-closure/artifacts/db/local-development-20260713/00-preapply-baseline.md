# Pack A local-development pre-apply baseline

- Run ID: `packa-local-landing-20260713-r1`
- Authorization: user-authorized local Pack A landing, including the previously separate existing-environment apply and local cutover operations
- Git HEAD at start: `f6680225d5134d4f67bd59f4c5dbecb4eb0c476d`
- DB SSOT: `repo-prisma`
- Sanitized target: PostgreSQL `127.0.0.1:5432/postgres`, schema `my_researcher_dev`
- Server/tooling: PostgreSQL server `17.7`; backup uses the explicit PostgreSQL 17 client, not the incompatible PATH PostgreSQL 14 client
- Product boundary: local development only; no dev/staging/prod/cloud/provider/scientific execution
- Admission before apply: absent/default `false`
- V2 tables before apply: `0`
- Migration history before apply: 57/58 applied; the only pending migration is `20260713180000_add_experiment_foundation_d19_v2_spine`
- Migration SHA-256: `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`
- Prisma schema SHA-256: `5c591a5f4a816bdae404b0ee316624511663b2ade5e6d1ec236db09cbed5f2f1`

## Fresh legacy digest lock

The earlier readiness snapshot did not record a reproducible ordering algorithm for multi-row tables. This landing therefore creates a new before/after lock with one explicit algorithm used on both sides:

```sql
md5(COALESCE(string_agg(to_jsonb(t)::text, '' ORDER BY id), ''))
```

| Legacy table | Rows | Pre-apply digest |
|---|---:|---|
| `PaperImplementationResearchWorkOrder` | 1 | `760099753f1fd22e41ced1fe5acb0175` |
| `PaperImplementationWorkOrderHarnessRun` | 1 | `2c44e87889dad879f70c759c4798406b` |
| `ExperimentFoundationRecord` | 231 | `ae6150606a1194dd921d9f18796ede0b` |
| `ExperimentFoundationReadinessReport` | 15 | `4837ebe99f9d7ea30f9c4c973cd8b898` |
| `ExperimentFoundationExternalTrainingJob` | 6 | `cf7969e85da4c016f11bcf97fa431239` |

## Apply safety decision

The live-database-to-datamodel diff includes unrelated historical drift (including old TopicSelection index renames/default differences). The landing must therefore use only the reviewed versioned SQL through `prisma migrate deploy`; `prisma migrate dev` and `prisma db push` are prohibited for this operation.

The reviewed Pack A migration is additive: one enum plus 34 v2 tables, with no DML, destructive statement, legacy-table semantic alteration, excluded-family table, or cross-domain foreign key.

## Recovery point

A PostgreSQL 17 custom-format backup of the complete `my_researcher_dev` schema data is created before apply under:

`/Volumes/DataDisk/Project/.backups/My-Researcher/packa-local-landing-20260713-r1/`

The final dump size, SHA-256 and `pg_restore --list` verification are recorded after backup completion and before migration execution.

Completed recovery-point evidence:

- dump: `pre-packa-my_researcher_dev.dump`
- custom-format size: `7.8G`
- SHA-256: `021be380ee58580d33905135838500faa86b2200b81ba09407447d1c2771c4e0`
- TOC/list entries: `1786` (`1771` entries reference `my_researcher_dev`)
- `pg_restore --list` exit status: `0`
- permissions: dump and list are owner-only (`0600`); backup directory is owner-only (`0700`)

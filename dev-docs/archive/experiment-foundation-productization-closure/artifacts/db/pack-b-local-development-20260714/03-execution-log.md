# Pack B local-development execution log

## Scope and target

- Date: `2026-07-14`
- Target: named loopback local-development PostgreSQL only, `127.0.0.1:5432/postgres?schema=my_researcher_dev`
- Reviewed target fingerprint: `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`
- Excluded: dev/staging/prod/cloud, real provider traffic, scientific execution, product traffic switching and legacy-writer reopening.

## Recovery point

- A fresh PostgreSQL 17 custom-format dump was created before apply at `/Volumes/DataDisk/Project/.backups/My-Researcher/packb-local-landing-20260714-r1/pre-packb-my_researcher_dev.dump`.
- Dump size: `7.8G`.
- SHA-256: `0b167c08ad461e98fd25f5592bbc31dfb01b67e2f1fa49bb02d753fa95588987`.
- `/opt/homebrew/opt/postgresql@17/bin/pg_restore --list` passed; the archive reports 2,062 TOC entries and the saved list has 2,072 lines. The PATH-default PostgreSQL 14 client is incompatible with the archive's v1.16 header and is not used as evidence.
- Backup directory permissions are `0700`; dump and list permissions are `0600`.

## Migration apply

The only database write command was:

```bash
pnpm db:dev:migrate
```

That script executed `prisma migrate deploy` against the compiled local environment and applied only:

```text
20260713210000_add_experiment_foundation_pack_b_provider_control_v2
```

- Migration source and database checksum: `c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e`.
- Post-apply status: 59 source migrations found, 59 applied, schema up to date.
- No `prisma migrate dev`, `prisma db push`, ad-hoc DDL, data backfill or manual `_prisma_migrations` edit was used.

## Capability transition and application probes

1. With Pack B simulation disabled, real app composition returned:
   - new simulation POST: `409 VERSION_CONFLICT`, reason `EF_V2_WORKFLOW_SIMULATION_DISABLED`;
   - legacy EF mutation: `409 GATE_CONSTRAINT_FAILED`, reason `LEGACY_RECORD_NOT_ELIGIBLE`;
   - missing-Run status read: `404 NOT_FOUND`, reason `EXECUTION_HEAD_ACK_REQUIRED`.
2. The gitignored local override source was set to `EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED=true` and compiled with `env-localctl`; `.env.local` remained owner-only `0600`. The repository contract default remains `false`.
3. With Pack B simulation enabled, real app composition returned:
   - missing-Run simulation POST: `404 NOT_FOUND`, reason `EXECUTION_HEAD_ACK_REQUIRED`;
   - legacy EF mutation: `409 GATE_CONSTRAINT_FAILED`, reason `LEGACY_RECORD_NOT_ELIGIBLE`;
   - missing-Run status read: `404 NOT_FOUND`, reason `EXECUTION_HEAD_ACK_REQUIRED`.
4. The probe replaced global `fetch` with a throwing function. No fetch, provider request, `CreateJob`, scientific writer or legacy writer was reached.

The named local database contains no PI v2 admitted WorkOrder revision, Run/head or final acknowledgement. The enabled probe therefore intentionally stops at the exact Pack A prerequisite. No test fixture was promoted into product authority and no E1-E5 Pack B saga was created.

Sanitized machine result: `05-app-composition-smoke.json`.

## Quality-remediation continuation — 2026-07-14

The historical landing above remains unchanged. A fresh PostgreSQL 17 backup was created and verified, then `pnpm db:dev:migrate` applied only cleanup migration `20260714160000_harden_experiment_foundation_pack_b_v2`. The target reached 60/60 migrations. Final read-only/app-smoke run `packb-quality-remediation-local-20260714-r5` passed with all six Pack B tables empty and no application-table mutation. Exact backup, migration and post-verify evidence is in `07-quality-remediation-addendum.md`; durable machine evidence is the updated `05-app-composition-smoke.json` and `06-final-gate-summary.json`.

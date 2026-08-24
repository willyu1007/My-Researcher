# Migration plan

## Approved scope

The user approved Gate 2 with exact target `dev` named-local PostgreSQL, existing versioned
migration strategy, a verified pre-apply recovery point and no destructive changes.

## Apply

1. Execute `prisma migrate deploy` with Node 20 and `.env.local`.
2. Do not run `db push`, create a new migration or mutate revision-17 runtime rows.
3. Refresh `docs/context/db/schema.json` from the Prisma SSOT.

## Post-verification

- `prisma migrate status` reports the schema up to date.
- `_prisma_migrations` contains the exact migration as finished and not rolled back.
- Live constraint inspection admits the closed scientific tuple and removes the legacy
  `ef_provisional_output_class_check`.
- Exact revision-17 Attempt/command/scientific counts remain unchanged by migration deploy.
- Focused relational/application tests and database suite pass after the code correction.

## Rollback

Stop on any deploy/post-check failure. Preserve the database and inspect before recovery.
The pre-apply full-schema and five-table data dumps under the recovery directory provide the
reviewed restore point. Because this migration is additive and performs no DML, prefer a forward
correction after successful deployment; use restore only if verification proves an unsafe partial
state.

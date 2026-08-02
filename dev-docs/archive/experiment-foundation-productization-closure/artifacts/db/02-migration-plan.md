# Pack A migration plan

> Historical Pack A implementation checkpoint. Its existing-environment status
> is superseded by the separately authorized named-local landing records under
> `artifacts/db/local-development-20260713/` and
> `artifacts/db/pack-b-local-development-20260714/`.

Execution status: the full migration history and Pack A draft were applied/read back successfully on an isolated disposable PostgreSQL target and then deleted. Existing-environment apply remains unperformed and unauthorized by Pack A.

## Strategy

1. Keep `prisma/schema.prisma` as the only schema SSOT.
2. Review the single additive SQL migration draft.
3. Generate the Prisma client and LLM DB context without connecting to a database.
4. Apply the full migration history only to a newly created disposable pgvector PostgreSQL 16 target in the D-19 gate.
5. Run A01-A04 and B01-B10, legacy-sentinel digest checks and schema/write censuses.
6. Drop the disposable target even on failure.

## Rollback

- Before any existing-environment apply, edit or replace the migration draft through code review.
- Disposable verification rollback is complete database/container deletion.
- No down migration, backfill, legacy annotation or destructive statement is part of Pack A.
- Product capability remains default-off regardless of migration verification outcome.

## Separate approvals

Applying this migration to an existing local/dev/staging/prod database and enabling product admission/cutover remain separate decisions outside the implementation authorization.

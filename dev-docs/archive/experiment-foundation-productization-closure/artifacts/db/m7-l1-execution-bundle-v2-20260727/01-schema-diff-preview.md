# Schema diff preview

Pending migration:
`prisma/migrations/20260727170000_enable_execution_bundle_schema_v2/migration.sql`.

The migration changes only two existing CHECK constraints:

- `ef_execution_bundle_draft_schema_check`
- `ef_execution_bundle_revision_schema_check`

Before: relational discriminator must equal `v1`.

After:

- discriminator must be exactly `v1` or `v2`;
- discriminator must equal the corresponding JSON snapshot's
  `execution_bundle_schema_version`.

There are no table/column/index/FK changes, no DML/backfill, no delete, and no
cloud/provider operation. Existing exact v1 rows remain valid. Prisma models do
not change because Prisma schema syntax does not represent these raw CHECK
constraints.

Disposable PostgreSQL applied the full migration history plus this migration and
passed the v2 relational roundtrip and mismatch-negative assertion.

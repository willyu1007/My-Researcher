# Execution log

Status: **passed on reviewed named-local development PostgreSQL**.

The prior authorization covered six bundle rows but did not cover the newly
discovered schema migration. The mandatory approval checkpoint stopped that
attempt before `prisma migrate deploy` or the bundle importer.

After exact supplemental authorization:

1. `prisma migrate status` reported exactly one pending migration:
   `20260727170000_enable_execution_bundle_schema_v2`.
2. `prisma migrate deploy` applied exactly that migration.
3. `prisma migrate status` reported the database up to date.
4. Constraint readback proved both CHECKs admit only v1/v2 and bind the
   discriminator to the JSON snapshot version.
5. Bundle importer r1 created exactly six rows.
6. Bundle importer r2 created zero rows and exact-reused all six.

No connection string, credential or authorization value is stored in this
artifact.

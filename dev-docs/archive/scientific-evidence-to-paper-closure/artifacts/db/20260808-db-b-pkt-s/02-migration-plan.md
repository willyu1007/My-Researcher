# T-136 DB-B / PKT-S migration plan

## Apply order

1. Validate and format `prisma/schema.prisma` and generate the client.
2. Review `20260808090000_add_scientific_source_and_packet_closure_binding/migration.sql` for destructive DML, table replacement and constraint/index names.
3. Deploy all migrations to a fresh disposable loopback PostgreSQL database.
4. Verify migration status, column nullability, named checks/FKs/indexes and legacy/v2 negative fixtures.
5. Run repository/type checks and refresh `docs/context/db/schema.json` from the SSOT.
6. Drop and verify cleanup of every disposable database.

## Named-local gate

Applying the migration to the named local product database is not part of this execution. Before that operation, record the exact target fingerprint and recovery point, review the migration/source digests and obtain separate explicit approval. Use `prisma migrate deploy`, never `prisma migrate dev`.

## Backout

- Before authoritative v2 writes on a disposable or confirmed pre-write target, the disposable database can be dropped and recreated.
- After any authoritative v2 Result or Packet exists, disable the new writers, retain the additive columns/constraints and ship a forward corrective migration. Do not destructively remove evidence lineage.
- The migration has no historical DML to reverse and does not trust-upgrade legacy rows.

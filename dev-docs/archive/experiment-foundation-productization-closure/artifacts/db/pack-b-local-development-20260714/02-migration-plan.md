# Pack B local-development migration and rollback plan

## Ordered execution

1. Create a fresh PostgreSQL 17 custom-format backup of the complete `my_researcher_dev` schema outside the repository.
2. Hash the dump, verify the archive with `pg_restore --list`, and enforce owner-only permissions.
3. Reconfirm the migration SHA-256 and target fingerprint.
4. Run `pnpm db:dev:migrate`, which executes `prisma migrate deploy` against the compiled local env.
5. Require migration status to report 59/59 applied and the Pack B migration checksum to match the reviewed source.
6. Require exactly six Pack B tables, zero PI-domain FK and zero legacy mutation.
7. Re-run the legacy/Pack A authority baseline and compare exact counts/digests.
8. Only after DB verification, add the gitignored local Pack B capability override, compile via `env-localctl`, and run no-network product smoke.

## Rollback

- Before apply, abort without changing the database if backup verification, target fingerprint, migration digest or pre-apply gate fails.
- After a successful additive apply, the preferred operational rollback is to keep the six empty immutable tables, set `EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED=false`, and stop new Pack B intake while committed commands drain.
- A physical schema rollback requires a separately reviewed migration or restore into a replacement schema from the verified pre-apply dump; do not manually delete `_prisma_migrations` or run ad-hoc `DROP` statements.
- Never re-open a legacy writer or route simulation through `ExperimentFoundationExternalTrainingJob`.

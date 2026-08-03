# Named-local migration execution log

## Recovery point — passed

- Created PostgreSQL 17 custom-format dump: `.ai/.tmp/db-recovery/t135-before-t134-migrations-20260803.dump`.
- Size: 363 MiB.
- SHA-256: `fb07dd8ea1883907ec0c7e9cb5c8eb1c8383de3448184dd4c8b0f99c2ba804f5`.
- PostgreSQL 17 `pg_restore --list` parsed 2,235 lines and reported 2,225 TOC entries.
- Dump metadata confirms PostgreSQL 17.7 source/client and includes the `my_researcher_dev` schema plus pgvector extension.

No migration had been applied when this recovery point was recorded.

## Migration deploy — passed

- Command strategy: Prisma `migrate deploy` using `.env.local` and `prisma/schema.prisma`.
- Applied exactly:
  - `20260802150000_add_experiment_foundation_promotion_v2`
  - `20260802203000_add_exploration_spec_v2`
  - `20260802220000_add_pi_exploration_attachment_v2`
  - `20260803070000_add_pi_semantic_projection_v2`
- Prisma reported all migrations successfully applied.
- No capability or application configuration was changed.

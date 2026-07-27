# Connection check

- Target class: named-local development PostgreSQL.
- SSOT mode: `repo-prisma` from `docs/project/db-ssot.json`.
- Target selection: existing reviewed `.env.local` URL and named-local fingerprint
  gate; no connection value is recorded here.
- Read-only check: `BEGIN READ ONLY` with the configured schema.
- Observed 2026-07-27: all six `ExecutionBundleV2` tables total 0 rows;
  migration `20260727170000_enable_execution_bundle_schema_v2` is not applied;
  both bundle schema CHECKs still equal `schemaVersion = 'v1'`.
- Write status: no named-local write was attempted.

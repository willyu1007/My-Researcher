# Connection check

- Target class: named-local development PostgreSQL.
- SSOT mode: `repo-prisma` from `docs/project/db-ssot.json`.
- Target selection: existing reviewed `.env.local` URL and named-local fingerprint
  gate; no connection value is recorded here.
- Read-only check: `BEGIN READ ONLY` with the configured schema.
- Pre-apply observation 2026-07-27: all six `ExecutionBundleV2` tables
  totaled 0 rows; migration
  `20260727170000_enable_execution_bundle_schema_v2` was not applied; both
  bundle schema CHECKs still equaled `schemaVersion = 'v1'`.
- Reviewed target fingerprint:
  `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`.
- Post-apply observation: migration applied; all six tables contain exactly one
  reviewed SciFact bundle row each.

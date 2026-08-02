# Connection check

- Target class: named-local development PostgreSQL.
- SSOT mode: `repo-prisma`.
- Target selection: existing reviewed `.env.local` URL plus the named-local
  fingerprint gate; no connection value is recorded.
- Reviewed target fingerprint:
  `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`.
- Pre-apply `offline-preflight`: passed for Run
  `ef_run_v2_t132_m7_l1_resource_successor_v2_1`; exact Run Attempt count 0,
  cloud calls 0 and database writes 0.
- Prisma status found 71 migrations and exactly one pending migration:
  `20260728140500_enable_real_provider_payload_manifest_v2`.
- Pre-apply evidence was collected inside a server-enforced read-only,
  repeatable-read transaction.

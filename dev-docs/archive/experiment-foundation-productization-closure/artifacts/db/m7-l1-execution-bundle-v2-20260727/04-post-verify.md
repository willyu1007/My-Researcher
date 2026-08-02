# Post-verify

Completed verification:

- `prisma validate` with the configured local environment: passed.
- `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`: passed; context checksums
  current.
- `node .ai/tests/run.mjs --suite database`: passed.
- Disposable M7 gate `t132-m7-bundle-freeze-20260727-v6`: M7-01..M7-15 passed;
  forced PostgreSQL 9/9 with zero skips.
- Pre-apply named-local read-only census: bundle rows 0; migration unapplied;
  both constraints v1-only.
- Post-apply `prisma migrate status`: up to date.
- Constraint-definition readback: exact v1/v2 discriminator and JSON binding
  on draft and revision.
- First importer: 6 created, 0 reused; 244 protected tables unchanged.
- Exact replay: 0 created, 6 reused; 244 protected tables unchanged.
- Independent read-only post-check: all six target table counts are 1, revision
  schema/hash match the reviewed plan and readiness is `passed`.
- r1 evidence SHA-256:
  `c39d59beb540fd72c76eac544518e41656e6cfabc316f9227ea275ffc53b0f50`.
- r2 evidence SHA-256:
  `4bc96801bb88896b4d25dd0aa4215bae8d8476573fb8504b74b5902a37d0358c`.
- External fetch, cloud operations, provider writes, `CreateJob` and scientific
  writes: 0.

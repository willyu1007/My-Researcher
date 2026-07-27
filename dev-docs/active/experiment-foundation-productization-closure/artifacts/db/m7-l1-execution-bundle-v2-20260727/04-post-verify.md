# Post-verify

Current pre-apply verification:

- `prisma validate` with the configured local environment: passed.
- `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`: passed; context checksums
  current.
- `node .ai/tests/run.mjs --suite database`: passed.
- Disposable M7 gate `t132-m7-bundle-freeze-20260727-v6`: M7-01..M7-15 passed;
  forced PostgreSQL 9/9 with zero skips.
- Named-local read-only census: bundle rows 0; migration unapplied; both
  constraints remain v1-only.

Required after explicit apply authorization:

- `prisma migrate status`
- constraint-definition readback
- first six-row importer result
- zero-new exact replay
- protected-table negative-space comparison

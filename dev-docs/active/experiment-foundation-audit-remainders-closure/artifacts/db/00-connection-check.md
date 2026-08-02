# EF-P06 DB connection check

- SSOT mode: `repo-prisma` from `docs/project/db-ssot.json`.
- Direction: code to database via a versioned additive migration.
- Named target: none. Phase 2 does not authorize applying to named-local, staging or production.
- Verification target: nonce-bound loopback disposable PostgreSQL only, with an exact database-name and COMMENT marker fence.
- Secrets: none recorded.

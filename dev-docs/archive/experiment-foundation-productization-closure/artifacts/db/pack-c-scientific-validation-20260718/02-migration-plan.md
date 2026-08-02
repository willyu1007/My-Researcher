# Pack C migration plan — 2026-07-18

- Strategy: versioned migration via `prisma migrate deploy`; no `db push`.
- Target: named-local `127.0.0.1:5432/postgres?schema=my_researcher_dev` only. Dev/staging/prod/cloud are out of scope and separately fenced.
- Approval state: **NOT approved for apply.** Per the T-132 Pack A/B convention, apply requires: a fresh PostgreSQL 17 custom-format recovery point with verified `pg_restore --list`, an explicit user approval for this named migration, before/after protected-table digests, and post-verify (`prisma migrate status`, zero rows in all three new tables, unchanged Pack A/legacy digests).
- Rollout expectation: additive-only; the three new tables start and remain at 0 rows until the separately gated ScientificValidationService conformance lanes write disposable fixtures (disposable PostgreSQL only) — product traffic cannot reach the writers while `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` stays default-off.
- Rollback expectation: additive tables with zero consumers can be dropped by a reviewed inverse migration in the worst case; standard T-132 rollback preference is forward-fix with immutable readback retained.
- Excluded drift: the pre-existing repository-wide index-name drift (see `01-schema-diff-preview.md`) must be reconciled by its own task before any future `prisma migrate dev` is run for schema authoring; until then Pack C and later packs should generate with `--create-only` and hand-reduce, or the drift task should land a dedicated reconciliation migration first.

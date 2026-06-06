# Target DB Apply Log

## Approval
- Status: approved for local/dev Phase 2 target DB apply.
- Approver: user in Codex thread.
- Approval timestamp: `2026-06-05T13:57:49Z`.
- Target environment: `local`.
- Target DB reference: `local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev`.
- Secret handling: raw `DATABASE_URL`, username, and credentials are not recorded in repo.
- Migration id: `20260605104000_add_literature_pgvector_phase1`.
- Strategy: Prisma versioned migration apply.
- Destructive changes allowed: no.
- Backup/snapshot expectation: local/dev operator approval accepted for this additive migration; staging and production remain out of scope.
- Rollback expectation: user-visible JSONB retrieval remains the active read path; additive pgvector schema is retained for repair unless a separate rollback task is approved.

## Pre-Apply Evidence
- DB SSOT mode: `repo-prisma` from `docs/project/db-ssot.json`.
- Schema validation with target env loaded: passed.
- Migration status before apply: pending migration `20260605104000_add_literature_pgvector_phase1`.
- Migration SQL review: additive schema only.
- JSONB source vector column: retained.
- Public retrieval rollout mode: remains `jsonb_only`.

## Command Log
- `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend exec prisma validate --schema ../../prisma/schema.prisma`
  - Result: passed.
- `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend exec prisma migrate status --schema ../../prisma/schema.prisma`
  - Result: reported pending migration `20260605104000_add_literature_pgvector_phase1`.
- `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend exec prisma migrate deploy --schema ../../prisma/schema.prisma`
  - Result: migration `20260605104000_add_literature_pgvector_phase1` applied successfully.
- `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend exec prisma migrate status --schema ../../prisma/schema.prisma`
  - Result: database schema is up to date.
- Prisma post-apply smoke query against target DB.
  - Result: passed.
- Application setting check for literature retrieval vector rollout.
  - Result: `jsonb_only` from service default.

## Post-Apply Smoke
- Status: passed.
- Migration history includes `20260605104000_add_literature_pgvector_phase1`: yes.
- `pg_extension` contains `vector`: yes.
- `LiteratureEmbeddingChunk.retrievalVector` exists: yes.
- `LiteratureEmbeddingChunk.retrievalVector` type: `vector(3072)`.
- `LiteratureEmbeddingVectorBackfillRun` table exists: yes.
- `LiteratureEmbeddingVectorQuarantineIssue` table exists: yes.
- Existing `LiteratureEmbeddingChunk.vector` exists: yes.
- Existing `LiteratureEmbeddingChunk.vector` type: `jsonb`.
- User-visible retrieval mode remains: `jsonb_only`.

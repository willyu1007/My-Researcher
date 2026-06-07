# 04 Post Verify

## Status
- Completed for local dev DB apply.

## Verification Commands
- `rg -n 'LiteratureDiscoveryBatch|LiteratureDiscoveryCandidate|discoveryMatchedCandidates|discoveryPromotedCandidates' docs/context/db/schema.json prisma/schema.prisma`
- `set -a; . ./.env.local; set +a; pnpm exec prisma validate --schema prisma/schema.prisma`
- `set -a; . ./.env.local; set +a; pnpm exec prisma generate --schema prisma/schema.prisma`
- `set -a; . ./.env.local; set +a; pnpm exec prisma migrate status --schema prisma/schema.prisma`
- `rg -n '^CREATE INDEX "TopicResearchRecord|ALTER TABLE "TopicResearchRecord|DROP INDEX|ALTER TABLE "public"\."TopicResearchRecord' prisma/migrations/20260606113000_add_literature_discovery_candidate_staging/migration.sql || true`
- `git diff --check -- prisma/migrations/20260606113000_add_literature_discovery_candidate_staging dev-docs/active/literature-scaleout-corpus-strategy .ai/project/main`
- `node --env-file=.env.local --input-type=module <<'NODE' ... candidate catalog smoke check ... NODE`
- `node .ai/tests/run.mjs --suite database`
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## Results
- `prisma/schema.prisma` contains both candidate staging models and both `LiteratureRecord` back-reference fields.
- `docs/context/db/schema.json` contains both candidate staging models and relations.
- Database test suite passed:
  - `database-sqlite-smoke`: PASS.
- Prisma validate passed.
- Prisma generate passed.
- Scoped migration range check found no `TopicResearchRecord` SQL.
- Diff whitespace check passed.
- Migration status reports database schema is up to date.
- Candidate catalog smoke check found:
  - 2 candidate tables.
  - 16 candidate indexes.
  - 4 candidate foreign keys.
  - 0 candidate rows.
- Governance sync completed.
- Governance lint passed with an unrelated T-115 warning.

## Pending
- B13 counting contract update before B10 writes candidates.
- Staging/prod migration apply, if needed, requires a new explicit checkpoint.

## Strategy Closure
- Target environment selected for first apply:
  - local dev.
- Migration strategy:
  - versioned Prisma migration.
  - no `prisma db push`.
  - no full generated diff apply.
- Scoped migration file:
  - `prisma/migrations/20260606113000_add_literature_discovery_candidate_staging/migration.sql`
- DB apply status:
  - completed for local dev.
  - no staging or prod database write has been executed.

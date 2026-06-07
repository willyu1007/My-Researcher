# 02 Migration Plan

## Status
- Completed for local dev.

## Target Environment
- First target: local dev.
- Staging/prod are out of scope until local dev apply and verification pass.

## Strategy
- Use versioned Prisma migration.
- Apply with `pnpm exec prisma migrate deploy --schema prisma/schema.prisma` after loading `.env.local`.
- Do not use `prisma db push`.
- Do not apply a generated full live-DB diff directly.

## Migration File
- `prisma/migrations/20260606113000_add_literature_discovery_candidate_staging/migration.sql`

## Intended Scoped Change
- Create `LiteratureDiscoveryBatch`.
- Create `LiteratureDiscoveryCandidate`.
- Add foreign keys:
  - candidate to batch with cascade delete.
  - candidate self-match with set-null delete.
  - candidate to matched `LiteratureRecord` with set-null delete.
  - candidate to promoted `LiteratureRecord` with set-null delete.
- Add ordinary lookup indexes only.

## Explicit Non-Changes
- Do not add hard uniqueness constraints for candidate `dedupKey` or external IDs.
- Do not add a Prisma enum for candidate status.
- Do not add decision-log, queue, or source-specific candidate tables.
- Do not alter existing `LiteratureRecord` unique constraints.
- Do not alter `TopicResearchRecord.confidence`.
- Do not add or rename unrelated `TopicResearchRecord` indexes.
- Do not clean up unrelated live-DB index naming drift in this migration.

## Apply Checkpoint
- User explicitly confirmed local dev DB apply before DB write.
- Destructive changes are not expected and are not allowed in this migration.
- Because these are new pre-pipeline tables, no data backup is required for existing literature tables, but the apply log must still record target env and command output.

## Apply Result
- Applied command:
  - `set -a; . ./.env.local; set +a; pnpm exec prisma migrate deploy --schema prisma/schema.prisma`
- Applied migration:
  - `20260606113000_add_literature_discovery_candidate_staging`
- Result:
  - migration applied successfully to local dev.
  - no staging or prod apply was executed.

## Rollback Expectation
- Candidate staging tables are pre-pipeline and contain no existing production data at creation time.
- A rollback should drop candidate foreign keys, indexes, `LiteratureDiscoveryCandidate`, and `LiteratureDiscoveryBatch`.
- Do not roll back existing `LiteratureRecord` or standard literature pipeline tables.

## Post-Apply Verification Plan
- `set -a; . ./.env.local; set +a; pnpm exec prisma migrate status --schema prisma/schema.prisma`
- `set -a; . ./.env.local; set +a; pnpm exec prisma validate --schema prisma/schema.prisma`
- `set -a; . ./.env.local; set +a; pnpm exec prisma generate --schema prisma/schema.prisma`
- `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
- `node .ai/tests/run.mjs --suite database`
- Candidate-table smoke check against local dev DB:
  - confirm `LiteratureDiscoveryBatch` exists.
  - confirm `LiteratureDiscoveryCandidate` exists.
  - confirm candidate indexes exist.
  - confirm candidate foreign keys exist.

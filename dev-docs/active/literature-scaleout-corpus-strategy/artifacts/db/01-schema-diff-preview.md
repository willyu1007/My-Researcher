# 01 Schema Diff Preview

## Status
- Completed with unrelated local DB drift detected.

## Commands
- `git diff -- prisma/schema.prisma`
- `set -a; . ./.env.local; set +a; pnpm exec prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`
- `set -a; . ./.env.local; set +a; pnpm exec prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script | rg -n "LiteratureDiscovery|discovery|ALTER TABLE \"public\"\\.\"TopicResearchRecord\"|CREATE INDEX|DROP INDEX|TopicResearchRecord"`

## Repo Schema Delta
- Added `LiteratureDiscoveryBatch`.
- Added `LiteratureDiscoveryCandidate`.
- Added `LiteratureRecord.discoveryMatchedCandidates`.
- Added `LiteratureRecord.discoveryPromotedCandidates`.
- No Prisma enum was added.
- No `@@unique` was added for candidate deduplication fields.
- No `CandidateDecisionLog`, source-specific candidate table, or candidate queue table was added.

## Read-Only DB Diff Summary
- Candidate-staging SQL was generated as expected:
  - create `LiteratureDiscoveryBatch`.
  - create `LiteratureDiscoveryCandidate`.
  - create candidate lookup indexes.
  - create candidate foreign keys to batch, self-match, matched literature, and promoted literature.
- The same read-only diff also surfaced unrelated existing drift:
  - an unrelated `TopicResearchRecord.confidence` default alteration.
  - unrelated `TopicResearchRecord` indexes.
  - many unrelated index rename statements from existing DB/schema naming drift.

## Migration Implication
- Do not apply the full read-only DB diff directly.
- Use the scoped candidate-staging migration file:
  - `prisma/migrations/20260606113000_add_literature_discovery_candidate_staging/migration.sql`
- The scoped migration file includes only the candidate staging table/index/FK SQL and excludes unrelated `TopicResearchRecord` drift.
- The scoped migration was later applied to local dev after explicit user approval.

## Post-Apply Diff Summary
- Command:
  - `set -a; . ./.env.local; set +a; pnpm exec prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script | rg -n "LiteratureDiscovery|TopicResearchRecord|This database is already in sync" || true`
- Result:
  - no `LiteratureDiscovery*` diff remains.
  - remaining diff is unrelated `TopicResearchRecord` drift:
    - `TopicResearchRecord.confidence` default.
    - two `TopicResearchRecord` indexes.

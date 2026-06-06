# Phase 3 Generated Artifact Index

## Storage Policy
- Large generated JSON artifacts are stored under `.ai/.tmp/` and are not intended for git tracking.
- This index keeps the stable review evidence: path, checksum, summary, and regeneration commands.
- The durable task package keeps contracts, runbooks, summaries, and verification notes under `dev-docs/`.

## Temporary Artifacts

| Artifact | Temporary Path | Lines | SHA-256 | Summary |
|---|---:|---:|---|---|
| Broad workset manifest | `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-workset-manifest.json` | 3071 | `e7d5f18dcd23b0c752b953e4ca3157b8804c424f087749c358e910d855f2cd93` | 145 literature/version rows, 24,773 chunks, coverage ratio `0.015742945949218906`, 0 blockers, 0 warnings |
| Broad dry-run artifact | `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-backfill-phase3-target-local-20260605-dryrun.json` | 544 | `57a5d1862d4f372e3924df6fbf48ada6c2e8bc77a4cf1cddf70ba059ff0cb2b2` | dry-run completed, 24,773 valid vectors, 0 writes, 0 quarantine rows, 50 projected batches |
| Broad execute artifact | `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-backfill-phase3-target-local-20260606-execute.json` | 895 | `efda75e6ae5e233c6f75e4ba56de0ba321013e9d1523a6d8aed471cd2426ca9f` | execute completed, 24,773 native vectors written, coverage `1`, 0 quarantine rows, 50/50 batches completed, 0 retries |
| Phase 3 verification JSON | `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/phase3-verification-phase3-target-local-20260606-verify.json` | 1081 | `6740ec2465160d529cf6ce928c23f0b0c01703fce457e9fc80a54d9e529f3ae5` | verification `PASS`, live coverage `24,773/24,773`, public mode `jsonb_only`, 0 blockers |
| Phase 3 verification summary | `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/phase3-verification-phase3-target-local-20260606-verify.md` | 20 | `570264358c909cd8f81bb8269ba44ef84b2cca1b2b93e5cb076c2415129d0aed` | human-readable verification gate summary |

## Regeneration Commands
```bash
pnpm literature:pgvector:phase3 -- --mode plan --run-id phase3-target-local-20260605-plan --target-db-ref local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev
pnpm literature:pgvector:phase3 -- --mode backfill --run-id phase3-target-local-20260605-dryrun --target-db-ref local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev --workset .ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-workset-manifest.json
pnpm literature:pgvector:phase3 -- --mode backfill --run-id phase3-target-local-20260606-execute --execute --target-db-approved --target-db-ref local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev --workset .ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-workset-manifest.json
pnpm literature:pgvector:phase3 -- --mode verify --run-id phase3-target-local-20260606-verify --target-db-approved --target-db-ref local-env:127.0.0.1:5432/postgres?schema=my_researcher_dev --workset .ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-workset-manifest.json --backfill .ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-backfill-phase3-target-local-20260606-execute.json
```

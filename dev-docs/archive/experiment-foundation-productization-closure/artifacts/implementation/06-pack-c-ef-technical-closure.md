# Implementation Pack C C-EF technical closure skeleton

## Scope

- Slice: `T-132 Pack C C-EF step 6`
- Gate id scheme: `packc-ef-<YYYYMMDD>-r<N>`
- Acceptance registry: PC01-PC07 plus PC19-EF
- PostgreSQL posture: digest-pinned disposable container only; existing `DATABASE_URL` is not accepted
- Product/provider posture: no capability enable, product traffic, provider request, migration apply to an existing environment or scientific product write

## Check registry

| Check | Required evidence |
|---|---|
| PC01 | engine unit suite: unsupported required rule blocks |
| PC02 | engine unit suite: frozen validator-profile determinism/recheck |
| PC03 | engine + service suites: exact batch subject completeness |
| PC04 | engine + service suites: metric/artifact positive and negative fixtures |
| PC05 | static census + shared schema suite: sole writer guards, intact three-kind closure set, no request `accept_partial` |
| PC06 | forced real-PostgreSQL relational suite: passed-only atomic mint, rollback, report-only non-passed outcomes |
| PC07 | service provenance negatives + relational provenance CHECK |
| PC19-EF | generic create/upsert, `collectJob` and PI live-collect service-layer closure suites |

## Machine evidence contract

The summary always carries the exact check registry, suite totals, both migration ids and source digests, disposable database state, all six evidence keys, explicit zero census, explicit redaction census, blockers and `canonical_summary_sha256`. The SHA-256 is computed over canonical JSON with the hash field set to `null`. PostgreSQL unavailability is exit 2 / `blocked`, never `passed`.

## Sandbox checkpoint

- Run: `packc-ef-20260720-r1`
- Status: `blocked`
- Non-relational suites: 68/68 passed; 0 failed; 0 skipped
- Passed checks: PC01-PC05, PC19-EF
- Blocked checks: PC06, PC07
- Blocker: `DISPOSABLE_POSTGRES_UNAVAILABLE`
- Canonical summary SHA-256: `sha256:efa5c836e7942c8eb0df1f352619feebe1c1d1fcadb9a1840f9a6ae4636a7750`

## Host disposable-PostgreSQL gate result — 2026-07-20

Host run lineage: `packc-ef-20260720-r2` correctly `failed` on two relational TEST-harness defects surfaced by the first real-PostgreSQL execution (a P2002 matcher expecting mapped index names where Prisma reports field lists, and multi-command `$executeRawUnsafe` trigger install/remove rejected by PostgreSQL prepared statements); product fences themselves fired correctly in both cases. `r3` verified the trigger/matcher fixes (71/72) and exposed one further matcher-ordering case (the drifted-hash candidate tripping the report unique before the composite FK); the FK fence is now exercised against a fresh candidate-less report on the foreign run. `r4` is the final clean run.

- Final gate id: `packc-ef-20260720-r4`
- Overall status: `passed` (exit 0)
- PC01-PC07 + PC19-EF statuses: all `passed`
- Relational totals: 4 passed, 0 failed, 0 skipped (suite totals across all gate lanes: 72/72, 0 skipped, 0 blocked)
- Disposable marker verified before execution: `identity_marker_verified=true`, database `packc_c889b31bf228`, digest-pinned `pgvector/pgvector@sha256:a132765e…`, `existing_database_url_used=false`
- Both migration ids applied: `20260718224543_add_experiment_foundation_pack_c_scientific_validation_v2` (`sha256:0f30a413…`) and `20260719120000_reconcile_index_names_and_topic_research_record` (`sha256:3de50af7…`), `applied_to_disposable_postgres=true`
- Container cleanup: `cleaned_up=true`
- Zero census: generic/route/adapter/product scientific writes 0, `accept_partial` request-contract occurrences 0, existing-database connections 0, real-provider/external network requests 0
- Canonical summary SHA-256: `sha256:6a7f85b5a86281c77fceea66a7c4c011139d40c2d740a31216e34c329231a565`
- Durable evidence: `06-pack-c-ef-gate-summary-r4.json` (file SHA-256 `53f6328ec6653900bd47c9020943e7b5170f7682a8689512bb4070401a3561e1`); `.ai/.tmp` run output remains ephemeral

This closes the C-EF slice (PC01-PC07, PC19-EF). It does not claim C-PI (PC08-PC17, PC19-PI, PC20), C-cutover (PC18), real-provider execution, scientific evidence production, or any non-local rollout.

Do not convert the sandbox `blocked` checkpoint into a pass and do not claim PC06/PC07 until the host summary proves the real PostgreSQL suite executed without skips.

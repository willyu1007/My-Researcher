# Implementation Pack A technical closure evidence

## Outcome

This section preserves the technical-only result from `packa-d19-final-20260713-r2`. Its source-policy blocker was later resolved by `packa-d19-source-policy-20260713-r2`; see the addendum at the end and `01-pack-a-source-policy-closure.md`.

- Implementation slice: `Phase 1 + D-19 minimal v2 spine`
- Technical implementation state: complete
- D-19 run id: `packa-d19-final-20260713-r2`
- Technical acceptance: A01-A04 and B01-B10 all `passed`
- Overall source-backed gate state: `blocked`
- Sole blocker: `SOURCE_POLICY_UNRESOLVED`
- Product admission default: `false`
- Existing local/dev/staging/prod database apply: not performed
- Product enable/cutover: not performed
- Provider/cloud/scientific execution: not performed

The blocker records that original-source license/access attestations for the Wikipedia corpus and Natural Questions fixture datasets were not supplied. The fixtures therefore retain explicit `TEST-ONLY-UNRESOLVED` policy values; no scientific or product readiness is inferred from them.

## Locked start population

- Start Git HEAD: `f6680225d5134d4f67bd59f4c5dbecb4eb0c476d`
- Readiness population digest: `ea9673af733a6216342c0e42e6056c6d80232b2b0f00974a70639ef6c2d0f976`
- Expanded integration population digest: `3e9fa09d1fdf8cba60402a94c2391a9abd4962887877a13633acb1ee47b4711d`
- Protected T-124 result/dossier/runtime/REU implementation population: not used by Pack A

## Final schema and migration

- Migration: `prisma/migrations/20260713180000_add_experiment_foundation_d19_v2_spine/migration.sql`
- Migration SHA-256: `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`
- Final v2 models: 34 total, comprising 6 PI and 28 EF models
- Legacy-table ALTER count: 0
- Cross-domain foreign-key count: 0
- Generic v2 authority-table count: 0
- Persisted capability/eligibility/dispatch mirror count: 0
- Attempt/provider/result/validation/evidence/closure/search table count: 0

The final additive migration was deployed only into an isolated disposable PostgreSQL 16 target. The complete 58-migration history applied successfully and the disposable container was removed after verification.

## Final authority state

- One admitted WorkOrder revision with two exact ordered cells
- One VersionLock with 23 exact dependencies
- One RunRecipe
- Two TrainingTaskSpecs
- One immutable batch Run with two ordered RunCells
- One sequence-fenced PI branch head
- One final EF `BranchHeadAdvanced` inbox receipt as the sole durable acknowledgement
- Zero ExecutionAttempt, provider job, result, validation, evidence, Cycle closure, UI/search or legacy writes

The four authoritative commits were T1 PI admission, T2 EF materialization/Run freeze, T3 PI head CAS and T4 EF acknowledgement. `WorkOrderRevisionAdmitted`, `RunManifestFrozen` and `BranchHeadAdvanced` were each durably relayed. Capability disable after T1 rejected new intake while allowing the committed saga to drain through T4.

## Integrity and replay evidence

- Two concurrent real-PostgreSQL identical admissions converged to one authority: one commit plus one exact replay
- Changed idempotency payloads, same-sequence different-Run payloads and full-envelope hash drift failed closed
- Lower sequence was durably `ignored_stale`
- Missing prerequisites were retryable with zero partial domain/outbox writes
- Extra, missing, substituted and reordered cells plus changed Run manifests all failed closed
- Five explicit legacy sentinels retained identical before/after counts and digests
- All 197 public non-v2 application tables retained identical before/after digests
- Excluded-table instrumented fetch count: 0

## Verification inventory

| Verification | Result |
|---|---|
| Shared typecheck | passed |
| Shared full test suite | 318/318 passed |
| Backend Prisma validate | passed |
| Backend typecheck | passed |
| Backend full test suite | 1885 passed, 0 failed, 39 skipped; 1924 total |
| Targeted Prisma repository tests | 9/9 passed |
| EF v2 service tests | 14/14 passed including subtests |
| PI/EF spine tests | 15/15 passed |
| D-19 gate harness tests | 42/42 passed |
| EF relational real-PostgreSQL test | passed |
| PI relational real-PostgreSQL test | passed |
| OpenAPI index generation/verification | passed; 187 endpoints |
| Strict OpenAPI quality gate | passed |
| DB context sync/verification | passed |
| Env contract validation | passed; 0 errors, 0 warnings |
| Context-awareness strict verification | passed |

## Ephemeral evidence

The generated run summary is at `.ai/.tmp/experiment-foundation-productization/packa-d19-final-20260713-r2/summary.json`. It records the exact fixture refs/hashes, four Unit-of-Work outcomes, three event outcomes, v2/excluded censuses and redaction guarantees. `.ai/.tmp` is ephemeral; this document retains the durable closure facts.

The final run used an explicit `pgvector/pgvector:pg16` disposable-image override because the host Docker credential helper stalled while resolving the default pinned `pgvector/pgvector:0.8.0-pg16` image. The default in code remains pinned and unchanged. The gate now terminates timed-out child processes and destroys their streams; no gate, container or credential-helper process remained after the run.

## Remaining independent decisions

1. Supply and review original-source license/access attestations for both datasets, then rerun the source-backed gate.
2. Separately authorize and review migration apply against a named existing target through the DB-SSOT workflow.
3. After the source-backed gate is green, separately authorize product enable/cutover and resolve active legacy jobs before switching writers or traffic.

## Subsequent source-policy closure addendum

The first remaining decision above is complete. `packa-d19-source-policy-20260713-r2` consumed exact reviewed Wikimedia and NQ Dataset/DataPolicy bindings and returned overall/source-policy `passed`, `reason_code=null` and `blockers=[]` while A01-A04/B01-B10 remained passed.

- Canonical attestation digest: `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`
- Final summary: `.ai/.tmp/experiment-foundation-productization/packa-d19-source-policy-20260713-r2/summary.json`
- Summary file SHA-256: `246ab54eb6a611ec9c1d4430e0cdadb6913989e6561dcc6617e95b6775fc675f`
- Disposable image: pinned `pgvector/pgvector:0.8.0-pg16`; cleaned successfully
- Existing database/provider/product effect: none

The original blocked result and image-override note above remain historical facts for the technical run. The new run supersedes only `SOURCE_POLICY_UNRESOLVED`; DB apply and product enable/writer cutover remain outstanding. The source-policy PASS does not prove full-corpus download, extraction, scientific alignment or provider execution.

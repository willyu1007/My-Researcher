# 01 Plan

## Phases
1. [x] Review admitted plans from T-095 and experiment-foundation contracts.
2. [x] Define `ResearchWorkOrder`, broker, harness, and run policy.
3. [x] Define refs/hashes into `RunRecipe`, `TrainingTaskSpec`, `ExternalTrainingJob`, `ExperimentResult`, `ResultValidationReport`, `EvaluationFact`, and `EvidenceCandidate`.
4. [x] Define `RunMonitorAdapter` intake for async job updates and result callbacks.
5. [x] Define `EvidenceLedgerWriter` and `RunEvidenceUnit` ingestion.
6. [x] Define upstream feedback trigger boundary for data unavailable, route infeasible, or baseline solving the need.
7. [x] Verify failed-run retention and exploratory/confirmatory separation under the historical V1 model; T-132 D-16 later keeps all Runs as immutable queryable history while moving only current-effective branch-head execution accounting to the immutable Cycle closure snapshot/hash.

## Review Before Next Flow
- Confirmed historical result interpretation can operate from `RunEvidenceUnit`; productized D-16 consumers use eligible REU plus the declared watermark-bound current-effective branch-head accounting snapshot.
- Confirmed work order statuses and failure summaries are queryable.
- Confirmed monitor callbacks without work-order refs are marked untrusted and cannot create run evidence.
- Confirmed implementation feedback remains explicit through T-093/T-095 trigger paths; T-096 does not mutate upstream topic-selection authority.
- Confirmed no experiment-foundation object is copied as authority state; only refs and hashes are stored.

## Verification
- Service/repository tests for work-order admission and ingestion.
- Future D-16 replacement tests must prove zero failed/cancelled/incomplete REU, exact current-head Cycle snapshot entries, non-head history default exclusion, explicit comparison lineage without scope promotion, stable no-head blocking, all-Cycle active real-Attempt blocking, CAS drift rebuild, separate negative/inconclusive disposition and no project-wide/history REU accounting scan; the historical tests remain audit evidence only.

# 03 Implementation Notes

## Purpose
- This file keeps the current implementation decisions readable.
- Completed D1-D57 details are summarized in `10-scaleout-run-ledger.md`.
- Raw run outputs and detailed reports live under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.

## Current Architecture Decisions
- Candidate staging is the standard ingress for newly acquired external literature.
- B10 broad discovery writes only `LiteratureDiscoveryBatch` and `LiteratureDiscoveryCandidate`.
- B10 performs only lightweight obvious duplicate checks.
- B11 promotion is the authoritative deduplication boundary and reuses existing literature import behavior.
- Promoted literature enters the existing standard pipeline unchanged.
- Effective literature means a managed `LiteratureRecord` with all standard stages through `INDEXED=SUCCEEDED`.
- Candidate status remains a string constrained by application logic, not a Prisma enum.
- Candidate staging intentionally has no separate decision-log table, source-specific tables, or hard uniqueness constraints.

## Current Data Model
- `LiteratureDiscoveryBatch` records the discovery run envelope:
  - `batchCode`
  - `directionScope`
  - `sourceProviders`
  - `queryLedger`
  - `summaryStats`
  - status and error summary fields
- `LiteratureDiscoveryCandidate` records the latest candidate state:
  - normalized title and candidate metadata
  - source provider and external IDs
  - source URLs and raw payload
  - dedup key and duplicate links
  - lightweight direction, role, and value scores
  - latest decision reason and decision timestamp
  - matched/promoted literature links
- `LiteratureRecord` keeps reverse links to matched and promoted discovery candidates.

## Local DB State
- Scoped candidate-staging migration has been applied to local dev.
- Remaining local DB drift is unrelated historical `TopicResearchRecord` drift and must not be bundled into literature-candidate work.
- DB writes in this task have been limited to the approved local development database.

## Current Runtime Entrypoints
- B10 discovery: `tools/b10-candidate-discovery.mjs`
- B11 triage/promote: `tools/b11-candidate-triage-promote.mjs`
- B11 source-available selector: `tools/b11-source-available-selector.mjs`
- B12 standard pipeline: `tools/b12-standard-pipeline-pilot.mjs`
- B12 fulltext acquisition: `tools/b12-fulltext-acquisition-pilot.mjs`
- B12 content backfill: `tools/b12-content-backfill-pilot.mjs`
- B13 counting: `tools/literature-scaleout-counting-report.mjs`

## Current B12 Method Boundary
- `LITERATURE_KEY_CONTENT_READY_METHOD=codex_curated` is the default.
- Default B12 key-content runs require curated dossier import and should not call the LLM gateway.
- `llm_gateway` extraction is explicit-only and must be sized by fulltext-section fan-out, not paper count.
- Completed source-backed tranches now use source-grounded `codex_curated` dossiers, then chunk/embed/index backfill.

## Recent Decisions

### D53 Read-Only Source-Available Selector Preflight
- Kept the run read-only; no candidate or literature rows were mutated.
- All-`DISCOVERED` B11 dry-run over 233 candidates found 96 ready, 109 deferred, 14 duplicate, and 14 rejected.
- Source-availability audit found 92 source-available candidates among `DISCOVERED` plus `READY_FOR_PROMOTION`.
- Strict source-backed selector selected 0 clean `DISCOVERED` candidates because all ready source-backed options were application or direction tail.
- Decision: do not promote the broad ready set directly; use narrower source-backed B10 refill before the next DB-writing tranche.

### D54 Balanced RAG/Test-Time Source-Backed Tranche
- Added B10 arXiv ID allowlist support for `arxiv:<id>` and bare arXiv IDs.
- Skipped two exact-title targets already in the formal corpus: `LIT-0328` and `LIT-0295`.
- B10 wrote 6 clean source-backed candidates to staging only.
- B11 promoted all 6 into `LIT-0484` through `LIT-0489`.
- B12 completed all 6 through `INDEXED` using arXiv acquisition, source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Managed/effective corpus reached 303 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D55 Source-Backed Exact-Title Tranche
- Kept broad arXiv and arXiv-ID dry-runs diagnostic-only after arXiv HTTP 429s.
- Used OpenAlex exact-title discovery with `B10_REQUIRE_SOURCE_AVAILABLE=true`.
- B10 v3 dry-run found 16 source-available candidates: 11 `DISCOVERED` and 5 same-batch duplicates.
- B10 apply persisted 1 batch and 11 `DISCOVERED` candidates.
- B11 promoted all 11 into `LIT-0490` through `LIT-0500`.
- B12 completed all 11 through `INDEXED` using arXiv acquisition, source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Managed/effective corpus reached 314 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D57 Serving/Resource-Allocation Exact-Title Tranche
- Started with a read-only OpenAlex source-backed scouting run across RAG, test-time, and serving tracks.
- Scouting found 87 source-available candidates, but only 19 new `DISCOVERED` rows; the clean high-signal items were overwhelmingly serving/resource-allocation.
- D57 therefore used a serving-focused exact-title allowlist rather than forcing weak RAG/test-time tails into the tranche.
- B10 exact-title dry-run found 18 source-available candidates: 12 `DISCOVERED` and 6 same-batch duplicates.
- B10 apply persisted 1 batch and 12 `DISCOVERED` candidates.
- B11 promoted all 12 into `LIT-0501` through `LIT-0512`.
- B12 completed all 12 through `INDEXED` using arXiv acquisition, serving-aware source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Managed/effective corpus reached 326 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D58 RAG/Test-Time Duplicate-Loop Rebalance Tranche
- Started with a read-only RAG/test-time OpenAlex source-backed scouting run.
- Scouting found 60 source-available candidates, but only 6 new `DISCOVERED` rows and most new rows were application-tail or off-mainline.
- Instead of writing weak new candidates, D58 promoted clean source-backed candidates already present in the candidate layer but stuck behind early duplicate-loop decisions.
- B11 dry-run over the selected duplicate-loop candidate set produced 4 high-band `READY_FOR_PROMOTION` decisions and 5 same-run duplicate companion decisions.
- B11 apply/promote created `LIT-0513` through `LIT-0516`.
- D58 also marked one leftover DOI candidate for `Reasoning in Token Economies` as duplicate after the arXiv-backed canonical candidate was promoted.
- B12 completed all 4 through `INDEXED` using acquisition, source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Managed/effective corpus reached 330 with 0 incomplete, 0 blocked, and 0 not-started managed records.

## Latest Count Snapshot

| Metric | Value |
| --- | ---: |
| Candidate batches | 15 |
| Candidate pool | 600 |
| Discovered candidates | 232 |
| Ready candidates | 23 |
| Promoted candidates | 187 |
| Managed corpus | 330 |
| Effective literature | 330 |
| Pipeline incomplete | 0 |
| Pipeline blocked | 0 |
| Pipeline not started | 0 |

## Next Implementation Step
- Preferred next collection step: either continue small RAG/test-time source-backed cleanup or run broader B10 catalog expansion for fresh recall.
- If recall is more important than immediate effective-literature growth, run a broader B10 catalog expansion first and keep B11/B12 promotion on a smaller source-backed subset.
- Keep generated artifacts out of versioned docs and under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.

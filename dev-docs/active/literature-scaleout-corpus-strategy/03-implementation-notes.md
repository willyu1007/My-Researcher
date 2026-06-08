# 03 Implementation Notes

## Purpose
- This file keeps the current implementation decisions readable.
- Completed D1-D68 details are summarized in `10-scaleout-run-ledger.md`.
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

### D59 Serving Source-Backed Curated Expansion Tranche
- Ran a broad read-only OpenAlex source-backed B10 scout across all tracks.
- The broad scout found 109 source-available candidates: 18 `DISCOVERED` and 91 duplicates.
- New `DISCOVERED` rows were overwhelmingly serving/resource-allocation; RAG/test-time additions remained weak or tail-heavy.
- D59 therefore used a serving-focused title allowlist and persisted only `DISCOVERED` rows.
- B10 apply wrote 1 batch and 8 arXiv-backed serving candidates.
- B11 dry-run split the 8 candidates into 4 high-band `READY_FOR_PROMOTION` and 4 medium-band `DEFERRED`.
- B11 apply/promote created `LIT-0517` through `LIT-0520` and left the other 4 candidates deferred.
- B12 completed all 4 promoted records through `INDEXED` using arXiv acquisition, serving-aware source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Managed/effective corpus reached 334 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D60 RAG/Test-Time Direction-Balance Tranche
- Returned to direction balance after D59 serving-heavy growth.
- A first arXiv-backed RAG/test-time B11 dry-run found useful titles but exposed mutually linked same-batch duplicate rows rather than clean canonical promote targets.
- A narrower DOI/ACL candidate dry-run produced 9 high-band decisions: 6 clean `READY_FOR_PROMOTION` candidates and 3 duplicate-loop companions.
- B11 apply/promote intentionally included only the 6 clean candidates, creating `LIT-0521` through `LIT-0526`.
- Direction mix for the promoted set: 4 `direction:rag-aware-allocation` core records and 2 `direction:test-time-compute-budgeting` strategy-support records.
- B12 completed all 6 through `INDEXED`; 5 fulltexts came from Unpaywall-discovered ACL PDFs and `LIT-0525` used an explicit arXiv PDF after Unpaywall returned `UNPAYWALL_NO_OA_PDF`.
- Managed/effective corpus reached 340 with 0 incomplete, 0 blocked, and 0 not-started managed records.
- Follow-up: repair or explicitly handle mutually linked duplicate-loop candidates before using those rows as promotion selectors.

### D61 Duplicate-Anchor Hygiene and Clean3 Tranche
- Read-only duplicate graph scan found 143 `DUPLICATE` candidates: 8 mutual-link rows across 4 titles, 7 chain-to-duplicate rows, 20 pointing to ready candidates, and 15 pointing to discovered candidates.
- The persistent mutual-link rows were mostly serving-direction historical duplicates; the RAG/test-time blockage came from B11 treating unlinked `DUPLICATE` companion rows as existing-candidate duplicate anchors.
- Updated `b11-candidate-triage-promote.mjs` so unlinked `DUPLICATE` candidates do not block a clean candidate with the same identity.
- Kept linked duplicate rows as valid anchors when they point to real `matchedLiteratureId` or `promotedLiteratureId`.
- Regression dry-run over the D60 blocked candidates produced 3 high-band `READY_FOR_PROMOTION` decisions.
- B11 apply/promote created `LIT-0527` through `LIT-0529`: 2 RAG core records and 1 test-time strategy-support record.
- B12 completed all 3 through `INDEXED` using Unpaywall-discovered ACL PDFs, source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Managed/effective corpus reached 343 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D62 RAG/Test-Time Source-Available Selector Dry-Run
- Kept D62 read-only; no candidate or literature rows were mutated.
- Built a broader RAG/test-time source-available pool from arXiv and ACL Anthology-backed candidates.
- Pool size: 154 candidates, including 87 RAG and 67 test-time candidates; source mix was 115 arXiv and 39 ACL Anthology.
- B11 dry-run over the pool produced 31 `READY_FOR_PROMOTION`, 53 `DEFERRED`, 69 `DUPLICATE`, and 1 `REJECTED` decision.
- Source-available selector with quotas `rag-aware-allocation=6,test-time-compute-budgeting=6` selected 12 candidates from 14 eligible decisions.
- Immediate clean subset is 9 candidates: 6 RAG plus 3 test-time candidates focused on inference scaling, token budgets, and process rewards.
- Defer or exclude before apply: `METAL`, `TabTracer`, and `InstantBooth`, because they are chart/table/text-to-image application tails rather than central test-time compute budgeting papers.
- Follow-up: either apply the 9-candidate clean subset or tighten test-time tail filtering before the next selector apply.

### D63 RAG/Test-Time Clean9 B11/B12 Tranche
- Used the D62 clean subset only; kept `METAL`, `TabTracer`, and `InstantBooth` out of the apply set.
- Pre-run B13 count was managed/effective 343/343 with 0 incomplete, 0 blocked, and 0 not-started managed records.
- B11 dry-run over 9 explicit candidates produced 9 high-band `READY_FOR_PROMOTION` decisions.
- B11 apply/promote created `LIT-0530` through `LIT-0538`: 6 RAG records and 3 test-time records.
- B12 initial standard apply completed citation and abstract stages and hit the expected `FULLTEXT_SOURCE_MISSING` blocker before acquisition.
- Acquisition dry-run planned 9 fulltexts with 0 blockers: 7 Unpaywall and 2 arXiv.
- Acquisition apply succeeded for all 9 and created 9 content assets.
- Fulltext preprocessing succeeded for all 9 and created 9 ready fulltext documents.
- Source-grounded `codex_curated` dossier dry-run validated all 9; import succeeded for all 9 with 0 source-ref repairs.
- Standard index apply completed `KEY_CONTENT_READY`, `CHUNKED`, `EMBEDDED`, and `INDEXED` for all 9.
- Final state probe found all 9 records have all seven standard stages `SUCCEEDED`, active embedding versions, and indexed vectors.
- Managed/effective corpus reached 352 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D64 Wide Source-Available Selector Tranche
- Added selector tail filters for chart generation, table reasoning, text-to-image, and test-time finetuning tails before rerunning selection.
- Built a current three-direction source-available pool from unpromoted candidates.
- Pool size: 230 candidates, including 85 serving, 81 RAG, and 64 test-time candidates; source mix was 194 arXiv and 36 ACL Anthology.
- B11 dry-run over the pool produced 32 `READY_FOR_PROMOTION`, 87 `DEFERRED`, 109 `DUPLICATE`, and 2 `REJECTED` decisions.
- Source-available selector target was 18 with direction quotas 6/6/6, but only 11 candidates passed the strict source/tail filter.
- Selected and promoted 11 high-band records into `LIT-0539` through `LIT-0549`: 9 serving/resource-allocation records and 2 RAG/theory-support records.
- No test-time record was promoted because remaining ready test-time candidates were application-tail after the D63 filter was enforced.
- B12 completed all 11 through `INDEXED` using 8 arXiv sources, 3 Unpaywall sources, source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Final state probe found all 11 records have all seven standard stages `SUCCEEDED`, active embedding versions, and indexed vectors.
- Managed/effective corpus reached 363 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D65 Narrow RAG/Test-Time Source-Backed B10 Refill And Singleton Completion
- Ran an OpenAlex source-backed dry-run over narrow RAG/test-time query overrides.
- OpenAlex dry-run found 7 source-available candidates: 2 `DISCOVERED` and 5 duplicates.
- Kept `RAG-Verus` out of apply scope because it is a repository-level program-verification application tail.
- Ran an arXiv exact-ID dry-run for known RAG/test-time targets; it found 4 source-backed candidates: 1 `DISCOVERED` and 3 duplicates.
- Applied only the clean arXiv-backed `DISCOVERED` row with `B10_PERSIST_STATUSES=DISCOVERED`.
- B10 apply wrote 1 batch and 1 candidate: `Stronger Baselines for Retrieval-Augmented Generation with Long-Context Language Models`.
- A follow-up B11 dry-run over the new candidate returned high-band `READY_FOR_PROMOTION` as RAG core.
- B11 apply/promote created `LIT-0550` from candidate `ff23d45c-54e6-4096-b2e1-55a467925641`.
- B12 completed `LIT-0550` through `INDEXED` using arXiv acquisition, source-grounded `codex_curated` dossier import, and chunk/embed/index backfill.
- Final state probe found all seven standard stages `SUCCEEDED`, 1 content asset, 1 fulltext document, 107 embedding chunks, and 107 indexed vectors.
- Managed/effective corpus reached 364/364 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D66 Test-Time Exact-ID Source-Backed Small Tranche
- Used arXiv exact IDs to refill test-time compute budgeting candidates.
- B10 dry-run found 5 source-available candidates: 4 `DISCOVERED` and 1 duplicate.
- Duplicate: `Budget-aware Test-time Scaling via Discriminative Verification` matched existing `LIT-0452`.
- B10 apply wrote 1 batch and 4 `DISCOVERED` candidates.
- B11 dry-run classified all 4 candidates as high-band `READY_FOR_PROMOTION`.
- B11 apply/promote created `LIT-0551` through `LIT-0554`.
- Promoted records:
  - `LIT-0551`: `First Finish Search: Efficient Test-Time Scaling in Large Language Models`
  - `LIT-0552`: `Is That Your Final Answer? Test-Time Scaling Improves Selective Question Answering`
  - `LIT-0553`: `Enhancing Test-Time Scaling of Large Language Models with Hierarchical Retrieval-Augmented MCTS`
  - `LIT-0554`: `Steering LLM Thinking with Budget Guidance`
- B12 completed all 4 through `INDEXED` using arXiv acquisition, source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Key-content extraction provider calls: 0.
- Final state probe found all 4 records have all seven standard stages `SUCCEEDED`, 4 content assets, 4 fulltext documents, 473 embedding chunks, and 5167 indexed vectors.
- Managed/effective corpus reached 368/368 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D67 Test-Time Existing Source-Backed Small Tranche
- Ran a read-only broad B11 dry-run over current `DISCOVERED` candidates before writing.
- Broad dry-run found 91 `READY_FOR_PROMOTION`, 111 `DEFERRED`, and 14 `REJECTED` decisions across all three directions.
- Strict source-available selector selected 0 candidates from that broad decision set, so the wide READY pool was not promoted.
- Selected 4 existing arXiv-backed high-band test-time candidates by explicit candidate id instead of forcing broad selector output.
- B11 apply/promote created `LIT-0555` through `LIT-0558`.
- Promoted records:
  - `LIT-0555`: `Expanding Performance Boundaries of Open-Source Multimodal Models with Model, Data, and Test-Time Scaling`
  - `LIT-0556`: `Test-Time Computing for Referring Multimodal Large Language Models`
  - `LIT-0557`: `TabTracer: Monte Carlo Tree Search for Complex Table Reasoning with Large Language Models`
  - `LIT-0558`: `Alpha-SQL: Zero-Shot Text-to-SQL using Monte Carlo Tree Search`
- B12 completed all 4 through `INDEXED` using arXiv acquisition, source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Key-content extraction provider calls: 0.
- Final state probe found all 4 records have all seven standard stages `SUCCEEDED`, 4 content assets, 4 fulltext documents, and 820 embedding chunks.
- Managed/effective corpus reached 372/372 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D68 Source/Tail-Gated Broad Selector Apply
- Repaired `b11-source-available-selector.mjs` source gating:
  - default source kinds are `arxiv,acl,doi`;
  - DOI candidates now require `source_access` with a likely non-DOI PDF URL;
  - known current-downloader blocked PDF hosts default to `direct.mit.edu`, `dl.acm.org`, `www.mdpi.com`, and `mdpi.com`;
  - source kind and source PDF URL are emitted in selector output.
- Repaired broad-tail handling:
  - split hard and soft application/direction tails;
  - kept core direction signals from over-excluding MCTS, process reward, and resource-scheduling titles;
  - added hard application tails for MRI/medical, smart home, enterprise architecture, construction, financial, agriculture/broiler, and video-caption domains.
- B11 broad dry-run with `source_access` over 212 `DISCOVERED` candidates produced 87 ready, 111 deferred, and 14 rejected decisions.
- Initial broad apply promoted 15 DOI candidates, but acquisition proved DOI/OA was too permissive:
  - 3 records completed through `INDEXED`: `LIT-0564`, `LIT-0565`, and `LIT-0570`;
  - 12 records were soft-excluded after acquisition failures: `LIT-0559`-`LIT-0563`, `LIT-0566`-`LIT-0569`, and `LIT-0571`-`LIT-0573`.
- A follow-up current broad B11 pass moved the remaining `DISCOVERED` candidates into `READY_FOR_PROMOTION`, `DEFERRED`, or `REJECTED`.
- One operator mistake used unsupported `B11_INCLUDE_CANDIDATE_IDS`; the script now accepts it as an alias for `B11_CANDIDATE_IDS`, and the two accidental promotions `LIT-0574`-`LIT-0575` were soft-excluded.
- Final host-gated selector selected only `f2ce7161-0b23-4680-bfb8-e25ba157eaec`.
- Correct selected apply promoted `LIT-0576`, which completed through `INDEXED`.
- `LIT-0577` was promoted before `direct.mit.edu` was added to blocked hosts, then soft-excluded after acquisition returned HTTP 403.
- Net D68 effect:
  - `LiteratureRecord`: +19 raw rows.
  - Effective literature: +4.
  - Excluded non-corpus: +15.
  - Managed/effective corpus reached 376/376 with 0 incomplete, 0 blocked, and 0 not-started managed records.

### D69 Narrow RAG Source-Backed B10 Refill
- Started from D68 final count: candidate pool 613, `DISCOVERED` 0, managed/effective 376/376, and 0 managed blockers.
- Ran three read-only scouts:
  - RAG/test-time source-backed scout: 6 candidates, 1 new `DISCOVERED`, 5 duplicates.
  - method-gap scout: 5 candidates, 2 new `DISCOVERED`, 3 duplicates.
  - arXiv-only test-time scout: 0 candidates.
- Applied only the exact-title RAG source-backed subset:
  - `MCTS-RAG: Enhancing Retrieval-Augmented Generation with Monte Carlo Tree Search`
  - `The Power of Noise: Redefining Retrieval for RAG Systems`
- B10 apply wrote 1 batch and 2 `DISCOVERED` candidates; it wrote no `LiteratureRecord` rows.
- B11 dry-run over the D69 batch classified both candidates as high-band `READY_FOR_PROMOTION` with `db_delta=0`.
- Post-run count: candidate pool 615, `DISCOVERED` 2, managed/effective 376/376, and 0 incomplete, blocked, or not-started managed records.

### D70 D69 RAG Promote/B12 And Test-Time Balance
- Promoted the two D69 RAG candidates by explicit candidate id:
  - `LIT-0578`: `MCTS-RAG: Enhancing Retrieval-Augmented Generation with Monte Carlo Tree Search`.
  - `LIT-0579`: `The Power of Noise: Redefining Retrieval for RAG Systems`.
- B12 completed both RAG records through `INDEXED` using arXiv acquisition, source-grounded `codex_curated` dossiers, and chunk/embed/index backfill.
- Direction-balance scout findings:
  - strict test-time source-backed scout found only one new `DISCOVERED` title, but it was a scalable-deliberation tail and was not applied.
  - source-available selector with `preprint_doi` surfaced a TechRxiv test-time singleton, promoted as `LIT-0580`, but acquisition failed with HTTP 403 from a Cloudflare-protected TechRxiv PDF.
  - `LIT-0580` was soft-excluded with `classification:excluded-from-corpus`, `exclusion:source-access-403`, and `exclusion:techrxiv-cloudflare-challenge`.
- Refilled a cleaner exact-title arXiv test-time target:
  - `Scaling LLM Inference with Optimized Sample Compute Allocation`.
  - B10 apply wrote 1 new batch and 1 `DISCOVERED` candidate.
  - B11 promoted it as `LIT-0581`.
  - B12 completed `LIT-0581` through `INDEXED` with arXiv acquisition and `codex_curated` key-content.
- Net D70 effect:
  - Effective literature: +3.
  - Excluded non-corpus: +1.
  - Candidate pool: +1.
  - Final managed/effective corpus reached 379/379 with 0 incomplete, 0 blocked, and 0 not-started managed records.

## Latest Count Snapshot

| Metric | Value |
| --- | ---: |
| Candidate batches | 20 |
| Candidate pool | 616 |
| Discovered candidates | 0 |
| Ready candidates | 81 |
| Promoted candidates | 252 |
| Deferred candidates | 126 |
| Managed corpus | 379 |
| Effective literature | 379 |
| Pipeline incomplete | 0 |
| Pipeline blocked | 0 |
| Pipeline not started | 0 |

## Next Implementation Step
- Preferred next collection step: commit D70 records, then continue with a narrow exact-title/source-backed refill or a small high-band source-available tranche.
- Keep the repaired selector host gate active before any future DOI-heavy broad apply.
- Keep promoting only high-band clean candidates and leave medium/application-tail candidates deferred or rejected.
- Keep generated artifacts out of versioned docs and under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.

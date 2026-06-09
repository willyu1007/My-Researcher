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

### D71 Narrow RAG Exact-ID Source-Backed Refill
- Committed D70 records as `6bcfd437 docs(literature): record d70 source-backed balance`.
- Ran a narrow OpenAlex source-backed scout across RAG/test-time query overrides:
  - 3 source-backed candidates found.
  - 0 new `DISCOVERED` rows.
  - duplicates matched `LIT-0155`, `LIT-0179`, and `LIT-0231`.
- Used arXiv exact IDs for a stricter D71 refill:
  - RAG IDs: `2511.14769`, `2511.09803`, and `2502.12145`.
  - test-time ID: `2505.16122`.
- B10 exact-ID dry-run found 4 source-backed candidates:
  - 2 `DISCOVERED`.
  - 2 duplicates.
  - duplicate `Plan and Budget` matched `LIT-0238`.
  - duplicate `Retrieval as a Decision` matched `LIT-0188`.
- B10 apply wrote 1 batch and 2 new `DISCOVERED` RAG candidates:
  - `16580c5d-e876-469c-9b33-bed96a055eec`: `Cluster-based Adaptive Retrieval: Dynamic Context Selection for RAG Applications`.
  - `943c9d4a-e998-4471-a8dd-d1eccffef0fa`: `Fast or Better? Balancing Accuracy and Cost in Retrieval-Augmented Generation with Flexible User Control`.
- B11 dry-run over the D71 batch classified both candidates as high-band `READY_FOR_PROMOTION` with triage score `0.922`.
- D71 stopped at candidate-layer refill plus B11 validation; no `LiteratureRecord`, fulltext, key-content, embedding, or index rows were created.
- Post-run count:
  - candidate batches: 21.
  - candidate pool: 618.
  - `DISCOVERED`: 2.
  - managed/effective corpus: 379/379.
  - incomplete, blocked, and not-started managed records: 0/0/0.

### D72 D71 RAG Promote/B12 And Test-Time Exact-ID Refill
- Promoted the two D71 RAG candidates by explicit candidate id:
  - `LIT-0582`: `Cluster-based Adaptive Retrieval: Dynamic Context Selection for RAG Applications`.
  - `LIT-0583`: `Fast or Better? Balancing Accuracy and Cost in Retrieval-Augmented Generation with Flexible User Control`.
- B12 completed both RAG records through `INDEXED`:
  - arXiv acquisition succeeded for both and created 2 content assets.
  - source-grounded `codex_curated` dossier import succeeded for both.
  - final index backfill succeeded for both.
  - key-content extraction provider calls: 0.
  - embedding provider calls estimated by backfill: 2.
- Final record state:
  - `LIT-0582`: 1 content asset, 1 fulltext document, 127 embedding chunks, 1407 indexed tokens.
  - `LIT-0583`: 1 content asset, 1 fulltext document, 137 embedding chunks, 1387 indexed tokens.
- Ran a narrower test-time exact-ID/source-backed refill after RAG completion:
  - dry-run tested arXiv IDs `2501.19393`, `2508.17196`, `2509.03581`, `2504.01317`, and `2509.15148`.
  - `s1: Simple test-time scaling` matched existing `LIT-0347`.
  - `BudgetThinker` matched existing `LIT-0153`.
  - B10 apply wrote 1 batch and 3 new `DISCOVERED` test-time candidates.
- D72 test-time candidates validated by B11 dry-run as high-band `READY_FOR_PROMOTION`:
  - `a11bd976-fd4a-4236-a5f5-940a434e7acd`: `Learning When to Plan: Efficiently Allocating Test-Time Compute for LLM Agents`, score `0.918`.
  - `67659b8a-6a13-4846-b4bb-9b8aa8fdc095`: `Adaptive Rectification Sampling for Test-Time Compute Scaling`, score `0.913`.
  - `74fda4f3-4c04-473c-80f6-22c1ebbcc5ff`: `ATTS: Asynchronous Test-Time Scaling via Conformal Prediction`, score `0.913`.
- Net D72 effect:
  - Effective literature: +2.
  - Candidate pool: +3.
  - Managed/effective corpus reached 381/381.
  - Incomplete, blocked, and not-started managed records remain 0/0/0.

### D73 D72 Test-Time Promote/B12 And Math Theory Audit
- Fixed the theory-support drift in `00-overview.md`: effective `collection:theory-support` is 56, not 52.
- Promoted the three D72 test-time candidates by explicit candidate id:
  - `LIT-0584`: `Learning When to Plan: Efficiently Allocating Test-Time Compute for LLM Agents`.
  - `LIT-0585`: `Adaptive Rectification Sampling for Test-Time Compute Scaling`.
  - `LIT-0586`: `ATTS: Asynchronous Test-Time Scaling via Conformal Prediction`.
- B12 completed all three records through `INDEXED`:
  - standard apply completed citation and abstract, then hit expected `FULLTEXT_SOURCE_MISSING`.
  - arXiv acquisition succeeded for all three and created 3 content assets.
  - fulltext preprocessing succeeded for all three.
  - source-grounded `codex_curated` dossier import succeeded for all three.
  - final index backfill succeeded for all three.
  - key-content extraction provider calls: 0.
  - embedding provider calls estimated by backfill: 3.
- Math theory-support audit artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/20260610T-d73-math-theory-support-audit.json`.
- Audit result:
  - measure and information: 6 effective records.
  - group/action geometry: 2 effective records, both scope-borderline.
  - metric and high-dimensional geometry: 8 effective records.
  - submodular and budgeted selection: 9 effective records.
  - bandit, stopping, and online allocation: 6 effective records.
  - queueing and serving scheduling: 12 effective records.
- Assessment:
  - measure/information, metric geometry, submodular/budgeted selection, and queueing/scheduling are ready to support formal framing.
  - group/action geometry is present but thin; use a narrow exact-title refill if this line needs non-borderline theory weight.
- Recency policy:
  - math theory support is canonicality-first, not recency-first.
  - use old-but-foundational papers when they provide reusable formal tools for measure, geometry, group actions, optimization, queueing, or online allocation.
  - for math-theory B10 exact-ID refills, set `B10_MIN_YEAR=1900` or another deliberately low cutoff so pre-2018 classics are not filtered out.
- Source-backed exact-ID candidates found for a future group/action-geometry refill:
  - `arxiv:1811.02017`: `A General Theory of Equivariant CNNs on Homogeneous Spaces`.
  - `arxiv:1703.06114`: `Deep Sets`.
  - `arxiv:1911.08251`: `General E(2)-Equivariant Steerable CNNs`.
- Net D73 effect:
  - Effective literature: +3.
  - `DISCOVERED` candidate count: 0.
  - Managed/effective corpus reached 384/384.
  - Incomplete, blocked, and not-started managed records remain 0/0/0.

### D74 Math-Theory Group/Action Refill, Promote, And B12
- Ran the narrow group/action-geometry refill identified in D73.
- Initial arXiv exact-ID dry-run was kept diagnostic only because arXiv returned provider errors:
  - `1811.02017`: HTTP 429.
  - `1703.06114`: HTTP 429.
  - `1911.08251`: request aborted.
- Added opt-in math-foundation gates so regular broad B10/B11 behavior remains unchanged:
  - `B10_ALLOW_MATH_FOUNDATION=true` lets `collection:theory-support` RAG runs pass explicit group/action and geometry foundation signals.
  - `B11_ALLOW_MATH_FOUNDATION=true` adds a theory-role alignment bonus and emits fine-grained `theory:*` tags during promote.
- Used OpenAlex exact-title fallback with `B10_MIN_YEAR=1900`, `B10_REQUIRE_SOURCE_AVAILABLE=true`, and `B10_ALLOW_MATH_FOUNDATION=true`.
- B10 apply persisted 4 source-backed candidates in batch `B10-D74-math-theory-group-action-exact-title`:
  - `A General Theory of Equivariant CNNs on Homogeneous Spaces`.
  - `Deep Sets`.
  - `General $E(2)$-Equivariant Steerable CNNs`.
  - `Intertwiners between Induced Representations (with Applications to the Theory of Equivariant Neural Networks)`.
- B11 dry-run with `B11_ALLOW_MATH_FOUNDATION=true` classified all 4 as high-band `READY_FOR_PROMOTION`.
- B11 apply/promote created:
  - `LIT-0587`: `Deep Sets`.
  - `LIT-0588`: `A General Theory of Equivariant CNNs on Homogeneous Spaces`.
  - `LIT-0589`: `Intertwiners between Induced Representations (with Applications to the Theory of Equivariant Neural Networks)`.
  - `LIT-0590`: `General $E(2)$-Equivariant Steerable CNNs`.
- B12 completed all 4 through `INDEXED`:
  - standard apply completed citation and abstract, then hit expected `FULLTEXT_SOURCE_MISSING`.
  - arXiv acquisition succeeded for all 4 and created 4 content assets.
  - fulltext preprocessing succeeded for all 4.
  - source-grounded `codex_curated` dossier import succeeded for all 4.
  - final index backfill succeeded for all 4.
  - key-content extraction provider calls: 0.
  - embedding provider calls estimated by final index dry-run: 4.
- Applied a D74-only tag backfill for the 4 new records so the math audit does not rely on title-only inference:
  - common tags: `theory:math-foundation`, `theory:target-qualified`, `theory:rag-allocation`, and `theory:group-action`.
  - `LIT-0588` and `LIT-0590` also received `theory:quotient-space` and `theory:metric-space`.
- D74 math audit artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/20260610T-d74-math-theory-support-audit.json`.
- Audit result:
  - effective `collection:theory-support`: 60.
  - target-qualified theory-support: 54.
  - group/action geometry: 6 total, 4 non-borderline D74 records.
  - metric and high-dimensional geometry: 10.
  - measure and information: 6.
  - submodular and budgeted selection: 9.
  - bandit, stopping, and online allocation: 9.
  - queueing and serving scheduling: 13.
- Net D74 effect:
  - Effective literature: +4.
  - Candidate pool: +4.
  - `DISCOVERED` candidate count: 0.
  - Managed/effective corpus reached 388/388.
  - Incomplete, blocked, and not-started managed records remain 0/0/0.

### D75 Balanced RAG/Test-Time Exact-Title Refill, Promote, And B12
- Returned to the default source-backed RAG/test-time path after D74; `B10_ALLOW_MATH_FOUNDATION` and `B11_ALLOW_MATH_FOUNDATION` were not used.
- Read-only scout results:
  - narrow RAG/test-time source-backed scout found 13 candidates, only 1 new `DISCOVERED`, and that candidate was a code-completion application tail.
  - current READY-pool B11 dry-run had 81 high-band candidates, but strict source selector selected 0 because the pool was mostly application/direction tail or lacked confirmed source availability.
  - wider RAG/test-time source-backed scout found 7 new candidates; test-time deep scout found 3 new candidates.
- Added a narrow B11 test-time signal fix:
  - recognizes `best-of-n`, `best of n`, `inference-aware`, `fast and slow`, `sampling`, and `thinking` as test-time strategy signals.
  - keeps application-tail gates unchanged; this is not a broad READY-tail relaxation.
- Final B10 exact-title dry-run selected 6 clean source-backed candidates:
  - 4 RAG-aware allocation core candidates.
  - 2 test-time compute budgeting strategy candidates.
- B10 apply persisted 6 `DISCOVERED` candidates in batch `B10-D75-rag-testtime-exact-title-sourcebacked`.
- B11 dry-run classified all 6 as high-band `READY_FOR_PROMOTION`.
- B11 apply/promote created:
  - `LIT-0591`: `Inference-Aware Fine-Tuning for Best-of-N Sampling in Large Language Models`.
  - `LIT-0592`: `LongRAG: A Dual-Perspective Retrieval-Augmented Generation Paradigm for Long-Context Question Answering`.
  - `LIT-0593`: `LongRAG: Enhancing Retrieval-Augmented Generation with Long-context LLMs`.
  - `LIT-0594`: `RQ-RAG: Learning to Refine Queries for Retrieval Augmented Generation`.
  - `LIT-0595`: `Thinking Fast and Slow in Large Language Models`.
  - `LIT-0596`: `Fine Tuning vs. Retrieval Augmented Generation for Less Popular Knowledge`.
- B12 completed all 6 through `INDEXED`:
  - standard apply completed citation and abstract, then hit expected `FULLTEXT_SOURCE_MISSING`.
  - arXiv acquisition succeeded for all 6 and created 6 content assets.
  - fulltext preprocessing succeeded for all 6.
  - source-grounded `codex_curated` dossier import succeeded for all 6.
  - final index backfill succeeded for all 6.
  - key-content extraction provider calls: 0.
  - embedding provider calls estimated by final index dry-run: 6.
- Final state probe confirmed all 6 records have one content asset, one fulltext document, embedding chunks, and all seven standard stages `SUCCEEDED`.
- Net D75 effect:
  - Effective literature: +6.
  - Candidate pool: +6.
  - `DISCOVERED` candidate count: 0.
  - Managed/effective corpus reached 394/394.
  - Direction counts became RAG 131, test-time 111, and serving 148.
  - Incomplete, blocked, and not-started managed records remain 0/0/0.

### D76 Catalog Expansion And Curated Source-Backed Apply
- Ran a broad OpenAlex source-backed catalog scout to raise candidate supply:
  - 87 candidate rows inspected.
  - 12 new `DISCOVERED` candidates survived obvious duplicate checks.
  - 75 were obvious duplicates or unsuitable for clean apply.
- Ran a narrower RAG/test-time scout:
  - 11 candidate rows inspected.
  - 2 were new `DISCOVERED` candidates.
  - `Retrieval-Enhanced Machine Learning` was the cleanest RAG theory/support candidate.
- Final curated B10 dry-run selected 6 source-backed candidates; B10 apply persisted 5 `DISCOVERED` candidates in batch `B10-D76-curated-catalog-expansion`.
- B11 dry-run classified all 5 as high-band `READY_FOR_PROMOTION`; promotion was intentionally deferred and processed together with the next refill.
- D76 persisted candidate set:
  - `Context Attribution with Multi-Armed Bandit Optimization`.
  - `Retrieval-Enhanced Machine Learning`.
  - `EPIC: Efficient Position-Independent Caching for Serving Large Language Models`.
  - `Efficient Heterogeneous Large Language Model Decoding with Model-Attention Disaggregation`.
  - `KunServe: Parameter-centric Memory Management for Efficient Memory Overloading Handling in LLM Serving`.
- Net D76 candidate-layer effect before promote:
  - Candidate pool: +5.
  - `DISCOVERED` candidate count: 5.
  - Managed/effective corpus remained 394/394.
  - Incomplete, blocked, and not-started managed records remained 0/0/0.

### D77 Small Refill, Combined Promote, And B12
- Tried test-time source-backed refill first:
  - exact-title OpenAlex dry-run only found `Self-Consistency Improves Chain of Thought Reasoning in Language Models`, which was already managed as `LIT-0227`.
  - arXiv exact-ID and search scouts returned raw records but produced no clean persisted candidates under the current test-time focus gates.
- Accepted a small serving refill from the D76 broad scout because it was source-backed and high-value:
  - `Atom: Low-bit Quantization for Efficient and Accurate LLM Serving`.
  - B10 apply persisted 1 `DISCOVERED` candidate in batch `B10-D77-serving-atom-exact-source-refill`.
- Combined B11 handled the 5 deferred D76 candidates plus the D77 `Atom` candidate:
  - dry-run classified all 6 as high-band `READY_FOR_PROMOTION`.
  - apply/promote created `LIT-0597` through `LIT-0602`.
- Promoted records:
  - `LIT-0597`: `EPIC: Efficient Position-Independent Caching for Serving Large Language Models`.
  - `LIT-0598`: `KunServe: Parameter-centric Memory Management for Efficient Memory Overloading Handling in LLM Serving`.
  - `LIT-0599`: `Atom: Low-bit Quantization for Efficient and Accurate LLM Serving`.
  - `LIT-0600`: `Efficient Heterogeneous Large Language Model Decoding with Model-Attention Disaggregation`.
  - `LIT-0601`: `Context Attribution with Multi-Armed Bandit Optimization`.
  - `LIT-0602`: `Retrieval-Enhanced Machine Learning`.
- B12 completed all 6 through `INDEXED`:
  - standard apply completed citation and abstract, then hit expected `FULLTEXT_SOURCE_MISSING`.
  - arXiv acquisition succeeded for all 6 and created 6 content assets.
  - fulltext preprocessing succeeded for all 6.
  - source-grounded `codex_curated` dossier import succeeded for all 6.
  - final index backfill succeeded for all 6.
  - key-content extraction provider calls: 0.
  - embedding provider calls estimated by final index dry-run: 6.
- Final state probe confirmed all 6 records have one content asset, one fulltext document, embedding chunks, and all seven standard stages `SUCCEEDED`.
- Net D77 effect:
  - Effective literature: +6 from the D76/D77 combined tranche.
  - Candidate pool: +1 after the D76 +5.
  - `DISCOVERED` candidate count: 0.
  - Managed/effective corpus reached 400/400.
  - Incomplete, blocked, and not-started managed records remain 0/0/0.

### D78 Broad Source-Backed B10 Scaleout And Clean2 Apply
- Ran an all-track OpenAlex source-backed broad dry-run:
  - 8 tracks.
  - 40 executed provider queries.
  - 0 provider errors.
  - 800 provider results inspected.
  - 81 source-backed candidates after B10 focus filters.
  - 8 new `DISCOVERED` candidates and 73 duplicates.
- Manual curation rejected 6 of the 8 new candidates as code-completion, quantitative-finance, edge-sensor, model-family, or generic ML-serving tail.
- Accepted 2 serving/resource-allocation system candidates for clean apply:
  - `C2CServe: Leveraging NVLink-C2C for Elastic Serverless LLM Serving on MIG`.
  - `PIM Is All You Need: A CXL-Enabled GPU-Free System for Large Language Model Inference`.
- Curated exact-title B10 dry-run found 3 source-backed candidates:
  - 2 `DISCOVERED`.
  - 1 same-title duplicate for `C2CServe`.
- B10 apply persisted only `DISCOVERED` rows in batch `B10-D78-serving-clean2-curated`:
  - `591a5d62-6b43-4755-ad2d-ef82053c691b`: `C2CServe: Leveraging NVLink-C2C for Elastic Serverless LLM Serving on MIG`.
  - `274d1ff4-258a-4a70-b541-99a65d21975f`: `PIM Is All You Need: A CXL-Enabled GPU-Free System for Large Language Model Inference`.
- B11 dry-run over the 2 D78 candidates classified both as high-band `READY_FOR_PROMOTION`; no B11 status writes and no promotion were applied in D78.
- Net D78 effect:
  - Candidate pool: +2.
  - `DISCOVERED` candidate count: 2.
  - Managed/effective corpus remained 400/400.
  - Incomplete, blocked, and not-started managed records remain 0/0/0.

### D79 D78 Serving Clean2 Promote And B12
- Promoted the 2 D78 high-band serving candidates:
  - `LIT-0603`: `C2CServe: Leveraging NVLink-C2C for Elastic Serverless LLM Serving on MIG`.
  - `LIT-0604`: `PIM Is All You Need: A CXL-Enabled GPU-Free System for Large Language Model Inference`.
- B11 dry-run classified both as high-band `READY_FOR_PROMOTION`; B11 apply/promote created 2 `LiteratureRecord` rows and 2 `LiteratureSource` rows.
- B12 completed both through `INDEXED`:
  - standard apply completed citation and abstract, then hit expected `FULLTEXT_SOURCE_MISSING`.
  - arXiv acquisition succeeded for both and created 2 content assets.
  - fulltext preprocessing succeeded for both.
  - source-grounded `codex_curated` dossier import succeeded for both.
  - final index backfill succeeded for both.
  - key-content extraction provider calls: 0.
  - embedding provider calls estimated by final index dry-run: 2.
- Final state probe confirmed both records have one content asset, one fulltext document, 176 embedding chunks, and all seven standard stages `SUCCEEDED`.
- Net D79 effect:
  - Effective literature: +2.
  - Candidate pool: unchanged after D78 apply.
  - `DISCOVERED` candidate count: 0.
  - Managed/effective corpus reached 402/402.
  - Incomplete, blocked, and not-started managed records remain 0/0/0.

## Latest Count Snapshot

| Metric | Value |
| --- | ---: |
| Candidate batches | 27 |
| Candidate pool | 639 |
| Discovered candidates | 0 |
| Ready candidates | 81 |
| Promoted candidates | 275 |
| Deferred candidates | 126 |
| Managed corpus | 402 |
| Effective literature | 402 |
| Pipeline incomplete | 0 |
| Pipeline blocked | 0 |
| Pipeline not started | 0 |

## Next Implementation Step
- Preferred next collection step: continue broader B10 expansion for candidate-pool recall, or run a narrow RAG/test-time refill if direction balance is preferred.
- Keep the repaired selector host gate active before any future DOI-heavy broad apply.
- Keep promoting only high-band clean candidates and leave medium/application-tail candidates deferred or rejected.
- Keep generated artifacts out of versioned docs and under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.

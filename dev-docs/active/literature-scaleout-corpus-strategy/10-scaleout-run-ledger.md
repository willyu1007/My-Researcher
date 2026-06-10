# 10 Scaleout Run Ledger

## Purpose
- Compact index of completed T-122 decisions and collection rounds.
- Detailed generated evidence lives under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Expanded historical logs remain available in git history before the D56 documentation cleanup.

## Current Checkpoint
- Latest corpus checkpoint: after D91 D90 RAG-core promote/B12 completion.
- Latest candidate checkpoint: after D90 adjacent-topic clean6 refill and B11 status apply.
- Candidate pool: 669.
- Managed corpus: 422.
- Effective literature: 422.
- Managed pipeline incomplete/blocker/not-started: 0/0/0.
- Theory-support target: 54/50 target-qualified records.

## Decision Ledger

| Round | Summary |
| --- | --- |
| D1 | Locked scale interpretation: 5000-level target is candidate-pool scale, not full-pipeline scale. |
| D2 | Added candidate staging before the existing standard literature pipeline. |
| D3 | Kept B10 dedup lightweight and made B11 promotion the authoritative dedup boundary. |
| D4 | Chose a lightweight two-table candidate schema without a decision-log table. |
| D5 | Locked simple candidate lifecycle: `DISCOVERED`, `DUPLICATE`, `REJECTED`, `DEFERRED`, `READY_FOR_PROMOTION`, `PROMOTED`. |
| D6 | Kept candidate fields minimal and avoided authoritative uniqueness constraints. |
| D7 | Drafted Prisma models and `LiteratureRecord` reverse links. |
| D8 | Applied Prisma SSOT changes and refreshed DB context without DB writes. |
| D9 | Chose scoped local-dev migration strategy excluding unrelated live DB drift. |
| D10 | Applied scoped candidate-staging migration to local dev and verified it. |
| D11 | Locked B13 counting contract and baseline. |
| D12 | Implemented first B10 discovery entrypoint and OpenAlex smoke apply. |
| D13 | Hardened B10 provider/query behavior and applied 60 OpenAlex pilot candidates to staging. |
| D14 | Implemented B11 triage/promote and promoted 10 pilot records. |
| D15 | Implemented B12 standard-pipeline pilot for citation/abstract/fulltext-preprocess staging. |
| D16 | Implemented fulltext acquisition/content backfill; diagnosed provider timeout behavior. |
| D17 | Switched default key-content method to `codex_curated`. |
| D18 | Completed first `codex_curated` happy-path canary. |
| D19 | Completed two-record `codex_curated` batch. |
| D20 | Completed three-record `codex_curated` batch. |
| D21 | Promoted opportunity tranche; completed 2 and left 2 source-access blockers. |
| D22 | Cleared key blockers and repaired source handling for source-access records. |
| D23 | Soft-excluded source-access records from progress metrics. |
| D24 | Promoted six arXiv-ready RAG records and fixed sparse ID collision handling. |
| D25 | Completed six arXiv-ready RAG records through `INDEXED`. |
| D26 | Expanded B10 catalog to v2b and validated larger dry-runs. |
| D27 | Applied first test-time targeted B10 batch to candidate staging. |
| D28 | Promoted 12 arXiv-backed test-time records. |
| D29 | Completed the 12-record test-time arXiv tranche through `INDEXED`. |
| D30 | Completed source-available tranche3, adding 6 effective records. |
| D31 | Completed source-available tranche4, adding 9 effective records. |
| D32 | Moved high-volume generated artifacts out of versioned docs. |
| D33 | Completed source-available tranche5, bringing managed/effective corpus to 200. |
| D34 | Added selector gate and completed tranche6, bringing managed/effective corpus to 210. |
| D35 | Completed tranche7 with 15 records, bringing managed/effective corpus to 225. |
| D36 | Completed serving-heavy tranche8 with 15 records, bringing managed/effective corpus to 240. |
| D37 | Added B10 source-available/title allowlist/exclude filters and staged 2 RAG-core candidates. |
| D38 | Ran read-only source-available selector pass for tranche9. |
| D39 | Promoted and completed tranche9, adding 14 effective records. |
| D40 | Rejected default-ready tail set and completed 9 near-threshold high-signal records. |
| D41 | Added B10 query override and persist-status filters; staged 2 RAG-core allowlist candidates. |
| D42 | Completed the 2 RAG-core allowlist records and staged 3 test-time exact-title candidates. |
| D43 | Completed the 3 test-time exact-title candidates. |
| D44 | Audited and retagged theory-support set; identified 33-record target gap. |
| D45 | Added source-available theory candidates; marked 19 ready and 2 deferred. |
| D46 | Promoted/completed 6 theory-support records, reaching 23/50 target-qualified theory records. |
| D47 | Staged `CARROT`; test-time theory dry-runs found no clean new candidate. |
| D48 | Completed `CARROT` and `A Relative-Budget Theory`, reaching 29/50 target-qualified theory records. |
| D49 | Completed 6 serving/RAG theory records, reaching 35/50. |
| D50 | Completed 4 serving theory records, reaching 39/50 and closing serving slot. |
| D51 | Completed 4 RAG/test-time/math theory records, reaching 43/50. |
| D52 | Completed 7 exact-title theory records, reaching 50/50 target-qualified theory records. |
| D53 | Read-only preflight showed broad source-backed ready pool was tail-heavy; recommended narrow refill. |
| D54 | Completed 6 balanced RAG/test-time source-backed records, reaching 303 effective records. |
| D55 | Completed 11 source-backed exact-title records, reaching 314 effective records. |
| D56 | Compacted completed documentation logs into this ledger and current-state entrypoint docs. |
| D57 | Completed 12 serving/resource-allocation exact-title records, reaching 326 effective records. |
| D58 | Completed 4 RAG/test-time source-backed duplicate-loop records and one duplicate cleanup, reaching 330 effective records. |
| D59 | Added 8 serving source-backed candidates, promoted/completed 4 high-band records, and deferred 4 medium-band records, reaching 334 effective records. |
| D60 | Completed 6 RAG/test-time direction-balance records and isolated mutually linked duplicate-loop candidates, reaching 340 effective records. |
| D61 | Fixed B11 duplicate-anchor handling and completed 3 newly unblocked RAG/test-time records, reaching 343 effective records. |
| D62 | Ran read-only RAG/test-time source-available selector dry-run; identified 9 clean next-tranche candidates and 3 test-time tail exclusions. |
| D63 | Promoted and completed the D62 clean9 subset, reaching 352 effective records with 0 managed blockers. |
| D64 | Enforced D63 tail exclusions in the selector and completed 11 wide source-available records, reaching 363 effective records. |
| D65 | Refilled the candidate layer with 1 clean source-backed RAG candidate, promoted it as `LIT-0550`, and completed it through `INDEXED`. |
| D66 | Refilled 4 clean test-time exact-ID candidates, promoted them as `LIT-0551`-`LIT-0554`, and completed them through `INDEXED`. |
| D67 | Diagnosed an empty broad selector output, then promoted/completed 4 existing arXiv-backed test-time candidates as `LIT-0555`-`LIT-0558`. |
| D68 | Repaired selector source/tail gating, ran a broad B11 pass, completed 4 source-backed records, and soft-excluded 15 source-failed or non-selector-selected promoted rows. |
| D69 | Refilled the candidate layer with 2 narrow RAG source-backed candidates and validated both as high-band ready in B11 dry-run. |
| D70 | Promoted/completed the 2 D69 RAG records, soft-excluded one TechRxiv 403 source failure, and completed one exact-title test-time balance record, reaching 379 effective records. |
| D71 | Refilled the candidate layer with 2 narrow RAG arXiv-backed candidates and validated both as high-band ready in B11 dry-run. |
| D72 | Promoted/completed the 2 D71 RAG exact-ID records, then staged 3 test-time exact-ID source-backed candidates and validated all 3 as high-band ready in B11 dry-run. |
| D73 | Promoted/completed the 3 D72 test-time exact-ID records, fixed the theory-support count drift, and audited measure/group/math theory support. |
| D74 | Added opt-in math-foundation gates, promoted/completed 4 group/action geometry theory records, and lifted managed/effective corpus to 388. |
| D75 | Repaired narrow test-time strategy scoring, promoted/completed 6 balanced RAG/test-time source-backed records, and lifted managed/effective corpus to 394. |
| D76 | Ran broad then narrow source-backed catalog scouts, curated 5 clean candidates into staging, and validated all 5 as high-band in B11 dry-run. |
| D77 | Test-time small refill scouts found no clean new row; staged `Atom`, promoted/completed D76 plus Atom, and lifted managed/effective corpus to 400. |
| D78 | Ran broad source-backed B10 scaleout, curated 2 clean serving candidates into staging, and validated both as high-band in B11 dry-run. |
| D79 | Promoted/completed the 2 D78 serving clean2 candidates as `LIT-0603`-`LIT-0604`, lifting managed/effective corpus to 402. |
| D80 | Rejected a RAG/test-time broad-scout code-completion tail, then staged 3 exact-arXiv test-time candidates and validated all 3 as high-band in B11 dry-run. |
| D81 | Promoted/completed the 3 D80 test-time exact arXiv candidates as `LIT-0605`-`LIT-0607`, lifting managed/effective corpus to 405. |
| D82 | Ran a wider RAG/test-time source-backed scout, rejected tail rows, staged 2 clean RAG core candidates, and validated both as high-band in B11 dry-run. |
| D83 | Promoted/completed the 2 D82 RAG clean2 candidates as `LIT-0608`-`LIT-0609`, lifting managed/effective corpus to 407. |
| D84 | Ran exploration-only broad scout; no DB writes; produced adjacent-topic shortlist for test-time metareasoning/adaptive compute and RAG budgeted-selection expansion. |
| D85 | Added OpenAlex-ID exact-source B10 and adjacent-theory B11 scoring, staged 17 RAG/test-time candidates, and applied B11 statuses: 11 ready, 6 deferred. |
| D86 | Promoted/completed 6 source-stable D85 theory/strategy records as `LIT-0610`-`LIT-0615`, lifting managed/effective corpus to 413. |
| D87 | Promoted/completed the 5 remaining source-stable D85 theory records as `LIT-0616`-`LIT-0620`, lifting managed/effective corpus to 418. |
| D88 | Ran adjacent-topic broad scout, staged 4 OpenAlex exact-source candidates, and applied B11 statuses: 2 ready, 2 rejected; managed/effective corpus stayed 418. |
| D89 | Promoted/completed the 2 D88 ready RAG/theory candidates as `LIT-0621`-`LIT-0622`, lifting managed/effective corpus to 420. |
| D90 | Ran a broader adjacent-topic scout, staged 4 source-backed exact-source candidates, and applied B11 statuses: 2 ready, 2 deferred; managed/effective corpus stayed 420. |
| D91 | Promoted/completed the 2 D90 RAG-core candidates as `LIT-0623`-`LIT-0624`, lifting managed/effective corpus to 422. |

## Effective-Literature Growth Ledger

| Segment | Added effective records | Managed/effective after segment |
| --- | ---: | ---: |
| Pre-scaleout baseline | - | 144 |
| B11/B12 pilot and blocker cleanup | 19 | 163 |
| Test-time arXiv tranche | 12 | 175 |
| Source-available tranches3-10 | 88 | 263 |
| RAG/test-time allowlists | 5 | 268 |
| Theory-support closure D46-D52 | 29 | 297 |
| D54 balanced source-backed tranche | 6 | 303 |
| D55 source-backed exact-title tranche | 11 | 314 |
| D57 serving/resource-allocation exact-title tranche | 12 | 326 |
| D58 RAG/test-time duplicate-loop rebalance | 4 | 330 |
| D59 serving source-backed curated tranche | 4 | 334 |
| D60 RAG/test-time direction-balance tranche | 6 | 340 |
| D61 duplicate-anchor clean3 tranche | 3 | 343 |
| D63 RAG/test-time clean9 tranche | 9 | 352 |
| D64 wide source-available tranche | 11 | 363 |
| D65 RAG singleton completion | 1 | 364 |
| D66 test-time exact-ID small tranche | 4 | 368 |
| D67 test-time existing source-backed tranche | 4 | 372 |
| D68 source/tail-gated broad selector apply | 4 | 376 |
| D70 RAG plus test-time direction balance | 3 | 379 |
| D72 D71 RAG exact-ID completion | 2 | 381 |
| D73 D72 test-time exact-ID completion | 3 | 384 |
| D74 math-theory group/action completion | 4 | 388 |
| D75 balanced RAG/test-time exact-title completion | 6 | 394 |
| D76 candidate-layer catalog expansion | 0 | 394 |
| D77 D76 curated catalog plus Atom completion | 6 | 400 |
| D78 candidate-layer serving clean2 expansion | 0 | 400 |
| D79 D78 serving clean2 completion | 2 | 402 |
| D80 candidate-layer exact-arXiv test-time expansion | 0 | 402 |
| D81 D80 test-time exact arXiv completion | 3 | 405 |
| D82 candidate-layer RAG clean2 expansion | 0 | 405 |
| D83 D82 RAG clean2 completion | 2 | 407 |
| D84 exploration-only broad scout | 0 | 407 |
| D85 candidate-layer RAG/test-time theory refill | 0 | 407 |
| D86 D85 theory/strategy source-stable completion | 6 | 413 |
| D87 D85 remaining theory source-stable completion | 5 | 418 |
| D88 adjacent-topic candidate-layer refill | 0 | 418 |
| D89 D88 ready RAG/theory completion | 2 | 420 |
| D90 adjacent-topic candidate-layer refill | 0 | 420 |
| D91 D90 RAG-core completion | 2 | 422 |

## Source-Backed Current Pattern
- B10:
  - use exact-title, source-backed, or exact arXiv-ID query overrides.
  - use OpenAlex-ID exact-source queries for curated adjacent-topic shortlist applies.
  - persist only `DISCOVERED` rows for curated applies.
  - keep broad provider failures diagnostic.
  - treat B10 refill as candidate-layer growth unless B11/B12 subsequently promotes and indexes the records.
- B11:
  - dry-run first.
  - promote only high-band clean candidates.
  - avoid default-ready application-tail candidates.
  - treat chart/table/text-to-image/test-time-finetuning test-time papers as tail unless explicitly needed.
  - for DOI-heavy broad pools, require a likely PDF URL and exclude blocked hosts currently known to fail B12 acquisition: `direct.mit.edu`, `dl.acm.org`, `www.mdpi.com`, and `mdpi.com`.
- B12:
  - acquire rights-safe fulltext.
  - preprocess fulltext.
  - import source-grounded `codex_curated` dossiers.
  - run chunk/embed/index backfill.
  - confirm final state and B13 counts.

## Evidence Roots
- Current generated evidence root:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`
- Current D91 completion evidence:
  - `20260610T-d91-before-promote.json`
  - `20260610T-d91-d90-rag-core-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d91-d90-rag-core-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d91-d90-rag-core-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d91-d90-rag-core-acquisition-dry-run-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d91-d90-rag-core-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d91-d90-rag-core-post-acquisition-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d91-d90-rag-core-indexed-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d91-d90-rag-core-final-state-dry-run-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d91-after-b12.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d91-d90-rag-core-key-content-apply-key-content-curated-apply.json`
- Current D90 candidate-layer evidence:
  - `20260610T-d90-before-b10.json`
  - `20260610T-d90-adjacent-broad-scout-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d90-adjacent-clean6-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d90-adjacent-clean6-apply-b10-candidate-discovery-report.json`
  - `20260610T-d90-adjacent-clean6-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d90-adjacent-clean6-b11-apply-b11-candidate-triage-report.json`
  - `20260610T-d90-after-b10-b11.json`
- Current D89 completion evidence:
  - `20260610T-d89-before-promote.json`
  - `20260610T-d89-d88-ready-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d89-d88-ready-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d89-d88-ready-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d89-d88-ready-acquisition-dry-run-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d89-d88-ready-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d89-d88-ready-post-acquisition-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d89-d88-ready-indexed-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d89-d88-ready-final-state-dry-run-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d89-after-b12.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d89-d88-ready-key-content-apply-key-content-curated-apply.json`
- Current D88 candidate-layer evidence:
  - `20260610T-d88-adjacent-broad-scout-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d88-adjacent-clean4-source-audit.json`
  - `20260610T-d88-adjacent-clean4-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d88-adjacent-clean4-apply-b10-candidate-discovery-report.json`
  - `20260610T-d88-adjacent-clean4-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d88-adjacent-clean4-b11-apply-b11-candidate-triage-report.json`
  - `20260610T-d88-after-b10-b11.json`
- Current D87 completion evidence:
  - `20260610T-d87-d85-theory-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d87-d85-theory-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d87-d85-theory-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d87-d85-theory-post-acquisition-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d87-d85-theory-indexed-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d87-d85-theory-final-state-dry-run-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d87-after-b12.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d87-d85-theory-key-content-apply-key-content-curated-apply.json`
- Current D86 completion evidence:
  - `20260610T-d86-d85-theory-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d86-d85-theory-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d86-d85-theory-post-acquisition-standard-apply-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d86-d85-theory-indexed-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d86-d85-theory-final-state-dry-run-b12-standard-pipeline-pilot-report.json`
  - `20260610T-d86-after-b12.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d86-d85-theory-key-content-apply-key-content-curated-apply.json`
- Current D68 final count artifact:
  - `20260609T-after-d68-current-sourceavailable.json`
- Current D68 selector evidence:
  - `20260609T-d68-current-broad-source-available-selector-final-host-gated-dry-run-b11-source-available-selector.json`
- Current D68 B12 completion evidence:
  - `20260609T-d68-broad-selector-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260609T-d68-current-sourceavailable-b12-index-apply-b12-content-backfill-pilot-report.json`
- Current D69 B10 refill evidence:
  - `20260609T-d69-narrow-rag-sourcebacked-refill-apply-b10-candidate-discovery-report.json`
  - `20260609T-d69-narrow-rag-sourcebacked-b11-dry-run-b11-candidate-triage-report.json`
  - `20260609T-after-d69-narrow-b10-refill.json`
- Current D70 completion evidence:
  - `20260610T-d70-d69-rag-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d70-d69-rag-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d70-testtime-sample-compute-allocation-apply-b10-candidate-discovery-report.json`
  - `20260610T-d70-testtime-sample-compute-allocation-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d70-testtime-sample-compute-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-after-d70-final-balanced.json`
- Current D71 B10 refill evidence:
  - `20260610T-d71-rag-testtime-narrow-sourcebacked-scout-b10-candidate-discovery-report.json`
  - `20260610T-d71-rag-testtime-exact-id-sourcebacked-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d71-rag-exact-id-sourcebacked-apply-b10-candidate-discovery-report.json`
  - `20260610T-d71-rag-exact-id-sourcebacked-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-after-d71-rag-sourcebacked-refill.json`
- Current D72 completion/refill evidence:
  - `20260610T-d72-d71-rag-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d72-rag-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d72-rag-dossier-apply-key-content-curated-apply.json`
  - `20260610T-d72-testtime-exact-id-sourcebacked-apply-b10-candidate-discovery-report.json`
  - `20260610T-d72-testtime-exact-id-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-after-d72-final-testtime-refill.json`
  - `20260610T-d72-live-final-count.json`
- Current D73 completion/math-audit evidence:
  - `20260610T-d73-d72-testtime-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d73-testtime-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d73-testtime-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d73-testtime-dossier-apply-key-content-curated-apply.json`
  - `20260610T-d73-after-testtime-promotion-final-count.json`
  - `.ai/.tmp/literature-scaleout-corpus-strategy/20260610T-d73-math-theory-support-audit.json`
- Current D74 completion/math-theory evidence:
  - `20260610T-d74-math-theory-openalex-exact-title-apply-b10-candidate-discovery-report.json`
  - `20260610T-d74-math-theory-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d74-math-theory-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d74-math-theory-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d74-math-theory-dossier-apply-key-content-curated-apply.json`
  - `20260610T-d74-after-math-theory-final-count.json`
  - `.ai/.tmp/literature-scaleout-corpus-strategy/20260610T-d74-math-theory-support-audit.json`
- Current D75 completion evidence:
  - `20260610T-d75-rag-testtime-exact-title-apply-b10-candidate-discovery-report.json`
  - `20260610T-d75-rag-testtime-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d75-rag-testtime-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d75-rag-testtime-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d75-rag-testtime-dossier-apply-key-content-curated-apply.json`
  - `20260610T-d75-after-rag-testtime-final-count.json`
- Current D76 candidate-layer expansion evidence:
  - `20260610T-d76-broad-catalog-expansion-scout-b10-candidate-discovery-report.json`
  - `20260610T-d76-rag-testtime-narrow-catalog-scout-b10-candidate-discovery-report.json`
  - `20260610T-d76-curated-catalog-expansion-apply-b10-candidate-discovery-report.json`
  - `20260610T-d76-curated-catalog-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d76-after-curated-catalog-count.json`
- Current D77 refill/completion evidence:
  - `20260610T-d77-testtime-foundation-exact-source-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d77-testtime-arxiv-search-scout-b10-candidate-discovery-report.json`
  - `20260610T-d77-serving-atom-exact-source-apply-b10-candidate-discovery-report.json`
  - `20260610T-d77-d76-plus-atom-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d77-serving-rag-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d77-serving-rag-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d77-serving-rag-dossier-apply-key-content-curated-apply.json`
  - `20260610T-d77-after-serving-rag-final-count.json`
- Current D78 candidate-layer expansion evidence:
  - `20260610T-d78-broad-sourcebacked-scaleout-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d78-serving-clean2-curated-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d78-serving-clean2-curated-apply-b10-candidate-discovery-report.json`
  - `20260610T-d78-serving-clean2-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d78-after-b10-serving-clean2-count.json`
- Current D79 completion evidence:
  - `20260610T-d79-d78-serving-clean2-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d79-serving-clean2-b12-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d79-serving-clean2-b12-index-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d79-serving-clean2-final-state-probe.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d79-serving-clean2-dossier-apply-key-content-curated-apply.json`
  - `20260610T-d79-after-serving-clean2-final-count.json`
- Current D80 candidate-layer expansion evidence:
  - `20260610T-d80-rag-testtime-sourcebacked-scout-b10-candidate-discovery-report.json`
  - `20260610T-d80-rag-testtime-exact-arxiv-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d80-rag-testtime-exact-arxiv-apply-b10-candidate-discovery-report.json`
  - `20260610T-d80-rag-testtime-exact-arxiv-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d80-after-rag-testtime-exact-arxiv-count.json`
- Current D81 completion evidence:
  - `20260610T-d81-d80-testtime-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d81-d80-testtime-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d81-d80-testtime-backfill-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d81-d80-testtime-final-state-probe-b12-standard-pipeline-pilot-report.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d81-d80-testtime-dossier-apply-key-content-curated-apply.json`
  - `20260610T-d81-after-d80-testtime-completion-count.json`
- Current D82 candidate-layer expansion evidence:
  - `20260610T-d82-before-rag-testtime-scaleout.json`
  - `20260610T-d82-rag-testtime-wide-sourcebacked-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-testtime-arxiv-curated-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-testtime-exact-title-dry-run-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-clean2-curated-apply-b10-candidate-discovery-report.json`
  - `20260610T-d82-rag-clean2-b11-dry-run-b11-candidate-triage-report.json`
  - `20260610T-d82-after-rag-clean2-b10-refill.json`
- Current D83 completion evidence:
  - `20260610T-d83-d82-rag-clean2-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260610T-d83-d82-rag-clean2-acquisition-apply-b12-fulltext-acquisition-pilot-report.json`
  - `20260610T-d83-d82-rag-clean2-backfill-apply-b12-content-backfill-pilot-report.json`
  - `20260610T-d83-d82-rag-clean2-final-state-probe-b12-standard-pipeline-pilot-report.json`
  - `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/artifacts/20260610T-d83-d82-rag-clean2-dossier-apply-key-content-curated-apply.json`
  - `20260610T-d83-after-d82-rag-clean2-completion-count.json`
- Current D64 selector evidence:
  - `20260608T-d64-wide-source-available-selector-dry-run-b11-source-available-selector.json`
- Current D65 B10 refill evidence:
  - `20260608T-d65-rag-testtime-arxiv-id-refill-apply-b10-candidate-discovery-report.json`
  - `20260608T-d65-rag-testtime-b10-refill-b11-dry-run-b11-candidate-triage-report.json`
- Recent D67 promotion evidence:
  - `20260609T-d67-testtime-existing-sourcebacked-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260609T-d67-testtime-existing-sourcebacked-dossier-key-content-curated-key-content-curated-apply.json`
- Current D53 selector preflight:
  - `20260608T-d53-readonly-preflight-summary.json`
- Current theory target closure:
  - `20260608T-after-d52-theory-target-state.json`

# 10 Scaleout Run Ledger

## Purpose
- Compact index of completed T-122 decisions and collection rounds.
- Detailed generated evidence lives under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Expanded historical logs remain available in git history before the D56 documentation cleanup.

## Current Checkpoint
- Latest corpus checkpoint: after D65 RAG singleton B11/B12 completion.
- Latest candidate checkpoint: after D65 narrow RAG/test-time source-backed B10 refill.
- Candidate pool: 609.
- Managed corpus: 364.
- Effective literature: 364.
- Managed pipeline incomplete/blocker/not-started: 0/0/0.
- Theory-support target: 50/50 target-qualified records.

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

## Source-Backed Current Pattern
- B10:
  - use exact-title, source-backed, or exact arXiv-ID query overrides.
  - persist only `DISCOVERED` rows for curated applies.
  - keep broad provider failures diagnostic.
  - treat B10 refill as candidate-layer growth unless B11/B12 subsequently promotes and indexes the records.
- B11:
  - dry-run first.
  - promote only high-band clean candidates.
  - avoid default-ready application-tail candidates.
  - treat chart/table/text-to-image/test-time-finetuning test-time papers as tail unless explicitly needed.
- B12:
  - acquire rights-safe fulltext.
  - preprocess fulltext.
  - import source-grounded `codex_curated` dossiers.
  - run chunk/embed/index backfill.
  - confirm final state and B13 counts.

## Evidence Roots
- Current generated evidence root:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`
- Current D65 final count artifact:
  - `20260608T-after-d65-rag-singleton-promote-b12-count.json`
- Current D65 final state evidence:
  - `20260608T-after-d65-rag-singleton-b12-index-state.json`
  - `20260608T-d65-rag-singleton-b12-index-apply-b12-content-backfill-pilot-report.json`
- Current D64 selector evidence:
  - `20260608T-d64-wide-source-available-selector-dry-run-b11-source-available-selector.json`
- Current D65 B10 refill evidence:
  - `20260608T-d65-rag-testtime-arxiv-id-refill-apply-b10-candidate-discovery-report.json`
  - `20260608T-d65-rag-testtime-b10-refill-b11-dry-run-b11-candidate-triage-report.json`
- Current D65 promotion evidence:
  - `20260608T-d65-rag-singleton-b11-apply-promote-b11-candidate-triage-report.json`
  - `20260608T-d65-rag-singleton-dossier-key-content-curated-apply.json`
- Current D53 selector preflight:
  - `20260608T-d53-readonly-preflight-summary.json`
- Current theory target closure:
  - `20260608T-after-d52-theory-target-state.json`

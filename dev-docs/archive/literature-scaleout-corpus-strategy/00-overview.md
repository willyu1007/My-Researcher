# 00 Overview

## Status
- State: done
- Current task: `T-122 literature-scaleout-corpus-strategy`.
- Origin task: `T-120`.
- Related track: `T-121` is the pgvector/retrieval track, not the origin package.
- Closure: superseded by `T-125` and `T-126` collection execution.
- Final downstream-ready corpus is governed by `T-126` D56: 1540 retrieval-ready records after semantic quality quarantine.

## Goal
- Build a lightweight literature candidate layer for large-scale collection across:
  - RAG-aware resource allocation / adaptive retrieval-compute allocation.
  - LLM serving scheduling and resource allocation.
  - Test-time compute budgeting.
- Keep broad external discovery out of `LiteratureRecord` until B11 promotion.
- Preserve a strict counting split between candidate pool, managed corpus, and effective literature.
- Let B12 completion, not promotion alone, define effective literature.

## Final T-122 Baseline

| Metric | Value |
| --- | ---: |
| Candidate batches | 34 |
| Candidate pool records | 674 |
| Candidate `READY_FOR_PROMOTION` records | 77 |
| Managed adaptive corpus | 431 |
| Effective literature | 431 |
| Incomplete managed records | 0 |
| Pipeline blockers | 0 |

## Theory-Support Closure
- Original target-qualified theory-support set closed above target at 54/50.
- Effective `collection:theory-support` records: 62.
- Math-support coverage included measure/information, group/action geometry, metric/high-dimensional geometry, submodular and budgeted selection, bandits/stopping/online allocation, and queueing/scheduling.
- Recency policy: math theory support is canonicality-first, not recency-first.

## Implemented Pipeline Model
- B10 candidate discovery writes `LiteratureDiscoveryBatch` and `LiteratureDiscoveryCandidate`, not `LiteratureRecord`.
- B11 candidate triage/promote is the authoritative promotion and deduplication boundary.
- B12 standard pipeline completes citation, abstract, fulltext, curated key content, chunking, embedding, and indexing.
- B13 counting reports candidate, managed, effective, blocked, not-started, and excluded counts separately.

## Archive Hygiene
- Generated run JSON, dry-run outputs, and append-only progress ledgers were intentionally removed during archive cleanup.
- This archived package keeps only compact context needed to understand the task lineage and final outcome.

## Key Documents
- Plan: `01-plan.md`
- Architecture: `02-architecture.md`
- Implementation notes: `03-implementation-notes.md`
- Verification: `04-verification.md`
- Pitfalls: `05-pitfalls.md`
- Counting contract: `06-counting-contract.md`

## Acceptance Criteria
- [x] Layered corpus model is documented and accepted as the scaleout target.
- [x] Candidate pool staging schema is designed and applied to local dev.
- [x] B10/B11/B12/B13 operating model is documented.
- [x] Source-backed B10/B11/B12 tranches can move candidates to effective literature with 0 managed blockers.
- [x] Theory-support target is closed above target at 54/50 target-qualified records.
- [x] Later T-126 quality closure supersedes this package as the final corpus state.

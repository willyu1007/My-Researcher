# 00 Overview

## Status
- State: in-progress
- Current task: `T-122 literature-scaleout-corpus-strategy`.
- Origin task: `T-120`.
- Related track: `T-121` is the pgvector/retrieval track, not the origin package.
- Latest completed collection checkpoint: D64 wide source-available B11/B12 tranche.
- Latest cleanup checkpoint: D56 documentation compaction, replacing append-only historical logs with compact ledgers.
- Next decision: refill RAG/test-time candidates with narrower source-backed queries before the next apply.

## Goal
- Build a lightweight literature candidate layer for large-scale collection across:
  - RAG-aware resource allocation / adaptive retrieval-compute allocation.
  - LLM serving scheduling and resource allocation.
  - Test-time compute budgeting.
- Keep broad external discovery out of `LiteratureRecord` until B11 promotion.
- Preserve a strict counting split between candidate pool, managed corpus, and effective literature.
- Let B12 completion, not promotion alone, define effective literature.

## Current Baseline

| Metric | Current value |
| --- | ---: |
| Candidate batches | 16 |
| Candidate pool records | 608 |
| Candidate `DISCOVERED` records | 216 |
| Candidate `READY_FOR_PROMOTION` records | 14 |
| Candidate `PROMOTED` records | 220 |
| Candidate `DUPLICATE` records | 139 |
| Candidate `DEFERRED` records | 15 |
| Candidate `REJECTED` records | 4 |
| Managed adaptive corpus | 363 |
| Effective literature | 363 |
| Incomplete managed records | 0 |
| Pipeline blockers | 0 |
| Pipeline not-started records | 0 |
| Excluded non-corpus records | 9 |
| Raw DB literature records | 372 |

Current evidence artifact:
- `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d64-wide-source-available-final-count.json`

## Theory-Support Target
- Target-qualified theory-support set is closed at 50/50.
- Effective `collection:theory-support` records: 52.
- Scope-borderline theory-support records excluded from the target count: `LIT-0259`, `LIT-0260`.
- Target slot state:

| Slot | Current |
| --- | ---: |
| Math foundation | 12/12 |
| RAG allocation | 13/13 |
| Test-time budget | 13/13 |
| Serving scheduling | 12/12 |

## Soft Exclusions
- Soft-excluded source-access records remain out of managed/effective progress metrics:
  - `LIT-0163`: no rights-safe automatically downloadable fulltext found.
  - `LIT-0166`: no rights-safe automatically downloadable fulltext found; earlier arXiv match was a false source.
  - `LIT-0257`: book record with no rights-safe fulltext source.
- Do not delete these records in this task; they are excluded by classification tags.

## Target Model

| Layer | Target size | Purpose | Minimum requirement |
| --- | ---: | --- | --- |
| Candidate pool | 5000-8000 | Broad discovery, trend scan, citation expansion | Metadata, abstract, source provenance |
| Managed pipeline corpus | 2000-2500 | Promoted papers under formal literature management | `LiteratureRecord`, direction/role tags, pipeline state |
| Effective literature | 800-1000 | Papers that completed the standard collection pipeline | All standard stages through `INDEXED=SUCCEEDED` |

## Implemented Pipeline
- B10 candidate discovery:
  - writes `LiteratureDiscoveryBatch` and `LiteratureDiscoveryCandidate`.
  - does not write `LiteratureRecord`.
  - uses lightweight obvious duplicate guards only.
- B11 candidate triage/promote:
  - scores candidates and updates staging status.
  - promotes accepted candidates through the existing `LiteratureService.collectionImport` path.
  - remains the authoritative deduplication boundary.
- B12 standard pipeline:
  - completes citation, abstract, fulltext, curated key-content, chunking, embedding, and indexing.
  - defaults key-content to `codex_curated`.
  - keeps `llm_gateway` extraction explicit-only.
- B13 counting:
  - reports candidate, managed, effective, blocked, not-started, and excluded counts separately.

## Operating Rules
- Treat 5000-level scale as candidate-pool scale, not full-pipeline scale.
- Do not import broad candidates directly into `LiteratureRecord`.
- Do not count candidate rows as managed or effective literature.
- Do not count promoted records as effective until all standard stages through `INDEXED` succeed.
- Prefer source-backed promotion tranches when the goal is fast effective-literature growth.
- Use broad B10 expansion for recall, then B11/B12 only on clean source-backed subsets.
- Keep generated run artifacts under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Keep versioned task docs as compact decision and evidence indexes, not raw append-only logs.

## Key Documents
- Architecture: `02-architecture.md`
- Implementation notes: `03-implementation-notes.md`
- Verification: `04-verification.md`
- Counting contract: `06-counting-contract.md`
- B10 discovery entrypoint: `07-b10-candidate-discovery.md`
- B11 triage/promote entrypoint: `08-b11-candidate-triage-promote.md`
- B12 standard pipeline entrypoint: `09-b12-standard-pipeline-pilot.md`
- Completed round ledger: `10-scaleout-run-ledger.md`

## Scope
- Define and operate candidate staging before full corpus promotion.
- Define automatic triage from candidate pool into managed literature.
- Define controlled B12 promotion from managed literature into effective literature.
- Define layered deduplication between B10 candidate staging and B11 promotion.
- Define updated counting conventions for candidate, managed, effective, blocked, and non-corpus records.
- Continue small source-backed tranches until the quality pattern is stable enough for larger B11/B12 batches.

## Non-goals
- Do not fulltext-process or index all candidate-pool records.
- Do not apply unrelated live DB drift as part of candidate-layer work.
- Do not run staging/prod database writes without a separate target-environment checkpoint.
- Do not weaken the full standard pipeline gate for effective literature.
- Do not mix historical system evidence rows into literature-progress metrics.
- Do not delete historical non-corpus records in this task.

## Acceptance Criteria
- [x] Layered corpus model is documented and accepted as the scaleout target.
- [x] Candidate pool staging schema is designed and applied to local dev.
- [x] B10 candidate discovery entrypoint exists with dry-run/apply, artifacts, and candidate staging writes.
- [x] B11 triage/promote entrypoint exists with dry-run/apply/promote and promotion-time dedup.
- [x] B12 standard pipeline, fulltext acquisition, and content backfill entrypoints exist.
- [x] Default B12 key-content path is `codex_curated`; provider extraction is explicit-only.
- [x] B13 counting convention separates candidate, managed, effective, blocked, not-started, and non-corpus metrics.
- [x] Source-backed B10/B11/B12 tranches can move candidates to effective literature with 0 managed blockers.
- [x] Theory-support target is closed at 50/50 target-qualified records.
- [ ] B10 broad discovery is scaled from hundreds toward 5000-8000 candidate-pool records.
- [ ] B11 promotion is scaled from small tranches toward 200-300 managed-corpus promotions per run.
- [ ] B12 completion is scaled from small tranches toward 80-120 effective-literature completions per run.

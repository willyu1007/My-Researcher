# 00 Overview

## Status
- State: done
- Current task: `T-125 literature-balanced-corpus-scaleout-v2`.
- Origin task: `T-120`.
- Follows: `T-122 literature-scaleout-corpus-strategy`.
- Closure: superseded by `T-126` final corpus expansion and D56 semantic quality treatment.
- No further T-125 collection, refill, promote, or B12 work is required.

## Goal
Run the next literature collection phase with a realistic scale target, faster effective-corpus growth, and a broader coverage matrix that protects innovation-oriented discovery.

V2 focused on:
- growing effective literature beyond the T-122 baseline.
- preserving the candidate / managed / effective counting split.
- keeping managed blockers at 0 steady-state.
- increasing batch size without weakening source and B12 gates.
- explicitly covering adjacent topics and theory-support axes.

## Starting Baseline

| Metric | Value |
| --- | ---: |
| Candidate pool records | 674 |
| Candidate `READY_FOR_PROMOTION` records | 77 |
| Managed corpus | 431 |
| Effective literature | 431 |
| Managed incomplete records | 0 |
| Managed blockers | 0 |

## Final T-125 Closure

| Metric | Value |
| --- | ---: |
| Managed/effective literature after broad T-125 work | 910 |
| Managed incomplete records | 0 |
| Managed blockers | 0 |
| Remaining source-stable promotable READY after post-continuation closure | 0 |

T-125 then handed off to `T-126`, which completed the larger 1500-record objective and final semantic-quality treatment.

## Collection Matrix
- Primary directions:
  - RAG-aware resource allocation / adaptive retrieval-compute allocation.
  - LLM serving scheduling and resource allocation.
  - Test-time compute budgeting.
- Paper roles:
  - core mechanism paper.
  - system support.
  - strategy support.
  - theory support.
  - adjacent inspiration.
- Theory coverage:
  - optimization, submodular selection, bandits, stopping, online allocation.
  - queueing, scheduling, admission control, resource contention.
  - information theory, measure/probability, decision theory, bounded rationality.
  - metric/high-dimensional geometry, group actions, equivariance where useful.

## Archive Hygiene
- Per-round exact-source catalogs, dry-run reports, apply summaries, and B12 completion logs were intentionally removed during archive cleanup.
- This archived package keeps only the task boundary, collection matrix, decisions, and final handoff state.

## Key Documents
- Plan: `01-plan.md`
- Architecture: `02-architecture.md`
- Implementation notes: `03-implementation-notes.md`
- Verification: `04-verification.md`
- Pitfalls: `05-pitfalls.md`
- Collection matrix: `06-collection-matrix.md`
- Tool inheritance: `07-tool-inheritance.md`
- Decisions: `08-decisions.md`

## Acceptance Criteria
- [x] T-122 baseline is extended through a broader, faster T-125 collection loop.
- [x] Candidate / managed / effective counting remains separated.
- [x] Source-backed promote/B12 tranches maintain 0 managed blockers.
- [x] Post-continuation closure recommends stopping broad T-125 collection.
- [x] T-126 supersedes this package as the final corpus-quality authority.

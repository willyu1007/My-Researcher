# 00 Overview

## Status
- State: done
- Current task: `T-126 literature-rag-frontier-tech-radar`.
- Origin task: `T-120`.
- Follows: `T-122 literature-scaleout-corpus-strategy` and `T-125 literature-balanced-corpus-scaleout-v2`.
- Closure: D56 post-closure semantic quality treatment has been applied.
- No further collection, promotion, or B12 work is required for this objective.

## Goal
Collect a RAG-centered frontier LLM technology radar and make it consumable by downstream topic-selection, experiment-foundation, and paper-implementation workflows.

The corpus emphasized:
- agentic and adaptive RAG.
- GraphRAG and structured evidence.
- context, memory, and evidence-budget methods.
- RAG-serving and efficient retrieval systems.
- long-term memory compression, context management, and token efficiency.
- pure-math/formal theory that satisfies the repository's theory classification requirements; RAG mapping was optional.

## Starting Baseline
- Effective literature before D1 cleanup: 910.
- Effective literature after D1 cleanup: 901.
- Managed blockers: 0.
- Candidate pool: 1205.
- Remaining source-stable READY: 0.
- Strict `normalizedTitle + year` duplicate groups after D1: 0.
- Title-only duplicate groups after D1: 0.

## Final Corpus State

| Metric | Value |
| --- | ---: |
| Managed/effective records before semantic quarantine | 1595 |
| Same-work duplicate clusters confirmed | 1 |
| Records quarantined as semantic-neighbor / low-value-tail | 55 |
| Retrieval-ready records after D56 | 1540 |
| Managed incomplete records in retrieval-ready set | 0 |
| Effective arXiv duplicate groups | 0 |
| Effective title/year duplicate groups | 0 |

## Final Lane Reconciliation

| Lane | Final |
| --- | ---: |
| memory/context/token | 220/220 |
| pure math/formal theory | 125/125 |
| RAG core | 80/80 |
| serving/retrieval/rerank/cache | 55/55 |
| agentic/test-time/frontier LLM | 56/56 |

## Quality Treatment
- Confirmed same-work cluster: `LIT-0653` / `LIT-1131`.
- Representative record kept: `LIT-0653`.
- Quarantined records were marked `qualityStatus=needs_review`.
- Retrieval-ready corpus remains above the 1500 target after quarantine.

## Archive Hygiene
- Exact-source catalogs, dry-run summaries, apply ledgers, B12 run details, and generated JSON were intentionally removed during archive cleanup.
- This archived package keeps only compact task context, final radar synthesis, the 1500 expansion plan, final closure status, and semantic quality treatment.

## Key Documents
- Plan: `01-plan.md`
- Architecture: `02-architecture.md`
- Implementation notes: `03-implementation-notes.md`
- Verification: `04-verification.md`
- Pitfalls: `05-pitfalls.md`
- Radar synthesis: `13-d9-radar-synthesis.md`
- Main-corpus expansion plan: `22-d18-main-corpus-1500-expansion-plan.md`
- Final closure live status: `61-d28-final-closure-live-status.md`
- Semantic quality treatment: `62-d56-semantic-quality-treatment.md`

## Acceptance Criteria
- [x] Corpus reaches at least 1500 retrieval-ready records after semantic-quality quarantine.
- [x] All retrieval-ready records complete required collection stages through `INDEXED`.
- [x] Confirmed duplicate and medium-risk semantic-neighbor issues are quarantined from the retrieval-ready set.
- [x] Pure math/formal theory capacity meets the requested lane requirement.
- [x] RAG/frontier LLM radar is available for downstream topic-selection and corpus use.

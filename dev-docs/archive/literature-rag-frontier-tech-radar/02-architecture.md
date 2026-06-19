# 02 Architecture

## Boundaries

| Area | Owner | Notes |
| --- | --- | --- |
| Candidate discovery | T-122/T-125 B10 tooling | Reuse exact-source and dry-run gates. |
| Candidate triage/promotion | T-122/T-125 B11 tooling | B11 remains the dedup and promotion boundary. |
| Completion | T-122/T-125 B12 tooling | Standard/acquisition/key-content/index sequence remains unchanged. |
| Radar planning | T-126 | New task owns RAG-centered frontier scope and catalog design. |
| DB schema | Out of scope | No schema changes unless a concrete blocker appears. |

## Collection Shape
T-126 is a focused radar, not a broad scaleout loop.

Primary axes:
- RAG technique frontier.
- evidence structure and retrieval control.
- context/memory/evidence budgets.
- RAG serving and retrieval systems.
- formal theory mapped to RAG.

## D2 Catalog Chunking
The D2 catalog uses five 20-row exact-source chunks to respect B10's per-track `B10_QUERY_LIMIT` ceiling:
- `rag-agentic-adaptive`.
- `rag-structured-graphrag`.
- `rag-context-memory-evidence-budget`.
- `frontier-llm-loose-rag`.
- `formal-theory-rag-mapping`.

Each catalog row carries:
- exact arXiv ID.
- source and PDF URLs.
- lane and B10 track mapping.
- RAG link strength: `direct`, `loose`, or `formal_mapping`.
- local duplicate check result.
- mapping card for formal or loose-adjacent rows.

## Pure-Math / Formal-Theory Carryover
Earlier tasks explicitly require canonical formal tools:
- measure / probability / risk.
- topology / metric / high-dimensional geometry.
- group action / quotient space / equivariance.
- lattice / ultrametric / hierarchy.
- submodular / knapsack / constrained optimization.
- bandit / MDP / optimal stopping.
- queueing / online scheduling.

Admission rule:
- accept pure math only with a concrete mapping card to retrieval, evidence selection, context packing, chunk equivalence, routing, or budget allocation.

## DB Cleanup Boundary
Duplicate cleanup is destructive when hard-deleting `LiteratureRecord` rows because related sources, assets, fulltext documents, embeddings, and pipeline records cascade.

Therefore:
- dry-run first.
- preserve useful source URLs on canonical records where needed.
- require explicit DB apply approval.
- verify duplicate groups and corpus quality after apply.

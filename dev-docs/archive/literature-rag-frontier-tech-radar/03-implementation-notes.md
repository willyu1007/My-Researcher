# 03 Implementation Notes

## Execution Shape
- T-126 shifted from balanced scaleout to a RAG-centered frontier LLM technology radar plus a downstream-consumable corpus.
- Collection lanes included direct RAG, serving/retrieval/rerank/cache, memory/context/token efficiency, agentic/test-time/frontier LLM, and pure math/formal theory.
- Pure math/formal theory was allowed to be independent of RAG when it satisfied the repository's theory classification requirements.
- Long-context, memory compression, context management, and token-efficiency papers were added as a major adjacent lane.

## Quality Controls
- DB writes remained gated through B10 apply, B11 status apply, B11 promote, and B12 completion boundaries.
- Candidate rows were not treated as corpus records.
- Effective corpus required successful completion through `INDEXED`.
- Post-closure semantic treatment quarantined confirmed same-work and medium-risk semantic-neighbor / low-value-tail records from the retrieval-ready set.

## Final Outcome
- Final retrieval-ready corpus after quarantine: 1540 records.
- Pipeline completeness for retrieval-ready records: all required stages through `INDEXED`.
- Duplicate gates for retrieval-ready records: 0 arXiv, DOI, normalized title/year, and title-authors-year duplicate groups.

## Archive Cleanup
- Per-run scripts, exact-source catalogs, dry-run outputs, apply reports, B12 reports, and generated artifact paths were removed.
- The archive keeps only compact handoff documents and final quality evidence.

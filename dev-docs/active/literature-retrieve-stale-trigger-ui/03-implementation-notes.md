# 03 Implementation Notes

## Log
- 2026-05-05: Created child task from `T-030` for retrieve profiles, stale propagation, and trigger UI.
- 2026-05-05: Added shared/API retrieve profile contract and response provenance fields: profile, chunk type, source refs, metadata, score breakdown, degraded mode, and freshness warnings.
- 2026-05-05: Updated retrieval to use active OpenAI provider/model/dimension for query embeddings, with lexical/token degradation when query embedding cannot be produced.
- 2026-05-05: Added stale warning propagation for active `INDEXED` versions. Stale indexes remain readable but return response/UI freshness warnings.
- 2026-05-05: Updated desktop overview to surface `STALE` stage reasons next to existing explicit single-literature actions.

## Open Decisions
- Closed for v1: first profile weights are deterministic and live in `LiteratureRetrievalService`.
- Deferred: diversity/rerank policy and any optional LLM reranker remain future product tuning, not needed for the v1 cutover.

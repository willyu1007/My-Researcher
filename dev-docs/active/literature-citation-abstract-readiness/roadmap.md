# Literature Citation And Abstract Readiness Roadmap

## Goal
- Make citation normalization and abstract readiness reliable enough to anchor the rest of the content-processing chain.

## Milestones
1. Inventory current citation/abstract behavior.
2. Define normalized citation and abstract payload contracts.
3. Decide artifact vs DB persistence boundary through DB SSOT if needed.
4. Implement deterministic citation and abstract services behind explicit content-processing runs.
5. Verify downstream stale propagation and input contracts.

## Implementation Principles
- Citation identity is deterministic and script-led.
- Abstract readiness prioritizes trusted source text over generated summaries.
- These stages are early content-processing stages, not collection responsibilities.
- Their outputs must be stable, source-aware, and checksum-addressable for downstream tasks.

## Handoff To Later Stages
- `FULLTEXT_PREPROCESSED` can use citation identity for asset metadata and references.
- `KEY_CONTENT_READY` can use abstract payload as a high-trust short input.
- `CHUNKED` can create one `abstract` chunk with explicit source metadata.
- Retrieval can show citation/abstract provenance in results and freshness warnings.

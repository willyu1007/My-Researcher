# 01 Plan

## Phase A - Inventory
- Inspect current chunking, embedding artifact, embedding version, token index, and retrieval readers.

## Phase B - Chunker
- Implement flat chunk types and classification metadata.
- Preserve source refs and stable ids.

## Phase C - Embedding
- Integrate provider settings.
- Batch OpenAI embedding calls.
- Persist embedding version and per-chunk vectors.

## Phase D - Index
- Build local vector/token/metadata indexes.
- Activate active pointer after smoke retrieval.

## Phase E - Verification Baseline
- Chunk determinism tests.
- Provider mock tests.
- Version lifecycle tests.
- Index activation/rollback tests.
- 10,000-paper storage estimate test or benchmark script.

# 00 Overview

## Status
- State: done
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: use active indexed versions from retrieve profiles and complete final legacy-path search in `T-038`.

## Goal
- Replace placeholder chunking, local hash embeddings, and token-only index with the agreed deterministic chunking plus OpenAI embedding plus local index pipeline.

## Non-goals
- Do not use OpenAI Vector Store as the authoritative retrieval store.
- Do not maintain simultaneous small/large active spaces for the same retrieval scope.
- Do not implement retrieve profile UI in this task.

## Scope
- Deterministic flat classified chunker.
- OpenAI Embeddings API provider integration using profile settings.
- Default `text-embedding-3-large`, economy `text-embedding-3-small`.
- Embedding version lifecycle.
- Local token/vector/metadata index build.
- Active pointer activation only after `INDEXED`.

## Acceptance Criteria
- [x] Abstract is one `abstract` chunk.
- [x] Chunk ids are stable and provenance-rich.
- [x] `EMBEDDED` creates a ready version without activation.
- [x] `INDEXED` activates only after index build and smoke retrieval.
- [x] Old hash embedding path is removed as the normal implementation.

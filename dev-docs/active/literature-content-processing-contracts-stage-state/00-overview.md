# 00 Overview

## Status
- State: done
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: hand off the canonical contract to `T-039`, then `T-033` through `T-038`.

## Goal
- Replace the current legacy content-processing contract surface with the agreed semantic chain and status model.
- Make `STALE` a first-class stage status.
- Align stage order to `CITATION_NORMALIZED -> ABSTRACT_READY -> FULLTEXT_PREPROCESSED -> KEY_CONTENT_READY -> CHUNKED -> EMBEDDED -> INDEXED`.

## Non-goals
- Do not implement extraction, chunking, embeddings, or retrieval internals in this task.
- Do not keep compatibility routes or dual naming layers.
- Do not decide final DB schema beyond identifying required migration boundaries.

## Scope
- Shared DTO/schema updates.
- Backend stage order and action code semantics.
- Desktop normalizer/action contract updates.
- OpenAPI/API index regeneration.
- Direct replacement of drifted pipeline wording where it affects public or module-facing semantics.

## Acceptance Criteria
- [x] `STALE` is part of the canonical stage status contract.
- [x] New stage order is reflected in shared contracts, backend orchestration, docs, OpenAPI, and tests.
- [x] Overview action contracts represent `process_content`, `process_to_retrievable`, `rebuild_index`, `reextract`, `retry_failed`, and `view_reason`.
- [x] Old semantic assumptions are removed rather than kept as a parallel track.

# 00 Overview

## Status
- State: planned
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: inventory existing citation/abstract extraction behavior and decide whether provenance fields need DB SSOT changes.

## Goal
- Make `CITATION_NORMALIZED` and `ABSTRACT_READY` implementation-ready as the trusted early content-processing stages.
- Ensure citation identity and abstract provenance can support fulltext preprocessing, key-content extraction, chunking, retrieval cold start, and stale propagation.

## Non-goals
- Do not use LLMs for citation identity normalization.
- Do not treat LLM-generated summaries as original paper abstracts.
- Do not enqueue content-processing from collection completion.
- Do not implement fulltext parsing, key-content extraction, chunking, embeddings, or retrieval internals in this task.

## Scope
- Deterministic citation normalization.
- Citation completeness and dedup identity checks.
- Abstract source resolution from metadata, parsed fulltext, manual input, and trusted external metadata.
- Abstract provenance, confidence, checksum, language, and source references.
- Stage status/action behavior for missing, partial, restricted, and stale abstract/citation states.
- Tests and fixtures for normalized citation and abstract readiness.

## Acceptance Criteria
- `CITATION_NORMALIZED` is produced by deterministic backend/script logic and records normalized identity outputs.
- `ABSTRACT_READY` stores a trustworthy abstract payload with provenance and source references.
- Generated summaries, if present, are marked as generated and are not used as original abstract evidence by default.
- Citation or abstract edits refresh state/action availability and stale downstream stages without auto-enqueueing a run.
- Downstream stages can consume citation and abstract artifacts through stable contracts.

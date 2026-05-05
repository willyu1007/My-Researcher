# 00 Overview

## Status
- State: done
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: consume `KEY_CONTENT_DOSSIER` from chunking/retrieval and include final cutover checks in `T-038`.

## Goal
- Replace key-content digest placeholder with a versioned semantic dossier extractor.

## Non-goals
- Do not implement chunking, embeddings, or retrieval.
- Do not treat generated summaries as original abstracts.
- Do not preserve the old single digest implementation as a parallel path.

## Scope
- `key_content.v1` schema.
- Section-level extraction and paper-level consolidation.
- Source-ref validation.
- Human edit provenance and override policy.
- Ready/partial/failed diagnostics.

## Acceptance Criteria
- [x] `KEY_CONTENT_READY` artifact contains a schema-valid semantic dossier.
- [x] Core evidence-bearing items include resolvable source refs.
- [x] `LiteratureRecord.keyContentDigest` remains a short overview only.
- [x] User edits survive reruns according to override policy.

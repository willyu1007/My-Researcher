# 02 Architecture

## Archived Architecture Summary
- Candidate pool: broad discovery inventory with provenance and lightweight duplicate signals.
- Managed corpus: promoted records imported through the literature service boundary.
- Effective corpus: managed records that completed citation, abstract, fulltext, key content, chunking, embedding, and indexing.
- Counting layer: reports candidate, managed, effective, blocked, not-started, and excluded records separately.

## Boundary Rules
- Candidate rows are not literature records.
- Promotion is the deduplication and corpus-admission boundary.
- B12 completion is the effective-corpus boundary.
- Generated execution evidence is not part of the archived task package.

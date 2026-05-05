# 00 Overview

## Status
- State: done
- Next step: monitor downstream callers for the renamed collection/content-processing API.

## Goal
- Make literature collection and literature content processing semantically distinct across backend, contracts, desktop, and docs.

## Non-goals
- No database schema migration.
- No change to the existing seven content-processing stage codes.
- No backward-compatible duplicate routes for old pipeline/import paths.

## Acceptance criteria
- [x] Collection endpoints write literature/source metadata without enqueueing content-processing runs.
- [x] Explicit content-processing run endpoints execute extraction/vectorization/indexing.
- [x] Old import/pipeline routes return 404.
- [x] Overview uses content-processing field names.
- [x] Backend/shared/desktop verification passes.

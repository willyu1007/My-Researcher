# literature-retrieval-pgvector-index-design

## Outcome

- Move literature retrieval toward a PostgreSQL-native vector retrieval design so future scaleout does not require a late disruptive migration.
- Replace the current all-active-chunks JSONB vector load pattern with a bounded retrieval path.
- Preserve the existing literature pipeline semantics:
  - active embedding versions remain the retrieval authority.
  - evidence activation gates remain enforced.
  - stale-index warnings remain visible.
  - partial visual indexes such as `LIT-0252` remain distinguishable from standard `INDEXED` completion.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-121`
- Feature: `F-000` — Inbox / Untriaged
- Milestone: `M-000` — Inbox / Triage
- Last old-contract update: `2026-06-06`

### Historical Requirement provenance

- None recorded.

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/literature-retrieval-pgvector-index-design/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

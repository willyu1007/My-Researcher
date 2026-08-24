# literature-scaleout-corpus-strategy

## Outcome

- Build a lightweight literature candidate layer for large-scale collection across:
  - RAG-aware resource allocation / adaptive retrieval-compute allocation.
  - LLM serving scheduling and resource allocation.
  - Test-time compute budgeting.
- Keep broad external discovery out of `LiteratureRecord` until B11 promotion.
- Preserve a strict counting split between candidate pool, managed corpus, and effective literature.
- Let B12 completion, not promotion alone, define effective literature.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-122`
- Feature: `F-000` — Inbox / Untriaged
- Milestone: `M-000` — Inbox / Triage
- Last old-contract update: `2026-06-19`

### Historical Requirement provenance

- None recorded.

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/literature-scaleout-corpus-strategy/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.

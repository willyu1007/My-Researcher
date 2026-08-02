# Phase 4C database scope

- Read-only target: randomized, marker-verified disposable PostgreSQL using the repository-pinned pgvector digest.
- Purpose: verify the existing Phase 4B projection search and Phase 4C current-source retrieval/fallback path.
- Schema effect: none; Phase 4C adds no migration or persisted field.
- Excluded: named-local, shared development, staging, production, backfill and repair databases.

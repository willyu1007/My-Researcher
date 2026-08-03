# Phase 4B schema diff preview

Planned additive change:

- Create one `PaperImplementationSemanticDocumentProjectionV2` table owned by PaperImplementation.
- Bind each row to one `PaperImplementationProject` with cascade deletion because the table is a rebuildable technical projection.
- Persist the Phase 4A document/source identity, canonical text/content/hash, embedding profile metadata and one fixed-dimension pgvector value.
- Enforce unique `(implementationProjectId, sourceType, sourceId)` current-document identity and add project/source/hash indexes.
- Add a half-precision HNSW expression index for the fixed 3072-dimension normalized vector; Phase 4C query code remains outside this migration.

The migration is additive. It drops or rewrites no source, workflow, trust, literature or legacy table.

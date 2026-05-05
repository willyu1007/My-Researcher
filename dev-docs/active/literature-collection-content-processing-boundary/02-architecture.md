# 02 Architecture

## Boundary model
- Collection chain owns discovery/import, dedup, source registration, and scope linking.
- Content-processing chain owns stage runs, artifacts, embeddings, token indexes, and active embedding version.
- Retrieval remains read-only over active embedding data.

## Public API
- Collection paths live under `/literature/collections/*`.
- Content-processing paths live under `/literature/:literatureId/content-processing*`.
- Old `/literature/import`, `/literature/zotero-*`, and `/literature/:literatureId/pipeline*` paths are removed.

## Persistence
- Existing Prisma models remain unchanged, including internal `LiteraturePipeline*` names.
- Existing stage codes remain canonical storage values.

## Risk controls
- Preserve route-controller-service layering.
- Do not touch Prisma schema unless required by compile errors.
- Verify old route 404 behavior explicitly.

# Project context

`docs/context/` is a curated, repository-local orientation layer. It has no checksum registry or
hidden synchronization command. Read only the documents relevant to the current task and keep a
document aligned in the same change when its owning contract changes.

## Routing

- API behavior: `api/openapi.yaml` is the maintained HTTP contract.
- Database shape: `db/schema.json` is the compact context snapshot; `prisma/schema.prisma` remains
  the implementation authority.
- Environment behavior: `env/contract.json`, `env/effective-dev.json`, and the environment notes.
- Terms: `glossary.json`.
- Cross-cutting constraints: `architecture-principles.md`.
- Literature and topic-selection flows: the relevant file under `process/`.
- Current desktop UI: `ui/current-state-alignment.md` and the surface-specific notes under `ui/`.

Source code and focused tests remain the authority for runtime details not explicitly contracted
by one of these documents.

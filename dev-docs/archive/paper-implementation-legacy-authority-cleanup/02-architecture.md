# Architecture

## Authority Boundary After Cleanup
- `PaperImplementation` is the only current authority for motive, validation cycle, WorkOrder, run evidence, claim trace, dossier readiness, and writing-entry projection.
- `PaperProject` remains the downstream paper lifecycle/delivery container.
- `TitleCard` and topic-selection remain upstream idea/package/promotion authorities.
- `research-argument` is historical archive material only and must not appear in current runtime, shared exports, Prisma SSOT, or LLM context contracts.

## Removal Scope
| Surface | Action |
|---|---|
| Shared contracts | Remove public package export and aggregate barrel exports for `research-argument`. |
| Backend runtime | Remove service, helper modules, repositories, Prisma mappers, and tests. |
| Persistence SSOT | Remove `ResearchArgument*` Prisma models and provide drop-table migration SQL. |
| Context | Remove current glossary/registry/architecture references that advertise `research-argument` as a bounded context. |
| Dev-docs | Close/archive active legacy task bundles; keep historical docs in archive only. |

## Preserved Surface
- PaperImplementation contracts and APIs, especially `PaperImplementationWritingEntryPacket`, remain current.
- Historical archived dev-docs may mention `research-argument` as history.
- PaperImplementation replay guards may continue to search for `research-argument` strings as prohibited authority inputs.

## DB Write Policy
- This task may update repo Prisma SSOT and migration files.
- This task must not run `prisma migrate dev`, `prisma migrate deploy`, `prisma db push`, or any command that writes to a live database without explicit approval.

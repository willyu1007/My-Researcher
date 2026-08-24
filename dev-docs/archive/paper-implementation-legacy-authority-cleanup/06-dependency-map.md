# Dependency Map

## Shared Package
| File | Incoming dependency | Action |
|---|---|---|
| `packages/shared/src/research-lifecycle/research-argument-*.ts` | Shared aggregate barrel, title-card schema tests, backend legacy service/repositories | Delete from current source tree. |
| `packages/shared/src/research-lifecycle/index.ts` | Consumers of `@paper-engineering-assistant/shared/research-lifecycle` | Remove research-argument re-exports and `researchArgumentWritingEntryPacketSchema`. |
| `packages/shared/package.json` | Public subpath `./research-lifecycle/research-argument-contracts` | Remove subpath export. |
| `packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts` | Direct schema coverage for legacy bridge/readiness packet | Remove legacy assertions and aggregate export expectations. |
| `packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.schema.test.ts` | Verifies both PaperImplementation and legacy writing packet schemas | Remove legacy writing-packet aggregate assertion. |

## Backend
| File group | Incoming dependency | Action |
|---|---|---|
| `apps/backend/src/research-argument/**` | Only legacy service/repository/tests | Delete. |
| `apps/backend/src/services/research-argument-service.ts` | Only legacy unit tests; no current route registration found | Delete. |
| `apps/backend/src/repositories/*research-argument*` | Only legacy service/tests/Prisma mappers | Delete. |
| `apps/backend/src/repositories/prisma/*research-argument*` | Only legacy Prisma repository/tests | Delete after Prisma schema cleanup. |

## Persistence And Context
| Surface | Incoming dependency | Action |
|---|---|---|
| `prisma/schema.prisma` `ResearchArgument*` models | Legacy Prisma repository only | Remove models from SSOT and add drop-table migration SQL. |
| `docs/context/db/schema.json` | Generated from Prisma SSOT | Regenerate via `ctl-db-ssot`. |
| `docs/context/glossary.json` | LLM terminology context | Remove current research-argument bounded-context entries and references. |
| `docs/context/architecture-principles.md` | Project-wide terminology rule | Replace research-argument as current pre-writing control plane with PaperImplementation. |
| `docs/context/registry.json` | LLM context artifact registry | Remove research-argument artifacts from current contract registry. |

## Preserved Guard
| File | Reason |
|---|---|
| `.ai/scripts/paper-implementation-v1-runnable-evidence.mjs` | Keeps a negative guard that detects forbidden research-argument authority refs in PaperImplementation replay evidence. |
| `.ai/scripts/paper-implementation-v1-runnable-replay.mjs` | Keeps T-109/T-113 replay guard for legacy authority leakage. |

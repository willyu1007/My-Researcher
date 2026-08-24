# Verification

## Planned Checks
| Command | Expected result |
|---|---|
| `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` | T-113 registered in project governance. |
| `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` | Governance metadata is consistent. |
| `pnpm --filter @paper-engineering-assistant/shared test` | Shared schema tests pass without research-argument exports. |
| `pnpm --filter @paper-engineering-assistant/backend typecheck` | Backend compiles without research-argument runtime code. |
| `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/paper-implementation-routes.integration.test.ts src/services/paper-implementation-contract-evaluation-suite.unit.test.ts` | PaperImplementation route/evaluation coverage passes. |
| `node --loader ./apps/backend/node_modules/ts-node/esm.mjs .ai/scripts/paper-implementation-v1-runnable-replay.mjs --run-id t113-legacy-cleanup` | V1 runnable replay passes with no legacy authority findings. |
| `node .ai/scripts/ctl-db-ssot.mjs sync-to-context` | DB context refreshed from Prisma SSOT. |
| `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict` | Context registry/checksums are valid. |

## Log
| Date | Command | Result | Notes |
|---|---|---|---|
| 2026-06-01 | `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` | passed | Registered T-113 and later refreshed derived project views after archiving legacy task bundles. |
| 2026-06-01 | `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` | passed | Governance metadata consistent after initial registration and legacy bundle archival. |
| 2026-06-01 | `rg -n "research-argument|ResearchArgument|research argument" apps/backend/src packages/shared/src packages/shared/package.json prisma/schema.prisma docs/context -S` | passed | Only the PaperImplementation negative guard test matches in backend source; shared exports, Prisma SSOT, and current context have no runtime/current contract matches. |
| 2026-06-01 | `pnpm --filter @paper-engineering-assistant/shared typecheck` | passed | Shared contracts compile after export removal. |
| 2026-06-01 | `pnpm --filter @paper-engineering-assistant/shared test` | passed | 206 schema tests passed. |
| 2026-06-01 | `pnpm --filter @paper-engineering-assistant/backend prisma:format` | passed | Prisma SSOT formatted after model removal. |
| 2026-06-01 | `DATABASE_URL='postgresql://user:pass@localhost:5432/my_researcher_validate' pnpm --filter @paper-engineering-assistant/backend prisma:validate` | passed | Prisma schema validates without retired models. |
| 2026-06-01 | `node .ai/scripts/ctl-db-ssot.mjs sync-to-context` | passed | DB context regenerated from Prisma SSOT. |
| 2026-06-01 | `pnpm --filter @paper-engineering-assistant/backend typecheck` | passed | Prisma client regenerated and backend TypeScript compiles without retired runtime code. |
| 2026-06-01 | `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/paper-implementation-routes.integration.test.ts src/services/paper-implementation-contract-evaluation-suite.unit.test.ts` | passed | 9 targeted PaperImplementation route/evaluation tests passed. |
| 2026-06-01 | `node --loader ./apps/backend/node_modules/ts-node/esm.mjs .ai/scripts/paper-implementation-v1-runnable-replay.mjs --run-id t113-legacy-cleanup` | passed | Replay status `passed`; artifacts under `.ai/.tmp/paper-implementation-v1-runnable-closure/t113-legacy-cleanup`. |
| 2026-06-01 | `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs touch` | passed | Updated context checksums after glossary/architecture/context refresh. |
| 2026-06-01 | `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict` | passed | Context layer verification passed. |
| 2026-06-01 | `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` | passed | Refreshed governance after marking T-113 done. |
| 2026-06-01 | `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` | passed | Final governance lint passed. |

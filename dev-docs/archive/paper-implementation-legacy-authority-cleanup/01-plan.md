# Plan

## Phase 1 - Inventory And Task Registration
- Register T-113 in project governance and map it to `M-001 > F-001 > R-013`.
- Inventory `research-argument` import sites, public exports, backend files, Prisma models, context entries, and active dev-docs tasks.
- Establish rollback point from the current working tree diff.

## Phase 2 - Public And Runtime Decommission
- Remove `research-argument` shared package export entry and aggregate barrel exports.
- Remove tests that require legacy bridge/readiness/writing-entry schemas.
- Remove backend `research-argument` service, helper modules, repositories, mappers, and tests.
- Verify shared/backend typecheck after this phase.

## Phase 3 - Persistence And Context Cleanup
- Remove `ResearchArgument*` models from `prisma/schema.prisma`.
- Add a versioned migration SQL file that drops the legacy tables if present.
- Refresh DB context via `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`.
- Update current context glossary/architecture/registry entries so `research-argument` is historical only, not a current contract.

## Phase 4 - Governance And Verification
- Archive or close active legacy `research-argument` task docs so active work cannot resume under that authority lane.
- Run targeted checks:
  - `pnpm --filter @paper-engineering-assistant/shared test`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - PaperImplementation backend targeted tests
  - `node --loader ./apps/backend/node_modules/ts-node/esm.mjs .ai/scripts/paper-implementation-v1-runnable-replay.mjs --run-id t113-legacy-cleanup`
  - governance and context lint/verify commands

## Risks And Mitigations
- Public export removal can break hidden imports. Mitigation: broad `rg` import scan and full shared/backend typecheck.
- Prisma model removal is destructive for databases that still contain legacy tables. Mitigation: create migration SQL but do not apply to a live DB without explicit DB-write approval.
- Context files can drift from schema. Mitigation: regenerate DB context and run context verification.

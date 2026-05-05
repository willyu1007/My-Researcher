# 04 Verification

## Documentation Checks
- Task package created as a child of `T-030`.
- Registered through `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`.
- Project governance lint passed; existing unrelated `T-029` acceptance-checkbox warning remains.

## Planned Verification
- Backend unit tests for deterministic citation normalization.
- Backend unit tests for citation completeness and reason codes.
- Backend unit tests for abstract source priority and provenance.
- Integration test for explicit run through `ABSTRACT_READY`.
- Integration test that collection import does not create a content-processing run.
- Integration test that metadata/abstract patch updates stale state without enqueueing.
- Shared contract/typecheck tests when DTOs or status payloads change.

## Executed Checks
- [pass] `DATABASE_URL='postgresql://user:pass@localhost:5432/my_researcher' pnpm --filter @paper-engineering-assistant/backend prisma:validate`
  - Prisma schema validates after adding citation/abstract/fulltext tables.
- [pass] `DATABASE_URL='postgresql://user:pass@localhost:5432/my_researcher' pnpm --filter @paper-engineering-assistant/backend prisma:generate`
  - Prisma client generated after SSOT update.
- [pass] `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
  - DB context contract refreshed from Prisma SSOT.
- [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Shared DTO/schema additions compile.
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Backend repository, services, routes, and tests compile.
- [pass] `node --test --loader ts-node/esm src/services/literature-flow-service.unit.test.ts`
  - Covers explicit `CITATION_NORMALIZED`/`ABSTRACT_READY`, complete profile output refs/provenance, missing abstract blocking, and no-placeholder fulltext prerequisites.
- [pass] `node --test --loader ts-node/esm src/services/literature-service.unit.test.ts`
  - Covers collection import no auto-run, collection upsert stale marking without enqueueing, citation/abstract profiles, and metadata patch marking stale without enqueueing.
- [pass] `node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts`
  - Covers explicit route run through citation/abstract/fulltext and content asset registration.
- [pass] `pnpm --filter @paper-engineering-assistant/backend test`
  - Full backend suite passed: `132` tests.
- [pass] `node .ai/scripts/ctl-openapi-quality.mjs verify --source docs/context/api/openapi.yaml`
  - OpenAPI quality check passed after route contract updates.
- [pass] `node .ai/scripts/ctl-api-index.mjs generate --touch` and `node .ai/scripts/ctl-api-index.mjs verify`
  - API index regenerated and verified.
- [pass] `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict`
  - Context layer verification passed.
- [pass] Product-path drift search for old/implicit abstract/fulltext/vectorization paths and unimplemented non-local asset source kinds.
  - Result: no matches in backend/shared/OpenAPI/desktop literature product paths.

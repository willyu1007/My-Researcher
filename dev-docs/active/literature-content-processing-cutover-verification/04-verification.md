# 04 Verification

## Documentation Checks
- Task package created as a child of `T-030`.

## Planned Verification
- `rg` checks for old semantic paths/order/placeholders.
- Backend tests.
- Backend typecheck.
- Shared typecheck/schema tests.
- Desktop typecheck/build.
- OpenAPI/API index generation check.
- Manual or automated E2E smoke test for collection -> processing -> retrieve.

## Implementation Verification
- `node .ai/scripts/ctl-openapi-quality.mjs verify --source docs/context/api/openapi.yaml --strict`
  - Result: passed.
- `node .ai/scripts/ctl-api-index.mjs generate --touch`
  - Result: passed; generated `78` endpoints.
- `node .ai/scripts/ctl-api-index.mjs verify`
  - Result: passed.
- `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict`
  - Result: passed.
- `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Result: passed.
- `pnpm --filter @paper-engineering-assistant/shared test`
  - Result: passed, `19` tests.
- `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: passed.
- `pnpm --filter @paper-engineering-assistant/backend test`
  - Result: passed, `150` tests after post-review hardening.
- `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result: passed.
- `pnpm --filter @paper-engineering-assistant/desktop build`
  - Result: passed.
- `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full --run-id t-037-content-processing-operations`
  - Result: passed, `0` errors and `0` warnings.
- `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full --run-id t-037-content-processing-operations-review`
  - Result: passed during post-review UI contract check.
- `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full --run-id t-037-content-processing-operations-review-2`
  - Result: passed after operations panel date-range and stage-slot controls were added.
- `node --check apps/backend/scripts/backfill-literature-content-processing.mjs`
  - Result: passed.

## Cutover Search Gates
- `rg -n "EXTRACT_ABSTRACT|PREPROCESS_FULLTEXT|VECTORIZE|extract_abstract|preprocess_fulltext|content_processing_actions\\?\\.vectorize|LITERATURE_CONTENT_PROCESSING_EMBEDDING_(URL|API_KEY|MODEL)|provider: ['\\\"]external['\\\"]|external embedding|Auto-generated abstract placeholder|Key content placeholder|generateFallback(Abstract|KeyContent)|local-hash-embedding-v1|backfill-embedding-version-mapping|vectorize|向量化" apps/backend/src apps/backend/scripts apps/desktop/src/renderer/literature packages/shared/src docs/context/api`
  - Result: no matches.
- `rg -n -U "\\['CITATION_NORMALIZED', 'ABSTRACT_READY', 'KEY_CONTENT_READY', 'FULLTEXT_PREPROCESSED'|\\[\\s*'CITATION_NORMALIZED',\\s*\\n\\s*'ABSTRACT_READY',\\s*\\n\\s*'KEY_CONTENT_READY',\\s*\\n\\s*'FULLTEXT_PREPROCESSED'" apps/backend/src apps/backend/scripts apps/desktop/src/renderer packages/shared/src docs/context/api`
  - Result: no matches.
- `rg -n "PrismaClient|findMany|literatureRecord|/content-processing/runs|pipeline/runs" apps/backend/scripts/backfill-literature-content-processing.mjs`
  - Result: no matches.
- `rg -n "app\\.(get|post|put|patch|delete)\\([^\\n]*pipeline|/literature/:literatureId/pipeline|/literature/\\{literatureId\\}/pipeline|pipeline/runs" apps/backend/src/routes apps/backend/src/controllers docs/context/api/openapi.yaml packages/shared/src apps/desktop/src/renderer/literature`
  - Result: only backend integration tests contain legacy `/pipeline/runs` as 404 regression assertions.

## Product Chain Evidence
- `zotero collection import does not enqueue content-processing runs`: passed in backend suite.
- `collection upsert marks processed citation profile stale without enqueueing a run`: passed in backend suite.
- `content asset registration supports explicit fulltext processing and metadata stale without auto enqueue`: passed in backend suite.
- `literature flow creates new embedding versions on rerun and switches active version after INDEXED success`: passed in backend suite.
- `retrieve applies explicit profile and returns stale provenance warnings`: passed in backend suite.
- `literature backfill operations routes dry-run create job and cleanup without old fan-out path`: passed in backend suite.

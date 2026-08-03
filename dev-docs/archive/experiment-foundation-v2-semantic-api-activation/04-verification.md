# T-135 Verification

## Governance prerequisite

- T-106 strict task-doc lint: 9/9 passed.
- T-134 strict task-doc lint: 36/36 passed.
- Project governance sync completed after both archive moves.
- Project governance lint passed with only the two unrelated pre-existing T-124/T-133-era State-format warnings.

## Planned database verification

```bash
node --env-file=.env.local node_modules/prisma/build/index.js migrate status --schema prisma/schema.prisma
node .ai/scripts/ctl-db-ssot.mjs sync-to-context
node .ai/tests/run.mjs --suite database
```

Expected: 75/75 migrations applied, generated DB context current, database suite green.

Outcome on 2026-08-03: passed. All 75 migrations are applied; ten expected tables, the HNSW index and `vector(3072)` column were verified; all new tables contain zero rows. Prisma validate, DB context refresh and the database suite passed.

## Implementation verification

```bash
pnpm --filter @paper-engineering-assistant/shared typecheck
pnpm --filter @paper-engineering-assistant/backend typecheck
node .ai/scripts/ctl-openapi-quality.mjs verify --strict
node .ai/scripts/ctl-api-index.mjs verify --strict
node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs
```

Outcome on 2026-08-03: all passed.

### Contract and runtime tests

- Shared semantic contract schemas: 4/4 passed.
- Backend semantic/gateway/cutover targeted fleet: 68 passed, 0 failed, 1 skipped.
  - The skipped relational test requires a randomized disposable database by design; it was not pointed at named-local.
  - T-134 database/repository verification had already passed against its approved disposable target, and named-local schema objects were verified after migration.
- Route regression after fixing optional empty rebuild body: 4/4 passed.
- Shared and backend TypeScript checks passed after the final changes.
- The machine default Node 26 emits a `ts-node` loader empty-diagnostic failure when tests perform loader-side typechecking. Verification therefore used a separate clean `tsc --noEmit` gate followed by `TS_NODE_TRANSPILE_ONLY=true` for runtime tests; runtime assertions all passed.

### Generated contracts

- `env-contractctl validate` and `generate`: passed; environment suite passed.
- OpenAPI strict quality: passed.
- API index generated at 205 endpoints and strict verification passed.
- LLM registry validation: 3 providers, 27 profiles, 25 prompt templates and 41 config keys; passed.
- `git diff --check`: passed.

### Named-local default-off smoke

- Exact target: PostgreSQL `127.0.0.1:5432/postgres`, schema `my_researcher_dev`.
- Rebuild without a request body returned `409 VERSION_CONFLICT` with `SEMANTIC_RETRIEVAL_V2_DISABLED`.
- Retrieval returned the same stable default-off result.
- No capability value, provider request or semantic projection write was made.
- Final `prisma migrate status`: 75 migrations; database schema is up to date.

## Phase 3 quality-remediation verification

### Runtime and relational tests

- Focused backend quality fleet: 86 total, 84 passed, 0 failed, 2 relational tests skipped until a
  disposable database was supplied. Coverage included gateway cancellation, cutover guards,
  lineage/candidate/index/retrieval/application services, explicit HTTP routes and OpenAPI path
  coverage.
- Enabled non-empty `buildApp` chain: passed. Rebuild persisted one authorized Cycle projection;
  retrieval returned one semantic result; both calls used `literature-embedding-default` through
  the injected shared gateway.
- Rebuild coordination: same-project single-flight, final-waiter cancellation, surviving-waiter
  behavior, application timeout, pre/post replacement source drift and persistent-drift failure all
  passed.
- Marker-verified randomized disposable PostgreSQL: lineage bulk snapshot 1/1 passed with a real
  branch/head Run and cross-project isolation; semantic projection/retrieval 1/1 passed. All 75
  migrations were deployed only to the temporary database, and both disposable containers were
  removed in `finally` cleanup.
- Repository database suite: passed (`database-sqlite-smoke`).
- Shared semantic schema tests: 5/5 passed, including closed timeout/drift reason validation.

### Static and generated gates

```bash
pnpm typecheck
node .ai/scripts/ctl-openapi-quality.mjs
node .ai/scripts/ctl-api-index.mjs verify --strict
node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check
```

- Full shared/backend/desktop TypeScript check: passed.
- OpenAPI quality and 205-endpoint API index freshness: passed.
- LLM registry: 3 providers, 27 profiles, 25 prompt templates and 41 config keys; passed.
- Governance lint and final whitespace validation: passed with any remaining non-blocking warnings
  recorded in command output.
